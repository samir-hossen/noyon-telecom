// Pure query-building helpers shared by GET /api/products and
// GET /api/admin/products. Pulled out of the route handlers so the
// filter/pagination logic — the part most likely to silently break during
// a "make it scale to 10,000+ products" pass — can be unit tested without
// spinning up a database. Both routes previously duplicated this logic
// almost verbatim; this also removes that duplication.

const MAX_LIMIT = 200;

// Builds a Prisma `where` clause for the Product model from raw query-string
// values. `status` is admin-only (the public route always implies
// published: true and passes no status).
export function buildProductWhere({ category, brand, search, status } = {}) {
  const where = {};

  if (status === 'published') where.published = true;
  else if (status === 'draft') where.published = false;
  else if (status === undefined) where.published = true; // public storefront default

  const cat = (category || '').toString();
  if (cat && cat !== 'All') {
    // `categories` is a JSON array column; Prisma's `array_contains` compiles
    // to Postgres `@>` (containment) — see the idx_product_categories_gin
    // migration for the index that backs this.
    where.categories = { array_contains: cat };
  }

  const br = (brand || '').toString();
  if (br && br !== 'All') {
    where.brand = br;
  }

  const q = (search || '').toString().trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { desc: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

// Builds a Prisma `orderBy` clause from a `sort` query param.
export function buildProductOrderBy(sort) {
  if (sort === 'price-asc') return { price: 'asc' };
  if (sort === 'price-desc') return { price: 'desc' };
  if (sort === 'rating') return { rating: 'desc' };
  return { createdAt: 'desc' };
}

// Clamps/normalizes page + limit query params into safe integers, so a
// malformed, missing, negative, or absurdly large value can never reach
// Prisma's `skip`/`take` (e.g. never allow "give me all 10,000 rows" via
// ?limit=999999).
export function parsePagination({ page, limit } = {}, { defaultLimit = 12 } = {}) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || defaultLimit));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
  };
}

export { MAX_LIMIT };
