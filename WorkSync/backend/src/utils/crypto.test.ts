import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  encrypt,
  decrypt,
  sha256,
  safeEqual,
  hmacSha256Hex,
} from './crypto';

describe('Crypto Utilities', () => {
  const testKeyHex = crypto.randomBytes(32).toString('hex');

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testKeyHex;
  });

  describe('AES-256-GCM encryption & decryption', () => {
    it('encrypts and decrypts a plaintext payload roundtrip', () => {
      const secretData = JSON.stringify({
        token: 'ghp_secret_access_token_12345',
        refreshToken: 'rt_refresh_token_67890',
      });

      const encrypted = encrypt(secretData);
      expect(encrypted).not.toBe(secretData);
      expect(encrypted.startsWith('v1:')).toBe(true);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(secretData);
      expect(JSON.parse(decrypted)).toEqual({
        token: 'ghp_secret_access_token_12345',
        refreshToken: 'rt_refresh_token_67890',
      });
    });

    it('rejects tampered ciphertexts', () => {
      const plaintext = 'Sensitive information';
      const encrypted = encrypt(plaintext);

      // Corrupt the ciphertext part
      const parts = encrypted.split(':');
      const corruptedCipher = parts[3].slice(0, -4) + 'AAAA';
      const tampered = [parts[0], parts[1], parts[2], corruptedCipher].join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('rejects malformed payloads', () => {
      expect(() => decrypt('not-a-valid-payload')).toThrow();
      expect(() => decrypt('v2:iv:tag:cipher')).toThrow();
    });
  });

  describe('sha256 hashing', () => {
    it('generates consistent sha256 hex digest', () => {
      const hash1 = sha256('test-string');
      const hash2 = sha256('test-string');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('safeEqual', () => {
    it('returns true for identical strings and false for differences', () => {
      expect(safeEqual('abc', 'abc')).toBe(true);
      expect(safeEqual('abc', 'abd')).toBe(false);
      expect(safeEqual('abc', 'ab')).toBe(false);
    });
  });

  describe('hmacSha256Hex', () => {
    it('generates valid HMAC signature', () => {
      const secret = 'whsec_testsecret123';
      const payload = '{"event":"user.created"}';
      const signature = hmacSha256Hex(secret, payload);

      expect(signature).toHaveLength(64);
      expect(safeEqual(signature, hmacSha256Hex(secret, payload))).toBe(true);
      expect(safeEqual(signature, hmacSha256Hex('wrong_secret', payload))).toBe(false);
    });
  });
});
