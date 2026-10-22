import { describe, it, expect, vi } from 'vitest';
import { ExecutionEngine } from './executionEngine';
import { IntegrationError } from '../integrations/errors';
import { Execution } from '../models/Execution';
import { Workflow } from '../models/Workflow';

describe('ExecutionEngine - Condition Evaluator', () => {
  it('should pass when no conditions are defined', () => {
    const result = ExecutionEngine.evaluateConditions(undefined, { subject: 'Test' });
    expect(result.passed).toBe(true);

    const emptyResult = ExecutionEngine.evaluateConditions([], { subject: 'Test' });
    expect(emptyResult.passed).toBe(true);
  });

  describe('equals operator', () => {
    it('evaluates equality case-insensitively', () => {
      const conditions = [{ field: 'trigger.status', operator: 'equals', value: 'ACTIVE' }];
      const pass = ExecutionEngine.evaluateConditions(conditions, { status: 'active' });
      expect(pass.passed).toBe(true);

      const fail = ExecutionEngine.evaluateConditions(conditions, { status: 'inactive' });
      expect(fail.passed).toBe(false);
      expect(fail.reason).toContain('does not equal');
    });
  });

  describe('contains operator', () => {
    it('evaluates substring containment case-insensitively', () => {
      const conditions = [{ field: 'trigger.subject', operator: 'contains', value: 'urgent' }];
      const pass = ExecutionEngine.evaluateConditions(conditions, { subject: 'URGENT: Server Down' });
      expect(pass.passed).toBe(true);

      const fail = ExecutionEngine.evaluateConditions(conditions, { subject: 'Weekly Newsletter' });
      expect(fail.passed).toBe(false);
      expect(fail.reason).toContain('does not contain');
    });
  });

  describe('not_contains operator', () => {
    it('evaluates negative substring containment', () => {
      const conditions = [{ field: 'trigger.subject', operator: 'not_contains', value: 'spam' }];
      const pass = ExecutionEngine.evaluateConditions(conditions, { subject: 'Legitimate Request' });
      expect(pass.passed).toBe(true);

      const fail = ExecutionEngine.evaluateConditions(conditions, { subject: 'Spam alert' });
      expect(fail.passed).toBe(false);
      expect(fail.reason).toContain('contains');
    });
  });

  describe('numeric comparisons (greater_than, less_than)', () => {
    it('evaluates greater_than correctly', () => {
      const conditions = [{ field: 'trigger.amount', operator: 'greater_than', value: '100' }];
      expect(ExecutionEngine.evaluateConditions(conditions, { amount: 150 }).passed).toBe(true);
      expect(ExecutionEngine.evaluateConditions(conditions, { amount: 100 }).passed).toBe(false);
      expect(ExecutionEngine.evaluateConditions(conditions, { amount: 50 }).passed).toBe(false);
    });

    it('evaluates less_than correctly', () => {
      const conditions = [{ field: 'trigger.priority', operator: 'less_than', value: '3' }];
      expect(ExecutionEngine.evaluateConditions(conditions, { priority: 2 }).passed).toBe(true);
      expect(ExecutionEngine.evaluateConditions(conditions, { priority: 3 }).passed).toBe(false);
      expect(ExecutionEngine.evaluateConditions(conditions, { priority: 5 }).passed).toBe(false);
    });
  });

  describe('exists operator', () => {
    it('checks if a field exists and is non-empty', () => {
      const conditions = [{ field: 'trigger.sender', operator: 'exists' }];
      expect(ExecutionEngine.evaluateConditions(conditions, { sender: 'alice@domain.com' }).passed).toBe(true);
      expect(ExecutionEngine.evaluateConditions(conditions, { sender: '' }).passed).toBe(false);
      expect(ExecutionEngine.evaluateConditions(conditions, {}).passed).toBe(false);
    });
  });

  describe('nested field extraction', () => {
    it('extracts deeply nested properties from triggerData', () => {
      const conditions = [{ field: 'trigger.payload.user.email', operator: 'equals', value: 'lead@worksync.io' }];
      const triggerData = {
        payload: {
          user: {
            email: 'lead@worksync.io',
          },
        },
      };
      expect(ExecutionEngine.evaluateConditions(conditions, triggerData).passed).toBe(true);
    });

    it('handles missing intermediate keys safely without crashing', () => {
      const conditions = [{ field: 'trigger.nested.nonexistent.field', operator: 'equals', value: 'foo' }];
      const result = ExecutionEngine.evaluateConditions(conditions, {});
      expect(result.passed).toBe(false);
    });
  });
});

describe('ExecutionEngine - Variable Interpolation', () => {
  it('replaces simple string variables', () => {
    const template = 'Hello, {{trigger.name}}!';
    const data = { name: 'Alex' };
    const result = ExecutionEngine.interpolateVariables(template, data);
    expect(result).toBe('Hello, Alex!');
  });

  it('handles spaces inside interpolation braces', () => {
    const template = 'Amount: {{  trigger.amount   }} USD';
    const data = { amount: 250 };
    const result = ExecutionEngine.interpolateVariables(template, data);
    expect(result).toBe('Amount: 250 USD');
  });

  it('replaces nested object properties', () => {
    const template = 'Customer: {{trigger.customer.name}} ({{trigger.customer.company}})';
    const data = {
      customer: {
        name: 'Sarah Connor',
        company: 'Cyberdyne Systems',
      },
    };
    const result = ExecutionEngine.interpolateVariables(template, data);
    expect(result).toBe('Customer: Sarah Connor (Cyberdyne Systems)');
  });

  it('interpolates nested data structures (objects and arrays)', () => {
    const template = {
      title: 'Alert: {{trigger.subject}}',
      recipients: ['admin@company.com', '{{trigger.sender}}'],
      meta: {
        id: '{{trigger.id}}',
        staticField: 42,
      },
    };
    const data = {
      subject: 'Disk space warning',
      sender: 'bot@monitor.io',
      id: 'evt_99182',
    };
    const result = ExecutionEngine.interpolateVariables(template, data);
    expect(result).toEqual({
      title: 'Alert: Disk space warning',
      recipients: ['admin@company.com', 'bot@monitor.io'],
      meta: {
        id: 'evt_99182',
        staticField: 42,
      },
    });
  });

  it('leaves unresolvable template tags intact', () => {
    const template = 'Status: {{trigger.missingField}}';
    const result = ExecutionEngine.interpolateVariables(template, {});
    expect(result).toBe('Status: {{trigger.missingField}}');
  });

  it('preserves non-string primitives', () => {
    expect(ExecutionEngine.interpolateVariables(1234, {})).toBe(1234);
    expect(ExecutionEngine.interpolateVariables(true, {})).toBe(true);
    expect(ExecutionEngine.interpolateVariables(null, {})).toBe(null);
  });
});

describe('ExecutionEngine - Error Handling & Rethrowing', () => {
  it('writes failed Execution record and rethrows typed IntegrationError with retryable: false', async () => {
    const mockWorkflow: any = {
      _id: 'wf_123',
      userId: 'user_123',
      name: 'Test Workflow',
      trigger: { app: 'webhook', event: 'incoming', parameters: {} },
      action: { app: 'slack', action: 'send_message', parameters: {} },
      conditions: [],
    };

    const integrationErr = new IntegrationError('slack', 'AUTH_FAILED', 'Invalid token', {
      retryable: false,
      statusCode: 401,
    });

    vi.spyOn(ExecutionEngine, 'executeActionMock').mockRejectedValueOnce(integrationErr);
    const createSpy = vi.spyOn(Execution, 'create').mockResolvedValueOnce({
      _id: 'exec_failed_1',
      status: 'failed',
    } as any);
    const updateSpy = vi.spyOn(Workflow, 'findByIdAndUpdate').mockResolvedValueOnce({} as any);

    let thrownError: any;
    try {
      await ExecutionEngine.executeWorkflow(mockWorkflow, 'user_123');
    } catch (err) {
      thrownError = err;
    }

    // Must rethrow original IntegrationError with retryable: false preserved
    expect(thrownError).toBe(integrationErr);
    expect(thrownError).toBeInstanceOf(IntegrationError);
    expect(thrownError.retryable).toBe(false);
    expect(thrownError.statusCode).toBe(401);

    // Must still write failed Execution record and update workflow metrics
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf_123',
        status: 'failed',
        error: 'Invalid token',
      })
    );
    expect(updateSpy).toHaveBeenCalledWith(
      'wf_123',
      expect.objectContaining({
        $inc: { executionCount: 1 },
      })
    );
  });

  it('rethrows retryable IntegrationError (retryable: true) for transient errors', async () => {
    const mockWorkflow: any = {
      _id: 'wf_456',
      userId: 'user_456',
      name: 'Test Retryable',
      trigger: { app: 'webhook', event: 'incoming', parameters: {} },
      action: { app: 'discord', action: 'send_message', parameters: {} },
      conditions: [],
    };

    const retryableErr = new IntegrationError('discord', 'RATE_LIMITED', 'Rate limit exceeded', {
      retryable: true,
      statusCode: 429,
      retryAfterMs: 5000,
    });

    vi.spyOn(ExecutionEngine, 'executeActionMock').mockRejectedValueOnce(retryableErr);
    vi.spyOn(Execution, 'create').mockResolvedValueOnce({
      _id: 'exec_failed_2',
      status: 'failed',
    } as any);
    vi.spyOn(Workflow, 'findByIdAndUpdate').mockResolvedValueOnce({} as any);

    let thrownError: any;
    try {
      await ExecutionEngine.executeWorkflow(mockWorkflow, 'user_456');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBe(retryableErr);
    expect(thrownError.retryable).toBe(true);
    expect(thrownError.statusCode).toBe(429);
  });
});
