import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrSet, invalidateProductCache } from './cache.js';
test('cold requests share one query, but invalidation cannot repopulate stale data', async () => {
  invalidateProductCache();
  let finish, calls = 0;
  const fetch = () => { calls++; return new Promise((resolve) => { finish = resolve; }); };
  const a = getOrSet('same', 60, fetch), b = getOrSet('same', 60, fetch);
  await Promise.resolve();
  assert.equal(calls, 1);
  invalidateProductCache();
  assert.equal(await getOrSet('same', 60, async () => 'fresh'), 'fresh');
  finish('old');
  assert.deepEqual(await Promise.all([a, b]), ['old', 'old']);
  assert.equal(await getOrSet('same', 60, async () => 'wrong'), 'fresh');
});
test('failed query does not poison subsequent requests', async () => {
  await assert.rejects(getOrSet('failure', 60, async () => { throw new Error('offline'); }));
  assert.equal(await getOrSet('failure', 60, async () => 'recovered'), 'recovered');
});
