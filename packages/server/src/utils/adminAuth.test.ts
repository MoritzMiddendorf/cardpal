import { describe, it, expect } from 'vitest';
import { isAdminRequest } from './adminAuth.js';

describe('isAdminRequest', () => {
  describe('with ADMIN_SECRET configured', () => {
    it('accepts the correct bearer secret from anywhere', () => {
      expect(isAdminRequest('s3cret', 'Bearer s3cret', '203.0.113.7')).toBe(true);
    });

    it('rejects a wrong or missing secret, even from localhost', () => {
      expect(isAdminRequest('s3cret', 'Bearer nope', '127.0.0.1')).toBe(false);
      expect(isAdminRequest('s3cret', undefined, '127.0.0.1')).toBe(false);
      expect(isAdminRequest('s3cret', 's3cret', '127.0.0.1')).toBe(false);
    });
  });

  describe('without ADMIN_SECRET', () => {
    it('allows loopback requests only', () => {
      expect(isAdminRequest(null, undefined, '127.0.0.1')).toBe(true);
      expect(isAdminRequest(null, undefined, '::1')).toBe(true);
      expect(isAdminRequest(null, undefined, '::ffff:127.0.0.1')).toBe(true);
      expect(isAdminRequest(null, undefined, '203.0.113.7')).toBe(false);
      expect(isAdminRequest(null, undefined, undefined)).toBe(false);
    });
  });
});
