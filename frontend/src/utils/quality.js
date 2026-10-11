// Grades with their own price (High Quality / Original …). The API sends
// them only together with a published price, cheapest first; `price` is the
// cheapest. Such a product is ordered on WhatsApp with the chosen grade —
// the cart can't hold a grade (see backend utils/qualityOptions.js).
export function qualityOptions(product) {
  return Array.isArray(product?.qualityOptions) ? product.qualityOptions.filter((g) => g && g.label && Number(g.price) > 0) : [];
}

export function hasQualityOptions(product) {
  return qualityOptions(product).length > 0;
}

// { min, max } when the grades have different prices, otherwise null.
export function priceRange(product) {
  const grades = qualityOptions(product);
  if (grades.length < 2) return null;
  const prices = grades.map((g) => Number(g.price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
