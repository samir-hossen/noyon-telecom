// Mirrors frontend/src/utils/slug.js exactly — the frontend route accepts
// /product/:id/:slug? with the slug purely cosmetic (lookup is always by
// id), so any drift between the two just means a sitemap/feed URL doesn't
// exactly match what a human sees in their address bar; it never breaks a
// link. Kept in sync by hand since the two are separate deployable
// packages with no shared import between them.
export function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  );
}

export function productPath(product) {
  return `/product/${product.id}/${slugify(product.name)}`;
}
