import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// JWT_SECRET is read at call-time (not at module load), so it's safe to set
// it here before importing rather than needing a real .env file in CI.
before(() => {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
});

const { signAuthToken, verifyAuthToken, expiresInToMs, setAuthCookie, clearAuthCookie, COOKIE_NAME } = await import('./jwt.js');

describe('signAuthToken / verifyAuthToken', () => {
  test('a token signed for a user verifies back to that user\'s id and role', () => {
    const token = signAuthToken({ id: 'user-1', role: 'dealer' });
    const payload = verifyAuthToken(token);
    assert.equal(payload.sub, 'user-1');
    assert.equal(payload.role, 'dealer');
  });

  test('verifying a tampered token throws rather than silently succeeding', () => {
    const token = signAuthToken({ id: 'user-1', role: 'customer' });
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'aa' ? 'bb' : 'aa');
    assert.throws(() => verifyAuthToken(tampered));
  });

  test('verifying a token signed with a different secret throws', () => {
    const token = signAuthToken({ id: 'user-1', role: 'customer' });
    const savedSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'a-completely-different-secret';
    try {
      assert.throws(() => verifyAuthToken(token));
    } finally {
      process.env.JWT_SECRET = savedSecret;
    }
  });
});

describe('expiresInToMs', () => {
  test('parses day/hour/minute/second/week/year suffixes correctly', () => {
    assert.equal(expiresInToMs('7d'), 7 * 24 * 60 * 60 * 1000);
    assert.equal(expiresInToMs('12h'), 12 * 60 * 60 * 1000);
    assert.equal(expiresInToMs('30m'), 30 * 60 * 1000);
    assert.equal(expiresInToMs('45s'), 45 * 1000);
    assert.equal(expiresInToMs('2w'), 2 * 7 * 24 * 60 * 60 * 1000);
  });

  test('a bare number is treated as seconds, matching jsonwebtoken\'s own convention', () => {
    assert.equal(expiresInToMs(3600), 3600 * 1000);
  });

  test('an unparseable value falls back to the 7-day default rather than crashing', () => {
    assert.equal(expiresInToMs('not-a-duration'), 7 * 24 * 60 * 60 * 1000);
  });

  test('no value at all also falls back to the 7-day default', () => {
    assert.equal(expiresInToMs(undefined), 7 * 24 * 60 * 60 * 1000);
  });
});

describe('cookie helpers', () => {
  test('setAuthCookie sets an httpOnly cookie under the expected name', () => {
    const calls = [];
    const res = { cookie: (name, value, opts) => calls.push({ name, value, opts }) };
    setAuthCookie(res, 'some.jwt.token');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, COOKIE_NAME);
    assert.equal(calls[0].value, 'some.jwt.token');
    assert.equal(calls[0].opts.httpOnly, true);
  });

  test('clearAuthCookie clears the cookie under the same name setAuthCookie used', () => {
    const calls = [];
    const res = { clearCookie: (name, opts) => calls.push({ name, opts }) };
    clearAuthCookie(res);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, COOKIE_NAME);
  });
});
