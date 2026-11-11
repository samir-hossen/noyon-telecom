// Cache-Control logic shared by the storefront product routes whose
// response body is price-personalized for approved dealers (see
// priceForViewer in utils/serialize.js). Pulled into its own module so the
// caching rule itself — the part where getting it wrong risks leaking one
// dealer's discounted price to an unrelated visitor — can be unit tested
// directly, the same way productQuery.js's filter/pagination logic is.

// Sets a short, safe Cache-Control (+ Vary) on a product-listing/detail
// response.
//   - signed-in requests (any role) always get `no-store` — the response
//     may contain dealer-specific pricing, so it must never be cached
//     anywhere, by anyone, at any layer.
//   - anonymous/guest responses get a deliberately short browser cache and
//     a slightly longer shared-cache lifetime. stale-while-revalidate lets
//     repeat catalogue visits paint immediately while the newest response
//     is fetched in the background. Product writes change image URLs and
//     invalidate the server cache, so this never pins an old photo for long.
//   - Vary: Cookie ensures a cache is never reused across a login/logout
//     transition on the same browser — the auth cookie's value changes
//     the moment someone logs in as a dealer, so a cache keyed only by
//     URL could otherwise serve a guest's cached retail-priced response
//     for up to the TTL right after a dealer logs in.
export function setProductCacheControl(req, res) {
  res.set('Vary', 'Cookie');
  if (req.user) {
    res.set('Cache-Control', 'no-store');
  } else {
    res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400');
  }
}
