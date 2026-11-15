// IndexNow tells participating search engines (including Bing) when a
// public product URL changes. Admin imports can touch thousands of rows, so
// notifications are collected for ten seconds and sent as one batch rather
// than turning every save into another outbound request.
import { productPath } from './slug.js';

const SITE_URL = 'https://noyontelecom.com';
const INDEXNOW_KEY = 'ddc3a945-9271-42b4-9d72-81607db04830';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000;
const MAX_PENDING_URLS = 20_000;

function canonicalProductUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.origin !== SITE_URL || url.username || url.password || url.search || url.hash) return null;
    if (!/^\/product\/[a-z0-9-]+$/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function buildIndexNowPayload(urls) {
  return {
    host: 'noyontelecom.com',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: [...new Set((urls || []).map(canonicalProductUrl).filter(Boolean))].slice(0, MAX_URLS),
  };
}

// Dependencies are injectable so batching, backoff and concurrent edits can
// be tested without contacting search engines or waiting on real timers.
export function createIndexNowQueue({
  fetchImpl = (...args) => fetch(...args),
  schedule = setTimeout,
  logError = (...args) => console.error(...args),
  enabled = () => process.env.NODE_ENV === 'production',
} = {}) {
  const pendingUrls = new Map();
  let flushTimer = null;
  let flushing = false;

  function scheduleFlush(delay = 10_000) {
    if (flushing || flushTimer !== null || pendingUrls.size === 0) return;
    flushTimer = schedule(() => {
      flushTimer = null;
      return flush();
    }, delay);
    flushTimer?.unref?.();
  }

  async function flush() {
    if (flushing || pendingUrls.size === 0) return;
    flushing = true;
    const entries = Array.from(pendingUrls.entries()).slice(0, MAX_URLS);
    entries.forEach(([url]) => pendingUrls.delete(url));
    let nextDelay = 10_000;
    let retryable = true; // Network errors/timeouts are transient.

    try {
      const response = await fetchImpl(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(buildIndexNowPayload(entries.map(([url]) => url))),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        retryable = response.status === 429 || response.status >= 500;
        // Respect rate-limit backoff, bounded to five minutes. New edits
        // join the same queue and never bypass this timer with another call.
        const retryAfter = response.headers?.get('retry-after');
        const seconds = Number(retryAfter);
        const retryMs = retryAfter && Number.isFinite(seconds)
          ? seconds * 1000
          : Date.parse(retryAfter || '') - Date.now();
        nextDelay = Math.max(60_000, Math.min(300_000, Number.isFinite(retryMs) ? retryMs : 60_000));
        throw new Error(`IndexNow returned HTTP ${response.status}`);
      }
    } catch (err) {
      nextDelay = Math.max(nextDelay, 60_000);
      if (retryable) {
        for (const [url, attempts] of entries) {
          // One retry at most. A newer edit queued during this request wins;
          // never replace it with an older notification or reset its state.
          if (attempts === 0 && !pendingUrls.has(url) && pendingUrls.size < MAX_PENDING_URLS) {
            pendingUrls.set(url, 1);
          }
        }
      }
      logError('IndexNow notification failed:', err.message);
    } finally {
      flushing = false;
      // Drain every batch, including leftovers after a >10k-product import.
      scheduleFlush(nextDelay);
    }
  }

  return function queueProductUrls(products) {
    if (!enabled() || !Array.isArray(products)) return;
    let overflow = false;
    for (const product of products) {
      if (!product?.id) continue;
      const url = canonicalProductUrl(`${SITE_URL}${productPath(product)}`);
      if (!url || pendingUrls.has(url)) continue;
      if (pendingUrls.size >= MAX_PENDING_URLS) {
        // Bound memory during sustained imports/outages. The XML sitemap
        // remains the complete source; keep the most recent changed URLs.
        pendingUrls.delete(pendingUrls.keys().next().value);
        overflow = true;
      }
      pendingUrls.set(url, 0);
    }
    if (overflow) logError('IndexNow queue capacity reached; older changes remain discoverable through the sitemap.');
    scheduleFlush();
  };
}

// published:false is intentional: hiding or deleting a previously public
// product must also notify search engines so they can recrawl its removal.
export const queueProductUrlsForIndexNow = createIndexNowQueue();
