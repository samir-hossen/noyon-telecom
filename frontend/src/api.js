import { FALLBACK_IMG } from './utils/fallbackImage';

// In local dev, Vite proxies "/api" to the backend (see vite.config.js).
// In production, the frontend is usually deployed separately from the
// backend, so set VITE_API_URL to the backend's full URL (e.g.
// https://your-backend.onrender.com/api) as a build-time environment variable.
const BASE = import.meta.env.VITE_API_URL || '/api';

// Uploaded product images are served from the backend (e.g. /uploads/xyz.png).
// In local dev, Vite's proxy handles this automatically. In production, when
// the frontend and backend live on different domains, this resolves the
// image to the backend's actual origin so it doesn't 404 on the frontend's domain.
//
// A missing/empty img field (product never had a photo uploaded) resolves
// straight to the placeholder here — no broken-image flash while an <img
// src=""> pointlessly re-requests the current page, and it works even in
// spots that don't wire up an onError handler. Every visible product <img>
// should still add onError -> FALLBACK_IMG too, since this only covers a
// missing field, not a URL that 404s (deleted upload, broken Cloudinary link).
export function resolveImg(src) {
  if (!src) return FALLBACK_IMG;
  if (!src.startsWith('/uploads')) return src;
  const apiOrigin = BASE.replace(/\/api\/?$/, '');
  return apiOrigin ? `${apiOrigin}${src}` : src;
}

// Auth now lives in an httpOnly cookie (set by the backend) instead of
// localStorage, so it can't be read or stolen via a client-side XSS bug.
// State-changing requests still need a CSRF token, which we fetch once and
// cache in memory (never in localStorage/sessionStorage — that would defeat
// the point, since it needs to be unreadable to a third-party script anyway
// it's also mirrored in a non-httpOnly cookie, which is the actual check).
let csrfToken = null;

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${BASE}/auth/csrf`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  csrfToken = data.csrfToken || null;
  return csrfToken;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function request(path, options = {}, _isRetry = false) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (MUTATING.has(method)) {
    const token = await ensureCsrfToken();
    if (token) headers['x-csrf-token'] = token;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A stale/missing CSRF token is recoverable — refresh once and retry.
    // Capped at a single retry so a persistent failure (cookies blocked,
    // backend misconfigured) can't recurse forever.
    if (!_isRetry && res.status === 403 && data.error?.includes('CSRF')) {
      csrfToken = null;
      return request(path, options, true);
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: async (path, file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = await ensureCsrfToken();
    const headers = token ? { 'x-csrf-token': token } : {};
    const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData, headers, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  // Uploads several files at once (e.g. a product's image gallery) and
  // returns { urls: [...] } in the same order the files were given.
  uploadMultiple: async (path, files) => {
    const formData = new FormData();
    [...files].forEach((file) => formData.append('images', file));
    const token = await ensureCsrfToken();
    const headers = token ? { 'x-csrf-token': token } : {};
    const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData, headers, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
};

// Loads Google reCAPTCHA v3 lazily and returns a token for the given action.
// Returns null (and the backend just skips verification) if no site key is
// configured — so local dev keeps working without any reCAPTCHA setup.
let recaptchaLoad = null;
export function getRecaptchaToken(action) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) return Promise.resolve(null);

  if (!recaptchaLoad) {
    recaptchaLoad = new Promise((resolve, reject) => {
      if (window.grecaptcha) return resolve();
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return recaptchaLoad
    .then(() => new Promise((resolve) => window.grecaptcha.ready(resolve)))
    .then(() => window.grecaptcha.execute(siteKey, { action }))
    .catch(() => null);
}
