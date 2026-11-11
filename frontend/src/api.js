import { FALLBACK_IMG } from './utils/fallbackImage';
import { placeholderPhoto } from './utils/partPhoto';

// In local dev, Vite proxies "/api" to the backend (see vite.config.js).
// In production, the frontend is usually deployed separately from the
// backend, so set VITE_API_URL to the backend's full URL (e.g.
// https://your-backend.onrender.com/api) as a build-time environment variable.
// .trim() guards against a trailing newline/whitespace ending up in the
// VITE_API_URL env var (an easy copy-paste artifact when pasting into a
// hosting dashboard's env var field) - fetch() silently tolerates it
// (browsers strip stray control characters when normalizing a URL), but
// resolveImg()'s regex-based string replace below runs on the raw string
// before any of that normalization, so a trailing "\n" there made its
// `$` anchor fail to match and left "/api" un-stripped from local /uploads
// image URLs, 404ing every locally-stored (non-Cloudinary) product photo.
const BASE = (import.meta.env.VITE_API_URL || '/api').trim();

// Cloudinary-hosted images (the production path — see backend/src/utils/
// upload.js) can be auto-optimized for free with nothing more than a URL
// rewrite: f_auto serves WebP/AVIF to browsers that support it (falling
// back to JPEG/PNG otherwise) and q_auto picks the smallest quality level
// that still looks right, both computed by Cloudinary on the fly, no
// dashboard config or paid add-on needed. `width` additionally caps the
// delivered image to roughly the size it's actually displayed at — a
// product grid thumbnail has no reason to ship the same full-resolution
// photo as the product detail page's hero image. This was DEPLOYMENT.md's
// own "suggested next step" (image optimization / responsive images) —
// smaller images directly help LCP (a real Google ranking factor) and
// mobile data usage for customers on slower connections.
// The `/upload/f_auto` check guards against ever double-applying this if
// resolveImg is called more than once on an already-transformed URL.
function applyCloudinaryTransform(url, width) {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/') || url.includes('/upload/f_auto')) return url;
  const transform = width ? `f_auto,q_auto,w_${width}` : 'f_auto,q_auto';
  return url.replace('/upload/', `/upload/${transform}/`);
}

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
// `width` (optional): see applyCloudinaryTransform above — pass the
// roughly-displayed width for anything rendered smaller than full size
// (grid thumbnails, avatars) so Cloudinary doesn't ship more pixels than
// will ever be shown.
export function resolveImg(src, width) {
  if (!src) return FALLBACK_IMG;
  if (!src.startsWith('/uploads')) return applyCloudinaryTransform(src, width);
  const apiOrigin = BASE.replace(/\/api\/?$/, '');
  return apiOrigin ? `${apiOrigin}${src}` : src;
}

// A product's main photo, or the photo of its part (its model's own where we
// have one) while it has none.
export function productImg(product, width) {
  return product?.img ? resolveImg(product.img, width) : placeholderPhoto(product);
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
  // A bodyless GET must remain a simple CORS request: application/json
  // would add an OPTIONS round trip before every new API URL.
  const headers = {
    Accept: 'application/json',
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

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
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.status = res.status;
    throw error;
  }
  return data;
}

// Coalesce identical GETs that mount at the same time. AnnouncementBar and
// Footer both need public settings, and React pages can request the same
// product through adjacent widgets; one network trip is enough. This is not
// a stale data cache: the entry disappears as soon as the request finishes.
const pendingGets = new Map();
const recentGets = new Map();
const READ_CACHE_TTL_MS = 20_000;
let readGeneration = 0;

function clearReadCache() {
  readGeneration += 1;
  recentGets.clear();
  pendingGets.clear();
}

function canReuseGet(path) {
  return path.startsWith('/products') || path === '/settings/public' || path === '/banners';
}

function get(path) {
  const cached = recentGets.get(path);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);
  if (cached) recentGets.delete(path);
  if (pendingGets.has(path)) return pendingGets.get(path);
  const startedGeneration = readGeneration;
  const promise = request(path).then((data) => {
    // A tiny in-memory cache makes back/forward navigation and repeated
    // homepage mounts instant without persisting price-bearing data to disk.
    // Every mutation below clears it, so login/logout/admin edits cannot
    // reuse a response created for the previous viewer or product state.
    if (startedGeneration === readGeneration && canReuseGet(path)) recentGets.set(path, { data, expiresAt: Date.now() + READ_CACHE_TTL_MS });
    return data;
  }).finally(() => {
    if (pendingGets.get(path) === promise) pendingGets.delete(path);
  });
  pendingGets.set(path, promise);
  return promise;
}

export const api = {
  get,
  post: (path, body) => { clearReadCache(); return request(path, { method: 'POST', body: JSON.stringify(body) }); },
  put: (path, body) => { clearReadCache(); return request(path, { method: 'PUT', body: JSON.stringify(body) }); },
  patch: (path, body) => { clearReadCache(); return request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
  del: (path) => { clearReadCache(); return request(path, { method: 'DELETE' }); },
  upload: async (path, file) => {
    clearReadCache();
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
    clearReadCache();
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

