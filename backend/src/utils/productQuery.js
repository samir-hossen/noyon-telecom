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
    // Split into words and require each word to appear *somewhere*
    // (name/desc/sku/brand), rather than requiring the whole typed phrase
    // to appear verbatim as one substring. That old behavior meant
    // "iphone 13 screen" wouldn't match a product named "iPhone 13 Pro
    // Screen" — the extra word "Pro" broke the match. Per-word AND-of-OR
    // still uses the same trigram GIN index (idx_product_search_trgm) for
    // each word's `contains`, so this stays index-backed and fast even as
    // the catalog grows.
    const words = q.split(/\s+/).filter(Boolean);
    where.AND = words.map((w) => ({
      OR: [
        { name: { contains: w, mode: 'insensitive' } },
        { desc: { contains: w, mode: 'insensitive' } },
        { sku: { contains: w, mode: 'insensitive' } },
        { brand: { contains: w, mode: 'insensitive' } },
      ],
    }));
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

// Which of ALL_CATEGORIES actually have at least one published product right
// now. The Shop page's category pills only show these — a category with no
// products yet is hidden rather than offered as a dead-end filter, but
// automatically reappears the moment an admin adds a published product to
// it (no code change needed). `allCategories` is passed in rather than
// imported here to avoid a circular import with routes/products.routes.js,
// which defines the canonical list.
export async function getActiveCategories(prisma, allCategories) {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT jsonb_array_elements_text(categories) AS cat
    FROM "Product"
    WHERE published = true
  `;
  const active = new Set(rows.map((r) => r.cat));
  return allCategories.filter((c) => active.has(c));
}

// Same idea as getActiveCategories, for the Brand pill row — only brands
// with at least one published product show as a filter option.
export async function getActiveBrands(prisma, allBrands) {
  const rows = await prisma.product.findMany({
    where: { published: true, brand: { not: null } },
    distinct: ['brand'],
    select: { brand: true },
  });
  const active = new Set(rows.map((r) => r.brand));
  return allBrands.filter((b) => active.has(b));
}

export { MAX_LIMIT };
