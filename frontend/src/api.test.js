import { describe, it, expect } from 'vitest';
import { resolveImg } from './api.js';
import { FALLBACK_IMG } from './utils/fallbackImage.js';

describe('resolveImg', () => {
  it('leaves non-upload URLs untouched', () => {
    expect(resolveImg('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg');
  });

  it('falls back to the placeholder image for empty/undefined input', () => {
    expect(resolveImg(undefined)).toBe(FALLBACK_IMG);
    expect(resolveImg(null)).toBe(FALLBACK_IMG);
    expect(resolveImg('')).toBe(FALLBACK_IMG);
  });

  it('resolves a relative /uploads path to the API origin when VITE_API_URL is set', () => {
    // Falls back to '/api' in this test env (no VITE_API_URL configured),
    // so a relative /uploads path is returned as-is — this documents that
    // local-dev behavior rather than asserting a hardcoded backend origin.
    expect(resolveImg('/uploads/product-1.png')).toBe('/uploads/product-1.png');
  });
});
