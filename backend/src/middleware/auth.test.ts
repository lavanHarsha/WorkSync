import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from './auth';
import { Response, NextFunction } from 'express';

describe('Auth Middleware - authenticate', () => {
  const secret = 'test-jwt-secret-key-for-unit-tests';

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  const createMockReqRes = (authHeader?: string) => {
    const req = {
      headers: {
        authorization: authHeader,
      },
      user: undefined,
    } as unknown as AuthRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    return { req, res, next };
  };

  it('rejects requests missing an authorization header with 401', () => {
    const { req, res, next } = createMockReqRes(undefined);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Authorization token required',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization headers not starting with Bearer', () => {
    const { req, res, next } = createMockReqRes('Basic dXNlcjpwYXNz');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Authorization token required',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid or tampered tokens with 401', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid.token.payload');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid or expired authentication token',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired tokens with 401', () => {
    const expiredToken = jwt.sign(
      { id: 'usr_123', email: 'user@worksync.io', name: 'User' },
      secret,
      { expiresIn: '-1s' }
    );

    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid or expired authentication token',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('authenticates valid tokens and sets req.user', () => {
    const payload = { id: 'usr_789', email: 'dev@worksync.io', name: 'Dev User' };
    const validToken = jwt.sign(payload, secret, { expiresIn: '15m' });

    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);

    authenticate(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe(payload.id);
    expect(req.user?.email).toBe(payload.email);
    expect(req.user?.name).toBe(payload.name);
  });
});
