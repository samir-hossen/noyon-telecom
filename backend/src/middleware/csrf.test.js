import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { issueCsrfToken, requireCsrf } from './csrf.js';

// Minimal mocks — just enough surface area for these two functions, no need
// to pull in a real Express app or supertest for pure middleware logic.
function mockReq({ cookies = {}, headers = {} } = {}) {
  return { cookies, headers };
}
function mockRes() {
  const res = { cookieCalls: [], statusCode: null, jsonBody: null };
  res.cookie = (name, value, opts) => { res.cookieCalls.push({ name, value, opts }); };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.jsonBody = body; return res; };
  return res;
}

describe('issueCsrfToken', () => {
  test('generates and sets a new token when the request has none yet', () => {
    const req = mockReq();
    const res = mockRes();
    const token = issueCsrfToken(req, res);
    assert.equal(token.length, 64);
    assert.equal(res.cookieCalls.length, 1);
    assert.equal(res.cookieCalls[0].value, token);
  });

  test('reuses the existing cookie token instead of issuing a new one', () => {
    const req = mockReq({ cookies: { csrf_token: 'existing-token-value' } });
    const res = mockRes();
    const token = issueCsrfToken(req, res);
    assert.equal(token, 'existing-token-value');
    assert.equal(res.cookieCalls.length, 0); // nothing re-set, since it already existed
  });
});

describe('requireCsrf', () => {
  test('allows the request through when the cookie and header tokens match', () => {
    const req = mockReq({ cookies: { csrf_token: 'abc123' }, headers: { 'x-csrf-token': 'abc123' } });
    const res = mockRes();
    let nextCalled = false;
    requireCsrf(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  });

  test('rejects with 403 when the header token is missing', () => {
    const req = mockReq({ cookies: { csrf_token: 'abc123' }, headers: {} });
    const res = mockRes();
    let nextCalled = false;
    requireCsrf(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  test('rejects with 403 when the cookie and header tokens mismatch (e.g. a forged cross-site request)', () => {
    const req = mockReq({ cookies: { csrf_token: 'abc123' }, headers: { 'x-csrf-token': 'someone-elses-token' } });
    const res = mockRes();
    let nextCalled = false;
    requireCsrf(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  test('rejects with 403 when there is no cookie at all', () => {
    const req = mockReq({ cookies: {}, headers: { 'x-csrf-token': 'abc123' } });
    const res = mockRes();
    let nextCalled = false;
    requireCsrf(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
});
