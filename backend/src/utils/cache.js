// Bounded cache for one backend process. Product edits invalidate fresh and
// outage-fallback entries together; viewer-specific pricing is applied later.
// Bound both keys and serialized payload size on the free 512 MB backend.
// Expired catalogue values can survive briefly for a database outage; they
// are never used for authentication, checkout or settings.
export class BoundedCache {
  constructor({ maxKeys = 2000, maxBytes = 32 * 1024 * 1024, now = Date.now } = {}) {
    this.entries = new Map();
    this.bytes = 0;
    this.maxKeys = maxKeys;
    this.maxBytes = maxBytes;
    this.now = now;
  }
  get(key, stale = false) {
    const item = this.entries.get(key);
    if (!item) return undefined;
    if (item.staleUntil <= this.now()) { this.del(key); return undefined; }
    if (!stale && item.freshUntil <= this.now()) return undefined;
    this.entries.delete(key);
    this.entries.set(key, item);
    return item.value;
  }
  set(key, value, ttlSeconds = 0, staleSeconds = 0) {
    const size = Buffer.byteLength(JSON.stringify(value) ?? '') + Buffer.byteLength(key);
    this.del(key);
    if (size > this.maxBytes) return false;
    const freshUntil = ttlSeconds === 0 ? Infinity : this.now() + ttlSeconds * 1000;
    const item = { value, size, freshUntil, staleUntil: freshUntil + staleSeconds * 1000, retryAt: 0 };
    this.entries.set(key, item);
    this.bytes += size;
    while (this.entries.size > this.maxKeys || this.bytes > this.maxBytes) this.del(this.entries.keys().next().value);
    return true;
  }
  del(key) {
    const item = this.entries.get(key);
    if (!item) return;
    this.bytes -= item.size;
    this.entries.delete(key);
  }
  flushAll() { this.entries.clear(); this.bytes = 0; }
  cooldown(key) { const item = this.entries.get(key); return item && item.retryAt > this.now(); }
  defer(key) { const item = this.entries.get(key); if (item) item.retryAt = this.now() + 30_000; }
}
const cache = new BoundedCache();
const isCatalogKey = (key) => /^(products|seo|sitemap|feed):/.test(key);
export function isTransientDatabaseError(error) {
  const code = error?.code || error?.meta?.code;
  return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', '53000', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(code)
    || ['53000', '57P01', '57P02', '57P03'].includes(error?.meta?.code);
}

// Coalesce concurrent cold reads. A write invalidates in-flight results too.
const pending = new Map();
let generation = 0;
export async function getOrSet(key, ttlSeconds, fetchFn) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const catalog = isCatalogKey(key);
  const stale = catalog ? cache.get(key, true) : undefined;
  if (stale !== undefined && cache.cooldown(key)) return stale;
  if (pending.has(key)) return pending.get(key);
  const started = generation;
  const promise = Promise.resolve().then(fetchFn).then((value) => {
    if (started === generation) cache.set(key, value, ttlSeconds, catalog ? 3600 : 0);
    return value;
  }).catch((error) => {
    if (started === generation && stale !== undefined && isTransientDatabaseError(error)) {
      cache.defer(key);
      return stale;
    }
    throw error;
  }).finally(() => { if (pending.get(key) === promise) pending.delete(key); });
  pending.set(key, promise);
  return promise;
}

// Call this after any write that could change what a cached catalog read
// would return: product create/update/delete/bulk-import/backup-restore,
// or a new review changing a product's rating (bestSellers is sorted by
// rating). Deliberately coarse — clears every cached catalog entry rather
// than computing exactly which category/brand/search/sort/page
// combinations a single product appears in. Writes here are far less
// frequent than reads, so a full flush is cheap and guarantees an admin
// sees their own change reflected immediately, which matters more than the
// marginal cache hits a more surgical invalidation would save.
//
// Checkout (which decrements stock) deliberately does NOT call this — with
// dozens of orders a minute during a flash sale, flushing on every single
// one would defeat the cache exactly when it's needed most. A product that
// just sold out stays visible as "in stock" in cached responses for at
// most one TTL window; the atomic stock guard in orders.routes.js already
// makes that a clean "just sold out, please retry" error at checkout
// instead of an overselling bug, so this is a display-freshness tradeoff,
// not a correctness one — the same tradeoff the existing 30s HTTP
// Cache-Control on these routes already makes (see cacheControl.js).
export function invalidateProductCache() {
  generation += 1;
  pending.clear();
  cache.flushAll();
}

export { cache };

