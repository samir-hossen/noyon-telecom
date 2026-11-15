// Optional Meilisearch integration for typo-tolerant, faceted product
// search — same "entirely optional, no-op until configured" pattern
// already used for Cloudinary (utils/upload.js), Sentry
// (utils/errorTracking.js), and SMTP (utils/mailer.js) throughout this
// codebase. Set MEILISEARCH_HOST (+ MEILISEARCH_API_KEY if your instance
// requires one) in backend/.env to turn this on; leave it unset and every
// function here is a safe no-op — search keeps working exactly as before,
// via the Postgres trigram index (see productQuery.js).
//
// Meilisearch is self-hosted (a single binary or Docker container you run
// yourself — see https://www.meilisearch.com/docs/learn/self_hosted/getting_started_with_self_hosted_meilisearch),
// not a third-party account like Cloudinary/SSLCommerz. There's no signup
// step here, just a server to stand up (a small VPS, a Railway/Fly.io
// deployment, etc.) and point this at.
//
// Why this exists on top of the Postgres search that's already there:
// Postgres `contains` matching (buildProductWhere in productQuery.js) is
// fast and index-backed up to several thousand SKUs, but it has no
// typo-tolerance ("iphone 13" won't match a search for "ihpone 13") and no
// relevance ranking — Meilisearch adds both, which starts to matter once
// the catalog and search volume are large enough that shoppers are
// searching more than browsing categories.
import { Meilisearch } from 'meilisearch';
import { Prisma } from '@prisma/client';
import { isPricePublished } from './serialize.js';
import { DISABLED_CATEGORIES_LOWER } from '../config/catalog.js';

const PRODUCTS_INDEX = 'products';

let client = null;
let indexEnsured = false;

// Frequent customer spellings and the shop's own terminology. This is kept
// deliberately small and factual: it fixes genuine aliases ("screen" means
// Display here, and the former Charging Port section is now Charging Logic)
// without turning every query into a bag of loosely-related keywords.
const SEARCH_PHRASE_ALIASES = [
  [/\b(?:charging|charger|charge)\s+port\b/gi, 'charging logic'],
  [/\bone\s+plus\b/gi, 'oneplus'],
  [/\bback\s+cover\b/gi, 'back glass'],
  [/\bsim\s+(?:holder|slot)\b/gi, 'sim tray'],
];

const SEARCH_WORD_ALIASES = new Map([
  ['screen', 'display'], ['disply', 'display'], ['diplay', 'display'], ['dispaly', 'display'],
  ['samsang', 'samsung'], ['samung', 'samsung'], ['sumsung', 'samsung'],
  ['xiomi', 'xiaomi'], ['xaomi', 'xiaomi'], ['xiaome', 'xiaomi'],
  ['realmi', 'realme'], ['oppoo', 'oppo'], ['infinx', 'infinix'],
  ['camara', 'camera'], ['spekar', 'speaker'], ['loudspekar', 'loudspeaker'],
  ['chrging', 'charging'], ['chargng', 'charging'], ['logik', 'logic'],
]);

export function normalizeSearchQuery(value) {
  let query = String(value || '').trim().replace(/\s+/g, ' ');
  for (const [pattern, replacement] of SEARCH_PHRASE_ALIASES) query = query.replace(pattern, replacement);
  return query.split(' ').map((word) => SEARCH_WORD_ALIASES.get(word.toLowerCase()) || word).join(' ');
}

function isConfigured() {
  return Boolean(process.env.MEILISEARCH_HOST);
}

function getClient() {
  if (!isConfigured()) return null;
  if (!client) {
    client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_API_KEY || undefined,
    });
  }
  return client;
}

// Configures the index's searchable/filterable/sortable attributes. Cheap
// and idempotent (Meilisearch no-ops if settings already match), so this
// just runs once per process on first use rather than needing a separate
// setup step — the same "self-configuring on first real use" shape as
// fs.mkdirSync(UPLOAD_DIR) in utils/upload.js.
async function ensureIndexConfigured() {
  if (indexEnsured) return;
  const c = getClient();
  if (!c) return;
  const index = c.index(PRODUCTS_INDEX);
  await index.updateSettings({
    // What a search term matches against. `sku`/`brand` weighted in too so
    // "NT-DIS-IP13" or "Apple" as a search term still finds the right rows,
    // same fields buildProductWhere's OR clause already covers.
    searchableAttributes: ['name', 'desc', 'sku', 'brand', 'compatibleModels'],
    // What the storefront can narrow results by alongside a search term —
    // mirrors buildProductWhere's category/brand/status handling exactly,
    // so switching a route from Postgres to Meilisearch never changes what
    // "category=Display" or "brand=Apple" means.
    filterableAttributes: ['category', 'categories', 'brand', 'published', 'stock'],
    sortableAttributes: ['price', 'rating', 'createdAt'],
  });
  indexEnsured = true;
}

// Only a published price goes into the index (it's sortable there) — a
// hidden draft price must not influence anything a customer can see.
function publicPrice(product) {
  return isPricePublished(product) ? product.price : null;
}

// Upserts one product into the search index — call after create/update.
// Fire-and-forget at every call site (see admin.routes.js): a Meilisearch
// hiccup must never fail the actual product write, which already succeeded
// against Postgres, the real source of truth.
export async function indexProduct(product) {
  const c = getClient();
  if (!c) return;
  await ensureIndexConfigured();
  // Meilisearch documents are plain JSON — Json columns (categories,
  // compatibleModels) come through from Prisma already as parsed
  // arrays/objects, no extra serialization needed.
  await c.index(PRODUCTS_INDEX).addDocuments([
    {
      id: product.id,
      name: product.name,
      desc: product.desc,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      categories: Array.isArray(product.categories) ? product.categories : [product.category],
      compatibleModels: Array.isArray(product.compatibleModels) ? product.compatibleModels.join(' ') : '',
      price: publicPrice(product),
      rating: product.rating,
      stock: product.stock,
      published: product.published,
      createdAt: product.createdAt instanceof Date ? product.createdAt.getTime() : product.createdAt,
    },
  ]);
}

// Removes a product from the index — call after delete.
export async function deleteProductFromIndex(id) {
  const c = getClient();
  if (!c) return;
  await c.index(PRODUCTS_INDEX).deleteDocument(id);
}

// Bulk upsert — used by the initial backfill script and bulk import, where
// indexing one row at a time would mean one HTTP round-trip per row against
// the search server on top of the one already happening against Postgres.
export async function indexProducts(products) {
  const c = getClient();
  if (!c || products.length === 0) return;
  await ensureIndexConfigured();
  const docs = products.map((product) => ({
    id: product.id,
    name: product.name,
    desc: product.desc,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    categories: Array.isArray(product.categories) ? product.categories : [product.category],
    compatibleModels: Array.isArray(product.compatibleModels) ? product.compatibleModels.join(' ') : '',
    price: publicPrice(product),
    rating: product.rating,
    stock: product.stock,
    published: product.published,
    createdAt: product.createdAt instanceof Date ? product.createdAt.getTime() : product.createdAt,
  }));
  // Meilisearch batches internally, but a single request stays reasonably
  // sized (matches the BATCH_SIZE already used for the DB side in
  // admin.routes.js's bulk import) rather than shipping 5,000 documents in
  // one HTTP body.
  const CHUNK = 500;
  for (let i = 0; i < docs.length; i += CHUNK) {
    await c.index(PRODUCTS_INDEX).addDocuments(docs.slice(i, i + CHUNK));
  }
}

// Runs an actual search against Meilisearch and returns just the matching
// ids + total count, in relevance order — the caller (products.routes.js)
// still re-fetches the full rows from Postgres by those ids, so pricing,
// dealer-viewer logic, and every other field always comes from the same
// single source of truth (Postgres) that the rest of the app already
// trusts; Meilisearch's only job is deciding *which* ids and in *what
// order*, never serving product data directly to a customer.
export async function searchProductIds({ query, category, brand, page = 1, limit = 12, sort }) {
  const c = getClient();
  if (!c) return null; // signals "not configured" — caller falls back to Postgres
  await ensureIndexConfigured();

  const filters = ['published = true'];
  if (category && category !== 'All') filters.push(`categories = "${category.replace(/"/g, '\\"')}"`);
  if (brand && brand !== 'All') filters.push(`brand = "${brand.replace(/"/g, '\\"')}"`);

  const sortMap = {
    'price-asc': ['price:asc'],
    'price-desc': ['price:desc'],
    rating: ['rating:desc'],
  };

  const result = await c.index(PRODUCTS_INDEX).search(query || '', {
    filter: filters.join(' AND '),
    sort: sortMap[sort] || undefined, // omitted = Meilisearch's own relevance ranking, which is what we want for an actual search term
    offset: (page - 1) * limit,
    limit,
  });

  return {
    ids: result.hits.map((h) => h.id),
    total: result.estimatedTotalHits,
  };
}

// Built-in typo-tolerant fallback for deployments without Meilisearch.
// pg_trgm is already installed and indexed by the product-search migration.
// This only runs after the normal exact/index-backed query returns zero rows,
// so correctly-spelled searches stay on the cheapest path. The returned ids
// are re-fetched through Prisma by the route, exactly like Meilisearch ids.
export async function searchProductIdsPostgres({ prisma, query, category, brand, page = 1, limit = 12 }) {
  const normalized = normalizeSearchQuery(query).toLowerCase();
  if (normalized.length < 3) return { ids: [], total: 0, normalizedQuery: normalized };

  // Longer/multi-word searches retain a useful aggregate trigram score even
  // with two small mistakes; short strings need a stricter threshold to avoid
  // unrelated models flooding the results.
  const threshold = normalized.length <= 4 ? 0.38 : normalized.length <= 7 ? 0.28 : 0.2;
  const filters = [
    Prisma.sql`published = true`,
    Prisma.sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))`,
  ];
  if (category && category !== 'All') {
    filters.push(Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = lower(${String(category)}))`);
  }
  if (brand && brand !== 'All') filters.push(Prisma.sql`lower(brand) = lower(${String(brand)})`);

  const score = Prisma.sql`GREATEST(
    similarity(lower(name), ${normalized}),
    word_similarity(${normalized}, lower(name)),
    similarity(lower(sku), ${normalized}),
    similarity(lower(brand), ${normalized})
  )`;
  const where = Prisma.sql`${Prisma.join(filters, ' AND ')} AND ${score} >= ${threshold}`;
  const offset = (page - 1) * limit;

  const [hits, countRows] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT id, ${score} AS score
      FROM "Product"
      WHERE ${where}
      ORDER BY score DESC, "viewCount" DESC, "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    prisma.$queryRaw(Prisma.sql`SELECT count(*)::int AS total FROM "Product" WHERE ${where}`),
  ]);

  return { ids: hits.map((row) => row.id), total: countRows[0]?.total || 0, normalizedQuery: normalized };
}

export { isConfigured as isSearchEngineEnabled };
