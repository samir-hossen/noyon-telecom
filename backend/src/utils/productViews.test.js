import test from 'node:test';
import assert from 'node:assert/strict';
import { viewIdentity, recordProductView } from './productViews.js';
import { buildProductOrderBy } from './productQuery.js';
import { invalidateProductCache } from './cache.js';

const req = { ip: '192.0.2.1', headers: { 'user-agent': 'Mozilla/5.0 Chrome' }, params: { id: 'p1' } };
test('daily anonymous keys deduplicate reloads and rotate without storing IP', () => {
  const a = viewIdentity(req, new Date('2026-10-30'), 'test');
  assert.deepEqual(a, viewIdentity(req, new Date('2026-10-30T10:00:00Z'), 'test'));
  assert.notEqual(a.visitorKey, viewIdentity(req, new Date('2026-10-31'), 'test').visitorKey);
  assert.match(a.visitorKey, /^[a-f0-9]{64}$/);
});
test('admin, bots and unconfigured tracking do not count', async () => {
  assert.equal(viewIdentity({ ...req, user: { role: 'admin' } }, undefined, 'test'), null);
  assert.equal(viewIdentity({ ...req, headers: { 'user-agent': 'Google-InspectionTool' } }, undefined, 'test'), null);
  assert.equal(viewIdentity(req, undefined, ''), null);
  await recordProductView({}, { ...req, user: { role: 'admin' } });
});
test('popularity sort is stable; newest remains available; admin default is unchanged', () => {
  assert.deepEqual(buildProductOrderBy('popular')[0], { viewCount: 'desc' });
  assert.deepEqual(buildProductOrderBy('popular').at(-1), { id: 'asc' });
  assert.deepEqual(buildProductOrderBy('newest')[0], { createdAt: 'desc' });
  assert.deepEqual(buildProductOrderBy('')[0], { readyToSell: 'desc' });
});

test('repeat and concurrent views share work; a failed count remains retryable', async (t) => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'view-test-secret';
  invalidateProductCache();
  t.after(() => {
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
    invalidateProductCache();
  });
  let reads = 0, writes = 0;
  let fail = true;
  const db = {
    product: { findFirst: async () => { reads++; return { id: 'p1' }; } },
    $executeRaw: async () => { writes++; if (fail) throw new Error('temporary outage'); },
    productView: { deleteMany: async () => {} },
  };
  await assert.rejects(recordProductView(db, req), /temporary outage/);
  fail = false;
  await Promise.all([recordProductView(db, req), recordProductView(db, req)]);
  await recordProductView(db, req);
  assert.equal(reads, 2);
  assert.equal(writes, 2);
});
