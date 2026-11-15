import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexNowPayload, createIndexNowQueue } from './indexNow.js';

const product = (id) => ({ id: String(id), slug: `part-${id}` });
const productUrl = (id) => `https://noyontelecom.com/product/part-${id}`;

function harness(fetchImpl = async () => ({ ok: true, status: 200 })) {
  const timers = [];
  const requests = [];
  const errors = [];
  const queue = createIndexNowQueue({
    enabled: () => true,
    schedule(callback, delay) {
      timers.push({ callback, delay });
      return { unref() {} };
    },
    logError: (...args) => errors.push(args),
    async fetchImpl(url, init) {
      const payload = JSON.parse(init.body);
      requests.push({ url, payload });
      return fetchImpl(url, init);
    },
  });
  return { queue, timers, requests, errors, run: () => timers.shift().callback() };
}

test('IndexNow payload proves ownership and contains canonical URLs', () => {
  const urls = ['https://noyontelecom.com/product/samsung-a15-display'];
  const payload = buildIndexNowPayload(urls);
  assert.equal(payload.host, 'noyontelecom.com');
  assert.match(payload.key, /^[a-z0-9-]{8,128}$/i);
  assert.equal(payload.keyLocation, `https://noyontelecom.com/${payload.key}.txt`);
  assert.deepEqual(payload.urlList, urls);
});

test('IndexNow queue is a network-free no-op outside production', () => {
  let scheduled = false;
  const queue = createIndexNowQueue({ enabled: () => false, schedule: () => { scheduled = true; } });
  queue([product(1)]);
  assert.equal(scheduled, false);
});

test('only same-host canonical product URLs enter the notification payload', () => {
  const urls = [
    productUrl(1), productUrl(1), 'http://noyontelecom.com/product/part-1',
    'https://other.example/product/part-1', 'https://noyontelecom.com/product/part-1?email=private',
    'https://noyontelecom.com/product/part-1#review', 'https://noyontelecom.com/admin',
    'https://noyontelecom.com/product/../contact', 'https://user:secret@noyontelecom.com/product/part-1',
    'not a URL', null,
  ];
  assert.deepEqual(buildIndexNowPayload(urls).urlList, [productUrl(1)]);
});

test('duplicates coalesce and a >10k import drains all batches automatically', async () => {
  const h = harness();
  h.queue(Array.from({ length: 10_001 }, (_, id) => product(id)));
  h.queue([product(0)]);
  assert.equal(h.timers.length, 1);
  assert.equal(h.requests.length, 0);
  await h.run();
  assert.equal(h.requests[0].payload.urlList.length, 10_000);
  assert.equal(h.timers.length, 1);
  await h.run();
  assert.deepEqual(h.requests[1].payload.urlList, [productUrl(10_000)]);
  assert.equal(h.timers.length, 0);
});

test('edits during an in-flight notification are sent later without concurrent requests', async () => {
  let finish;
  const h = harness(() => new Promise((resolve) => { finish = resolve; }));
  h.queue([product(1)]);
  const first = h.run();
  h.queue([product(1), product(2)]);
  assert.equal(h.requests.length, 1);
  assert.equal(h.timers.length, 0);
  finish({ ok: true, status: 202 });
  await first;
  assert.equal(h.timers.length, 1);
  const second = h.run();
  assert.deepEqual(h.requests[1].payload.urlList, [productUrl(1), productUrl(2)]);
  finish({ ok: true, status: 200 });
  await second;
  assert.equal(h.timers.length, 0);
});

test('rate-limited batches retry once after Retry-After and new edits cannot bypass backoff', async () => {
  const h = harness(async () => ({ ok: false, status: 429, headers: new Headers({ 'retry-after': '120' }) }));
  h.queue([product(1)]);
  await h.run();
  assert.equal(h.timers[0].delay, 120_000);
  h.queue([product(1)]);
  assert.equal(h.timers.length, 1);
  await h.run();
  assert.equal(h.requests.length, 2);
  assert.equal(h.timers.length, 0);
});

test('network failure retries once and permanent HTTP errors do not loop', async () => {
  const h = harness(async () => { throw new Error('network unavailable'); });
  h.queue([product(1)]);
  await h.run();
  assert.equal(h.timers[0].delay, 60_000);
  await h.run();
  assert.equal(h.timers.length, 0);
  const rejected = harness(async () => ({ ok: false, status: 422 }));
  rejected.queue([product(1)]);
  await rejected.run();
  assert.equal(rejected.timers.length, 0);
});

test('queue stays bounded during large imports and retains the latest changed URLs', async () => {
  const h = harness();
  h.queue(Array.from({ length: 20_005 }, (_, id) => product(id)));
  await h.run();
  await h.run();
  const submitted = h.requests.flatMap(({ payload }) => payload.urlList);
  assert.equal(submitted.length, 20_000);
  assert.equal(submitted[0], productUrl(5));
  assert.equal(submitted.at(-1), productUrl(20_004));
  assert.equal(h.errors.length, 1);
  assert.equal(h.timers.length, 0);
});

test('unpublish/delete notifications remain possible and malformed paths are ignored', async () => {
  const h = harness();
  h.queue([
    { ...product(1), published: false },
    { id: 'bad-query', slug: 'part?email=private' },
    { id: 'bad-path', slug: '../admin' },
    { id: 'bad-fragment', slug: 'part#private' },
    null,
  ]);
  await h.run();
  assert.deepEqual(h.requests[0].payload.urlList, [productUrl(1)]);
});
