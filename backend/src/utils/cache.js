// Lightweight in-process cache-aside helper for read-heavy, mostly-public
// catalog endpoints (home-sections, product listing) that would otherwise
// re-run the same DB query for every single visitor — a homepage getting
// hit 50 times a minute was previously running the same 4 queries 50 times
// a minute for identical results.
//
// In-memory (node-cache) by design, not Redis — this needs zero external
// service/credentials, which matters because it can go live today, before
// SITE_URL/Cloudinary/SMTP/etc. are even configured. The tradeoff: this
// cache lives inside a single Node process. That's exactly right for a
// single backend instance (the common case on Railway/Render at this
// traffic level) but if this ever runs as more than one instance behind a
// load balancer, each instance keeps its own independent cache — a write on
// instance A won't invalidate instance B's copy until its TTL naturally
// expires. If/when that's the setup, swap the get/set/del calls below for
// an ioredis-backed version; every call site in the routes stays identical
// (`getOrSet(key, ttlSeconds, fetchFn)` / `invalidateProductCache()`), only
// this file would change.
import NodeCache from 'node-cache';

// checkperiod sweeps expired keys in the background every 2 minutes so
// memory doesn't grow unbounded from one-off keys (e.g. every distinct Shop
// page filter combination anyone has ever searched for). useClones: false
// means a cache hit returns the *same* object every caller already treats
// as read-only (serialized product rows), skipping a wasteful deep-copy on
// every hit.
const cache = new NodeCache({ checkperiod: 120, useClones: false });

// Cache-aside: return the cached value if present: otherwise call
// `fetchFn`, store what it resolves to under `key` for `ttlSeconds`, and
// return that. Concurrent requests for the same not-yet-cached key each
// still run `fetchFn` once each (no request coalescing) — acceptable here
// since a cache miss just means a normal DB query, same as if this cache
// didn't exist; the win is avoiding that query on every *subsequent* hit
// within the TTL window, not eliminating every possible duplicate query.
export async function getOrSet(key, ttlSeconds, fetchFn) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const value = await fetchFn();
  cache.set(key, value, ttlSeconds);
  return value;
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
  cache.flushAll();
}

export { cache };
