import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexNowPayload, queueProductUrlsForIndexNow } from './indexNow.js';

test('IndexNow payload proves ownership and contains canonical URLs', () => {
  const urls = ['https://noyontelecom.com/product/samsung-a15-display'];
  const payload = buildIndexNowPayload(urls);
  assert.equal(payload.host, 'noyontelecom.com');
  assert.match(payload.key, /^[a-z0-9-]{8,128}$/i);
  assert.equal(payload.keyLocation, `https://noyontelecom.com/${payload.key}.txt`);
  assert.deepEqual(payload.urlList, urls);
});

test('IndexNow queue is a network-free no-op outside production', () => {
  assert.doesNotThrow(() => queueProductUrlsForIndexNow([{ id: 'p1', slug: 'test-product' }]));
});
