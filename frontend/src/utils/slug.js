// Turns a product name into a URL-friendly slug — used as a client-side
// fallback only (see productUrl below); the real, stored slug a product
// object carries from the API is always preferred.
export function slugify(text) {
  return (
    String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product'
  );
}

// Clean, id-free URL (e.g. /product/y03t-oled-display) once a product has
// its real `slug` from the backend — the best-looking, most keyword-relevant
// form for SEO. Falls back to the raw id for a product object that hasn't
// loaded `slug` yet (e.g. a cart line item serialized before this field
// existed), which still resolves fine since the backend's GET /products/:id
// route accepts either an id or a slug in that position.
export function productUrl(product) {
  return `/product/${product.slug || product.id}`;
}
