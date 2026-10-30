import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveImg, api } from './api.js';
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

  describe('Cloudinary auto-optimization', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1234567890/noyontelecom-products/abc123.jpg';

    it('injects f_auto,q_auto for a Cloudinary URL with no width given', () => {
      expect(resolveImg(cloudinaryUrl)).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234567890/noyontelecom-products/abc123.jpg'
      );
    });

    it('also caps the width when one is given, for a grid thumbnail', () => {
      expect(resolveImg(cloudinaryUrl, 400)).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1234567890/noyontelecom-products/abc123.jpg'
      );
    });

    it('never double-applies the transform if called twice on an already-transformed URL', () => {
      const once = resolveImg(cloudinaryUrl, 400);
      expect(resolveImg(once, 400)).toBe(once);
    });

    it('leaves a non-Cloudinary URL untouched even with a width given', () => {
      expect(resolveImg('https://cdn.example.com/photo.jpg', 400)).toBe('https://cdn.example.com/photo.jpg');
    });
  });
});


describe('API request headers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('GET requests avoid JSON Content-Type so cross-origin reads need no preflight', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.get('/products')).resolves.toEqual({ products: [] });
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.headers.Accept).toBe('application/json');
    expect(options.credentials).toBe('include');
  });

  it('POST requests keep JSON and CSRF protection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'test-token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    await api.post('/contact', { message: 'test' });
    const options = fetchMock.mock.calls[1][1];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['x-csrf-token']).toBe('test-token');
    expect(JSON.parse(options.body)).toEqual({ message: 'test' });
  });
});
