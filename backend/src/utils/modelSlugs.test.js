import test from 'node:test';
import assert from 'node:assert/strict';
import { modelSlugsFor } from './modelSlugs.js';

test('modelSlugsFor', async (t) => {
  await t.test('full model names become hub slugs', () => {
    assert.deepEqual(modelSlugsFor(['Vivo Y21', 'Vivo Y21s']), ['vivo-y21', 'vivo-y21s']);
    assert.deepEqual(modelSlugsFor(['iPhone 14 Plus']), ['iphone-14-plus']);
    assert.deepEqual(modelSlugsFor(['Samsung Galaxy A15', 'Google Pixel 7a']), ['samsung-galaxy-a15', 'google-pixel-7a']);
  });
  await t.test('a bare code with no brand gets no hub', () => {
    assert.deepEqual(modelSlugsFor(['A15', 'X6516']), []);
  });
  await t.test('"(4G / 5G)" is dropped, duplicates removed, junk ignored', () => {
    assert.deepEqual(modelSlugsFor(['Xiaomi Redmi 13C (4G / 5G)', 'Xiaomi Redmi 13C']), ['xiaomi-redmi-13c']);
    assert.deepEqual(modelSlugsFor(null), []);
    assert.deepEqual(modelSlugsFor(['', null]), []);
  });
});
