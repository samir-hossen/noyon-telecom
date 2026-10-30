import test from 'node:test';
import assert from 'node:assert/strict';
import { createShellCache } from './shellCache.js';

test('concurrent cold requests share one load; stale pages do not wait for refresh', async () => {
  let clock = 0;
  let calls = 0;
  let complete;
  const cache = createShellCache(() => {
    calls++;
    return new Promise((resolve) => { complete = resolve; });
  }, { now: () => clock, ttlMs: 100 });
  const first = cache();
  const second = cache();
  await Promise.resolve();
  assert.equal(calls, 1);
  complete('v1');
  assert.deepEqual(await Promise.all([first, second]), ['v1', 'v1']);
  assert.equal(await cache(), 'v1');
  assert.equal(calls, 1);
  clock = 101;
  assert.equal(await cache(), 'v1');
  assert.equal(await cache(), 'v1');
  assert.equal(calls, 2);
  complete('v2');
  await new Promise(setImmediate);
  assert.equal(await cache(), 'v2');
});

test('failed refresh preserves good HTML and backs off before retrying', async () => {
  let clock = 0;
  let calls = 0;
  const errors = [];
  const cache = createShellCache(async () => {
    calls++;
    if (calls === 2) throw new Error('storefront unavailable');
    return `v${calls}`;
  }, { now: () => clock, ttlMs: 100, retryMs: 20, onError: (error) => errors.push(error.message) });
  assert.equal(await cache(), 'v1');
  clock = 101;
  assert.equal(await cache(), 'v1');
  await new Promise(setImmediate);
  assert.equal(await cache(), 'v1');
  assert.equal(calls, 2);
  assert.deepEqual(errors, ['storefront unavailable']);
  clock = 122;
  assert.equal(await cache(), 'v1');
  await new Promise(setImmediate);
  assert.equal(await cache(), 'v3');
});

test('cold failure returns no shell and retries after the backoff', async () => {
  let clock = 0;
  let calls = 0;
  const cache = createShellCache(async () => {
    if (++calls === 1) throw new Error('offline');
    return 'recovered';
  }, { now: () => clock, retryMs: 20 });
  assert.equal(await cache(), null);
  assert.equal(await cache(), null);
  assert.equal(calls, 1);
  clock = 21;
  assert.equal(await cache(), 'recovered');
});
