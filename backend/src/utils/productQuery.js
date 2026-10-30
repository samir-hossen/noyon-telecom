// Pure query-building helpers shared by GET /api/products and
// GET /api/admin/products. Pulled out of the route handlers so the
// filter/pagination logic — the part most likely to silently break during
// a "make it scale to 10,000+ products" pass — can be unit tested without
// spinning up a database. Both routes previously duplicated this logic
// almost verbatim; this also removes that duplication.

import { notInDisabledCategories, DISABLED_CATEGORIES_LOWER, isDisabledCategory } from '../config/catalog.js';
import { normalizeQualityOptions, hasQualityOptions } from './qualityOptions.js';

const MAX_LIMIT = 200;

// Builds a Prisma `where` clause for the Product model from raw query-string
// values. `status` and `priceStatus` are admin-only (the public route always
// implies published: true and passes neither). `storefront: true` also keeps
// switched-off categories (Battery) out — see config/catalog.js.
export function buildProductWhere({ category, brand, search, status, priceStatus, storefront = false } = {}) {
  const where = {};
  const and = storefront ? notInDisabledCategories() : [];

  if (status === 'published') where.published = true;
  else if (status === 'draft') where.published = false;
  else if (status === undefined) where.published = true; // public storefront default

  if (priceStatus === 'published' || priceStatus === 'draft') where.priceStatus = priceStatus;

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
    // (name/sku/brand), rather than requiring the whole typed phrase
    // to appear verbatim as one substring. That old behavior meant
    // "iphone 13 screen" wouldn't match a product named "iPhone 13 Pro
    // Screen" — the extra word "Pro" broke the match. Per-word AND-of-OR
    // still uses the same trigram GIN index (idx_product_search_trgm) for
    // each word's `contains`, so this stays index-backed and fast even as
    // the catalog grows.
    const words = q.split(/\s+/).filter(Boolean);
    and.unshift(...words.map((w) => ({
      OR: [
        // Not `desc`: descriptions are long, mostly shared template text
        // (every one says "display", "warranty", "Bangladesh"), so matching
        // them made results noisy and search slow at ~18,000 products —
        // names already carry brand + model + part.
        { name: { contains: w, mode: 'insensitive' } },
        { sku: { contains: w, mode: 'insensitive' } },
        { brand: { contains: w, mode: 'insensitive' } },
      ],
    })));
  }

  if (and.length) where.AND = and;
  return where;
}

// The base `where` for every customer-facing product query outside the
// paginated listing (home rails, sitemap, feed, brand lists).
export function storefrontWhere(extra = {}) {
  return { published: true, AND: notInDisabledCategories(), ...extra };
}

// A product is actually sellable right now when it has real stock AND a
// real price the owner has published (an unpublished/draft price is hidden
// from customers — see isPricePublished in serialize.js). Kept in sync on
// every create/update/import/restore (see admin.routes.js) rather than
// computed by the database, so `readyToSell` is a plain, always-correct
// application value the default sort below can just read.
export function computeReadyToSell(stock, price, priceStatus) {
  return Number(stock) > 0 && Number(price) > 0 && priceStatus === 'published';
}

// Publish-on-edit (owner's policy, Oct 2026): how an admin create/update/
// import request changes `price`/`priceStatus`.
//   - typing a price > 0 and saving publishes it
//   - price 0 means "no price" -> hidden (draft)
//   - priceStatus 'draft' hides the price (the value is kept)
//   - priceStatus 'published' publishes the price already stored
//   - no price and no priceStatus -> nothing changes (an edit to the name or
//     photo never publishes a hidden price by accident)
// `currentPrice` is the stored price (0 for a new product). Returns the
// fields to write (either may be undefined = leave as is), or `error`.
export function resolvePriceUpdate({ price, priceStatus } = {}, currentPrice = 0) {
  const out = {};
  if (priceStatus !== undefined && priceStatus !== null && priceStatus !== '' && !['draft', 'published'].includes(priceStatus)) {
    return { error: 'priceStatus must be "draft" or "published".' };
  }
  if (price !== undefined && price !== null && price !== '') {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) return { error: 'Price must be a number of 0 or more.' };
    out.price = n;
    out.priceStatus = n > 0 ? 'published' : 'draft';
  }
  if (priceStatus === 'draft') out.priceStatus = 'draft';
  if (priceStatus === 'published') {
    const finalPrice = out.price !== undefined ? out.price : Number(currentPrice) || 0;
    if (!(finalPrice > 0)) return { error: 'দাম ছাড়া পাবলিশ করা যাবে না — আগে দাম লিখুন। (A price is needed before publishing.)' };
    out.priceStatus = 'published';
  }
  return out;
}

// Quality options in an admin save (`qualityOptions` sent only when the
// owner edited the grades): grades typed and saved go live like a typed
// price (publish-on-edit), and the price becomes the cheapest grade.
// Removing every grade without typing a single price hides the price — it
// was the cheapest grade's, not a real single price. null = not sent.
export function resolveQualityOptionsUpdate({ qualityOptions, price, priceStatus } = {}, existing = null) {
  if (!Array.isArray(qualityOptions)) return null;
  const options = normalizeQualityOptions(qualityOptions);
  if (options.length) {
    return { qualityOptions: options, price: options[0].price, priceStatus: priceStatus === 'draft' ? 'draft' : 'published' };
  }
  const typedPrice = price !== undefined && price !== null && price !== '';
  return { qualityOptions: [], ...(hasQualityOptions(existing) && !typedPrice ? { priceStatus: 'draft' } : {}) };
}

// Optional admin-only number field (draftPrice/referencePrice): '' or null
// clears it, anything else must be a positive number.
export function parseOptionalPrice(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Builds a Prisma `orderBy` clause from a `sort` query param.
// Price sorts put products with a published price first (the enum is
// declared draft, published, so `desc` = published first) — a hidden price
// must not decide where a product appears.
export function buildProductOrderBy(sort) {
  if (sort === 'price-asc') return [{ priceStatus: 'desc' }, { price: 'asc' }, { createdAt: 'desc' }];
  if (sort === 'price-desc') return [{ priceStatus: 'desc' }, { price: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'popular') return [{ viewCount: 'desc' }, { readyToSell: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }];
  if (sort === 'newest') return [{ createdAt: 'desc' }, { id: 'asc' }];
  if (sort === 'rating') return { rating: 'desc' };
  // Default ("Featured"): sellable products (in stock, published price)
  // first, then the rest with a shown price, then "ask price on WhatsApp"
  // ones — newest first within each group.
  return [{ readyToSell: 'desc' }, { priceStatus: 'desc' }, { createdAt: 'desc' }];
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
  return allCategories.filter((c) => active.has(c) && !isDisabledCategory(c));
}

// Same idea as getActiveCategories, for the Brand pill row — only brands
// with at least one published product show as a filter option.
export async function getActiveBrands(prisma, allBrands) {
  const rows = await prisma.product.findMany({
    where: storefrontWhere({ brand: { not: null } }),
    distinct: ['brand'],
    select: { brand: true },
  });
  const active = new Set(rows.map((r) => r.brand));
  return allBrands.filter((b) => active.has(b));
}

// Every real (brand, category) combination with at least one published
// product — powers the /brand/<brand>/<category> sitemap entries. Not a
// naive cross-product of every brand × every category (most combinations
// have zero matching products, which would submit a wall of thin/empty
// pages to Google) — only ones the catalog actually has.
export async function getActiveBrandCategoryPairs(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT brand, jsonb_array_elements_text(categories) AS category
    FROM "Product"
    WHERE published = true AND brand IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))
  `;
  return rows.map((r) => ({ brand: r.brand, category: r.category }));
}

export { MAX_LIMIT };

