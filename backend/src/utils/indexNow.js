// IndexNow tells participating search engines (including Bing) when a
// public product URL changes. Admin imports can touch thousands of rows, so
// notifications are collected for ten seconds and sent as one batch rather
// than turning every save into another outbound request.
import { productPath } from './slug.js';

const SITE_URL = 'https://noyontelecom.com';
const INDEXNOW_KEY = 'ddc3a945-9271-42b4-9d72-81607db04830';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000;

const pendingUrls = new Set();
let flushTimer = null;

export function buildIndexNowPayload(urls) {
  return {
    host: 'noyontelecom.com',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, MAX_URLS),
  };
}

async function flushIndexNow() {
  flushTimer = null;
  const urls = Array.from(pendingUrls).slice(0, MAX_URLS);
  urls.forEach((url) => pendingUrls.delete(url));
  if (urls.length === 0) return;

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildIndexNowPayload(urls)),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`IndexNow returned HTTP ${response.status}`);
  } catch (err) {
    // Product writes already succeeded in Postgres. Search notification is
    // best-effort and must never make an admin save/import fail or retry.
    console.error('IndexNow notification failed:', err.message);
  }
}

export function queueProductUrlsForIndexNow(products) {
  if (process.env.NODE_ENV !== 'production') return;
  for (const product of products || []) {
    if (!product?.id) continue;
    pendingUrls.add(new URL(productPath(product), SITE_URL).href);
  }
  if (pendingUrls.size && !flushTimer) {
    flushTimer = setTimeout(flushIndexNow, 10_000);
    flushTimer.unref?.();
  }
}
