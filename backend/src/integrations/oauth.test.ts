import { describe, it, expect } from 'vitest';
import { sanitizeReturnTo, createState, verifyState } from './oauth';

describe('OAuth Utilities - sanitizeReturnTo', () => {
  it('allows localhost and loopback with various ports', () => {
    expect(sanitizeReturnTo('http://localhost:5173')).toBe('http://localhost:5173');
    expect(sanitizeReturnTo('http://localhost:3000/some/path')).toBe('http://localhost:3000');
    expect(sanitizeReturnTo('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
  });

  it('allows vercel.app domains and subdomains', () => {
    expect(sanitizeReturnTo('https://work-sync-six.vercel.app')).toBe('https://work-sync-six.vercel.app');
    expect(sanitizeReturnTo('https://work-sync-six.vercel.app/apps')).toBe('https://work-sync-six.vercel.app');
    expect(sanitizeReturnTo('https://worksync.vercel.app')).toBe('https://worksync.vercel.app');
    expect(sanitizeReturnTo('https://preview-123.vercel.app/test')).toBe('https://preview-123.vercel.app');
  });

  it('rejects malicious external domains (prevents open redirects)', () => {
    expect(sanitizeReturnTo('https://evil-phishing.com')).toBeNull();
    expect(sanitizeReturnTo('https://attacker.vercel.app.attacker.com')).toBeNull();
    expect(sanitizeReturnTo('javascript:alert(1)')).toBeNull();
    expect(sanitizeReturnTo('')).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
  });
});

describe('OAuth State - createState & verifyState', () => {
  it('creates and verifies valid OAuth state with returnTo', () => {
    const { state, nonce } = createState('user_123', 'google_sheets', 'https://work-sync-six.vercel.app');
    expect(typeof state).toBe('string');
    expect(typeof nonce).toBe('string');

    const result = verifyState(state, 'google_sheets', nonce);
    expect(result.userId).toBe('user_123');
    expect(result.returnTo).toBe('https://work-sync-six.vercel.app');
  });

  it('rejects state when appId does not match', () => {
    const { state, nonce } = createState('user_123', 'google_sheets');
    expect(() => verifyState(state, 'gmail', nonce)).toThrow(/mismatch/i);
  });

  it('rejects tampered state signature', () => {
    const { state, nonce } = createState('user_123', 'google_sheets');
    const tamperedState = state.slice(0, -5) + 'xxxxx';
    expect(() => verifyState(tamperedState, 'google_sheets', nonce)).toThrow(/invalid or expired/i);
  });
});
