import test from 'node:test';
import assert from 'node:assert/strict';
import { BoundedCache, cache, getOrSet, invalidateProductCache } from './cache.js';

test('bounded cache evicts least recently used values and oversized entries', () => {
  const c = new BoundedCache({ maxKeys: 2, maxBytes: 100 });
  c.set('a', 'A', 60); c.set('b', 'B', 60); c.get('a'); c.set('c', 'C', 60);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 'A');
  assert.equal(c.set('huge', 'x'.repeat(101), 60), false);
  assert.ok(c.bytes <= 100);
  c.flushAll(); assert.equal(c.bytes, 0);
});

test('freshness and outage retention expire independently', () => {
  let now = 0;
  const c = new BoundedCache({ now: () => now });
  c.set('a', { value: 1 }, 10, 20);
  now = 11000;
  assert.equal(c.get('a'), undefined);
  assert.deepEqual(c.get('a', true), { value: 1 });
  now = 31000;
  assert.equal(c.get('a', true), undefined);
  assert.equal(c.bytes, 0);
});

test('catalogue outage fallback limits retries and never survives admin invalidation', async (t) => {
  let now = 0, calls = 0;
  const oldNow = cache.now;
  cache.now = () => now;
  t.after(() => { cache.now = oldNow; invalidateProductCache(); });
  invalidateProductCache();
  await getOrSet('products:resilience', 10, async () => ({ stock: 4 }));
  now = 11000;
  const offline = async () => { calls++; throw Object.assign(new Error('Unavailable'), { code: 'P1001' }); };
  assert.deepEqual(await getOrSet('products:resilience', 10, offline), { stock: 4 });
  assert.deepEqual(await getOrSet('products:resilience', 10, offline), { stock: 4 });
  assert.equal(calls, 1);
  now += 31000;
  await getOrSet('products:resilience', 10, offline);
  assert.equal(calls, 2);
  invalidateProductCache();
  await assert.rejects(getOrSet('products:resilience', 10, offline));
});

test('checkout settings and programming errors never receive catalogue fallback', async (t) => {
  let now = 0;
  const oldNow = cache.now;
  cache.now = () => now;
  t.after(() => { cache.now = oldNow; invalidateProductCache(); });
  invalidateProductCache();
  await getOrSet('settings:deliveryFee', 10, async () => 150);
  await getOrSet('products:broken-code', 10, async () => 'old');
  now = 11000;
  await assert.rejects(getOrSet('settings:deliveryFee', 10, async () => { throw Object.assign(new Error(), { code: 'P1001' }); }));
  await assert.rejects(getOrSet('products:broken-code', 10, async () => { throw new TypeError('Bug'); }));
});

test('in-flight outage cannot resurrect data cleared by an admin edit', async (t) => {
  let now = 0, reject;
  const oldNow = cache.now;
  cache.now = () => now;
  t.after(() => { cache.now = oldNow; invalidateProductCache(); });
  invalidateProductCache();
  await getOrSet('products:in-flight', 10, async () => 'old');
  now = 11000;
  const pending = getOrSet('products:in-flight', 10, () => new Promise((_, fail) => { reject = fail; }));
  await Promise.resolve();
  invalidateProductCache();
  reject(Object.assign(new Error('Unavailable'), { code: 'P1001' }));
  await assert.rejects(pending);
  assert.equal(await getOrSet('products:in-flight', 10, async () => 'new'), 'new');
});
