import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrSet, invalidateProductCache, cache } from './cache.js';

// All tests share the one module-level `cache` instance (same as every
// route that imports this file), so each test uses its own unique key
// prefix rather than relying on test order/isolation.
let keyCounter = 0;
function uniqueKey() {
  keyCounter += 1;
  return `test:${keyCounter}`;
}

test('getOrSet', async (t) => {
  await t.test('a miss calls fetchFn and returns its result', async () => {
    const key = uniqueKey();
    let calls = 0;
    const result = await getOrSet(key, 60, async () => {
      calls += 1;
      return { value: 'fresh' };
    });
    assert.deepEqual(result, { value: 'fresh' });
    assert.equal(calls, 1);
  });

  await t.test('a hit within the TTL returns the cached value without calling fetchFn again', async () => {
    const key = uniqueKey();
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return { value: calls }; // would differ each call if fetchFn actually ran again
    };
    const first = await getOrSet(key, 60, fetchFn);
    const second = await getOrSet(key, 60, fetchFn);
    assert.equal(calls, 1, 'fetchFn should only run once');
    assert.deepEqual(second, first);
  });

  await t.test('different keys are cached independently', async () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    const a = await getOrSet(keyA, 60, async () => 'A');
    const b = await getOrSet(keyB, 60, async () => 'B');
    assert.equal(a, 'A');
    assert.equal(b, 'B');
  });

  await t.test('a value expires after its TTL and fetchFn runs again', async () => {
    const key = uniqueKey();
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return calls;
    };
    // node-cache's TTL granularity is in whole seconds; 1s is the shortest
    // value that reliably expires without flaking, so this test sleeps
    // past it rather than using an unrealistically short TTL.
    await getOrSet(key, 1, fetchFn);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await getOrSet(key, 1, fetchFn);
    assert.equal(calls, 2, 'fetchFn should run again once the TTL has passed');
  });

  await t.test('a falsy-but-defined result (0, "", false) is still served from cache, not re-fetched', async () => {
    // Guards against a naive `if (!cached)` cache-hit check, which would
    // incorrectly treat a legitimately cached 0/""/false as a miss.
    const key = uniqueKey();
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return 0;
    };
    const first = await getOrSet(key, 60, fetchFn);
    const second = await getOrSet(key, 60, fetchFn);
    assert.equal(first, 0);
    assert.equal(second, 0);
    assert.equal(calls, 1);
  });
});

test('invalidateProductCache', async (t) => {
  await t.test('clears every cached key, so the next getOrSet call re-runs fetchFn', async () => {
    const key = uniqueKey();
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return calls;
    };
    await getOrSet(key, 60, fetchFn);
    invalidateProductCache();
    await getOrSet(key, 60, fetchFn);
    assert.equal(calls, 2, 'fetchFn should run again after an invalidation, even well within the original TTL');
  });

  await t.test('is safe to call when the cache is already empty', () => {
    cache.flushAll();
    assert.doesNotThrow(() => invalidateProductCache());
  });
});
