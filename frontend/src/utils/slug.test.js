import { describe, it, expect } from 'vitest';
import { slugify, productUrl } from './slug.js';

describe('slugify', () => {
  it('lowercases and hyphenates a normal product name', () => {
    expect(slugify('Y03T OLED Display Assembly')).toBe('y03t-oled-display-assembly');
  });

  it('collapses punctuation/spacing runs into a single hyphen', () => {
    expect(slugify('Samsung A14 - Back Glass (Black)')).toBe('samsung-a14-back-glass-black');
  });

  it('falls back to "product" for empty/non-alphanumeric input, never an empty slug', () => {
    expect(slugify('')).toBe('product');
    expect(slugify(undefined)).toBe('product');
    expect(slugify('!!!')).toBe('product');
  });
});

describe('productUrl', () => {
  it('prefers the stored slug for a clean, id-free URL', () => {
    expect(productUrl({ id: 'abc123', name: 'Y03T OLED Display', slug: 'y03t-oled-display' })).toBe('/product/y03t-oled-display');
  });

  it('falls back to the raw id when slug is missing (still resolves via the backend OR lookup)', () => {
    expect(productUrl({ id: 'abc123', name: 'Y03T OLED Display' })).toBe('/product/abc123');
  });
});
