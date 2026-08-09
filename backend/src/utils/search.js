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

const PRODUCTS_INDEX = 'products';

let client = null;
let indexEnsured = false;

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
      price: product.price,
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
    price: product.price,
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

export { isConfigured as isSearchEngineEnabled };
