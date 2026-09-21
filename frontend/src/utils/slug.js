// Turns a product name into a URL-friendly slug, appended after the real
// id in product links (e.g. /product/cmsribsad.../y03t-display-oled) purely
// for readability and keyword relevance in the URL — Google and shoppers
// both read a slug like this far better than an opaque cuid. The id alone
// is still what's actually used to look the product up (see ProductDetail's
// useParams), so a stale slug from a since-renamed product, or an old link
// shared with no slug at all, both keep working exactly the same.
export function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  );
}

export function productUrl(product) {
  return `/product/${product.id}/${slugify(product.name)}`;
}
