import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, productPath } from './slug.js';

describe('slugify', () => {
  test('lowercases and hyphenates a normal product name', () => {
    assert.equal(slugify('Y03T OLED Display Assembly'), 'y03t-oled-display-assembly');
  });

  test('collapses punctuation/spacing runs into a single hyphen', () => {
    assert.equal(slugify('Samsung A14 - Back Glass (Black)'), 'samsung-a14-back-glass-black');
  });

  test('trims leading/trailing hyphens left over from leading/trailing punctuation', () => {
    assert.equal(slugify('  -Charging Port-  '), 'charging-port');
  });

  test('falls back to "product" for empty/non-alphanumeric input, never an empty slug', () => {
    assert.equal(slugify(''), 'product');
    assert.equal(slugify(undefined), 'product');
    assert.equal(slugify('!!!'), 'product');
  });
});

describe('productPath', () => {
  test('builds /product/:id/:slug from the id and name', () => {
    assert.equal(productPath({ id: 'abc123', name: 'Y03T OLED Display' }), '/product/abc123/y03t-oled-display');
  });
});
