import test from 'node:test';
import assert from 'node:assert/strict';
import { viewIdentity, recordProductView } from './productViews.js';
import { buildProductOrderBy } from './productQuery.js';

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
