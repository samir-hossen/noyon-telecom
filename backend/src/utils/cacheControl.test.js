import test from 'node:test';
import assert from 'node:assert/strict';
import { setProductCacheControl } from './cacheControl.js';

// Minimal fake Express `res` — just enough to observe what headers were set.
function fakeRes() {
  const headers = {};
  return { headers, set: (k, v) => { headers[k] = v; } };
}

test('setProductCacheControl', async (t) => {
  await t.test('guest (no req.user) gets a short public cache', () => {
    const res = fakeRes();
    setProductCacheControl({ user: null }, res);
    assert.equal(res.headers['Cache-Control'], 'public, max-age=30');
  });

  await t.test('signed-in customer gets no-store — never cached, even though customers see no dealer pricing', () => {
    const res = fakeRes();
    setProductCacheControl({ user: { role: 'customer' } }, res);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });

  await t.test('approved dealer (whose response contains their personal discounted price) gets no-store', () => {
    const res = fakeRes();
    setProductCacheControl({ user: { role: 'dealer', dealerStatus: 'approved', dealerDiscountPercent: 15 } }, res);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });

  await t.test('admin (e.g. previewing a draft product) gets no-store', () => {
    const res = fakeRes();
    setProductCacheControl({ user: { role: 'admin' } }, res);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });

  await t.test('every case sets Vary: Cookie, so a login transition is never served a stale cached response', () => {
    for (const user of [null, { role: 'customer' }, { role: 'dealer' }]) {
      const res = fakeRes();
      setProductCacheControl({ user }, res);
      assert.equal(res.headers['Vary'], 'Cookie');
    }
  });
});
