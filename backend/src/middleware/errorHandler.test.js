import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from './errorHandler.js';

// Minimal fake Express req/res/next — just enough to observe the response.
function fakeReqRes() {
  const req = { path: '/test', method: 'GET' };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return { req, res };
}

test('errorHandler', async (t) => {
  await t.test('P2025 (not found) -> 404', () => {
    const { req, res } = fakeReqRes();
    errorHandler({ code: 'P2025' }, req, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, 'Resource not found');
  });

  await t.test('P2002 (unique constraint) -> 409', () => {
    const { req, res } = fakeReqRes();
    errorHandler({ code: 'P2002' }, req, res, () => {});
    assert.equal(res.statusCode, 409);
  });

  await t.test('P2003 (foreign key constraint) -> 409', () => {
    const { req, res } = fakeReqRes();
    errorHandler({ code: 'P2003' }, req, res, () => {});
    assert.equal(res.statusCode, 409);
  });

  await t.test('P2034 (Serializable transaction conflict, e.g. a checkout race) -> 409, clean retryable message', () => {
    const { req, res } = fakeReqRes();
    errorHandler({ code: 'P2034' }, req, res, () => {});
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, 'This request conflicted with another one. Please try again.');
  });

  await t.test('MulterError -> 400 with the original message', () => {
    const { req, res } = fakeReqRes();
    errorHandler({ name: 'MulterError', message: 'File too large' }, req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'File too large');
  });

  await t.test('an HttpError-style error with an explicit status uses that status and message', () => {
    const { req, res } = fakeReqRes();
    errorHandler({ status: 403, message: 'Forbidden, nicely explained' }, req, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden, nicely explained');
  });

  await t.test('an unrecognized error never leaks its raw message — generic 500 only', () => {
    const { req, res } = fakeReqRes();
    errorHandler(new Error('connection refused at 10.0.0.5:5432, password auth failed'), req, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'Something went wrong. Please try again.');
  });
});
