import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateRawToken, hashToken } from './tokens.js';

describe('generateRawToken', () => {
  test('returns a 64-character hex string (32 random bytes)', () => {
    const token = generateRawToken();
    assert.equal(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  test('two calls never produce the same token', () => {
    assert.notEqual(generateRawToken(), generateRawToken());
  });
});

describe('hashToken', () => {
  test('hashing the same input always gives the same output (needed to look up a token by its hash)', () => {
    const raw = generateRawToken();
    assert.equal(hashToken(raw), hashToken(raw));
  });

  test('different inputs produce different hashes', () => {
    assert.notEqual(hashToken('a'), hashToken('b'));
  });

  test('the hash is a 64-character hex string (SHA-256) and never equals the raw input', () => {
    const raw = generateRawToken();
    const hash = hashToken(raw);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.notEqual(hash, raw);
  });
});
