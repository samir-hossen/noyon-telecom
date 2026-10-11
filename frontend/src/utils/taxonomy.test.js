import { describe, it, expect } from 'vitest';
import { categoryUrl, brandUrl, categoryFromSlug, brandFromSlug } from './taxonomy.js';

describe('categoryUrl / brandUrl', () => {
  it('builds a clean path from a real category/brand name', () => {
    expect(categoryUrl('Charging Port')).toBe('/category/charging-port');
    expect(brandUrl('Google Pixel')).toBe('/brand/google-pixel');
  });
});

describe('categoryFromSlug / brandFromSlug', () => {
  it('resolves a slug back to the real, correctly-cased name', () => {
    expect(categoryFromSlug('charging-port')).toBe('Charging Port');
    expect(brandFromSlug('google-pixel')).toBe('Google Pixel');
  });

  it('returns null for a slug that matches no known category/brand', () => {
    expect(categoryFromSlug('not-a-real-category')).toBe(null);
    expect(brandFromSlug('not-a-real-brand')).toBe(null);
  });
});

describe('switched-off categories (battery section is OFF)', () => {
  it('Battery is off, still resolvable from its old URL (so it can redirect), and not active', async () => {
    const { isDisabledCategory, ACTIVE_CATEGORIES, DISABLED_CATEGORIES } = await import('./taxonomy.js');
    expect(DISABLED_CATEGORIES).toEqual(['Battery']);
    expect(isDisabledCategory('battery')).toBe(true);
    expect(isDisabledCategory('Display')).toBe(false);
    expect(categoryFromSlug('battery')).toBe('Battery');
    expect(ACTIVE_CATEGORIES).not.toContain('Battery');
  });
});
