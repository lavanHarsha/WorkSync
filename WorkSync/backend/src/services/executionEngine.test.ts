import { describe, it, expect } from 'vitest';
import { ExecutionEngine } from './executionEngine';

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
