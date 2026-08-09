import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import speakeasy from 'speakeasy';
import { generateSecret, verifyToken } from './totp.js';

describe('generateSecret', () => {
  test('returns a secret with a base32 encoding and an otpauth:// URL for the QR code', () => {
    const secret = generateSecret('dealer@example.com');
    assert.ok(secret.base32 && secret.base32.length > 0);
    assert.match(secret.otpauth_url, /^otpauth:\/\/totp\//);
  });
});

describe('verifyToken', () => {
  test('accepts the correct current 6-digit code for a secret', () => {
    const secret = generateSecret('dealer@example.com');
    const code = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    assert.equal(verifyToken(secret.base32, code), true);
  });

  test('rejects a code that does not match the secret', () => {
    const secretA = generateSecret('a@example.com');
    const secretB = generateSecret('b@example.com');
    const codeForB = speakeasy.totp({ secret: secretB.base32, encoding: 'base32' });
    assert.equal(verifyToken(secretA.base32, codeForB), false);
  });

  test('rejects an obviously wrong 6-digit code', () => {
    const secret = generateSecret('dealer@example.com');
    const realCode = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    // Flip the code so it's guaranteed to differ from the real one.
    const wrongCode = realCode === '000000' ? '111111' : '000000';
    assert.equal(verifyToken(secret.base32, wrongCode), false);
  });
});
