import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, productPath, uniqueSlugFromSet } from './slug.js';

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
  test('prefers the stored slug for a clean, id-free URL', () => {
    assert.equal(productPath({ id: 'abc123', name: 'Y03T OLED Display', slug: 'y03t-oled-display' }), '/product/y03t-oled-display');
  });

  test('falls back to the raw id when slug is missing (still resolves via the backend OR lookup)', () => {
    assert.equal(productPath({ id: 'abc123', name: 'Y03T OLED Display' }), '/product/abc123');
  });
});

describe('uniqueSlugFromSet', () => {
  test('returns the plain slug when it is not already taken', () => {
    assert.equal(uniqueSlugFromSet('Battery', new Set()), 'battery');
  });

  test('appends -2, -3, ... on collision until it finds a free slug', () => {
    const taken = new Set(['battery', 'battery-2']);
    assert.equal(uniqueSlugFromSet('Battery', taken), 'battery-3');
  });
});
