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
import { queueProductUrlsForIndexNow } from './indexNow.js';

const PRODUCTS_INDEX = 'products';

let client = null;
let indexEnsured = false;

// Frequent customer spellings and the shop's own terminology. This is kept
// deliberately small and factual: it fixes genuine aliases ("screen" means
// Display here, and the former Charging Port section is now Charging Logic)
// without turning every query into a bag of loosely-related keywords.
const SEARCH_PHRASE_ALIASES = [
  [/\b(?:charging|charger|charge)\s+(?:port|board|connector|dock|sub\s*board)\b/gi, 'charging logic'],
  [/\bone\s+plus\b/gi, 'oneplus'],
  [/\bback\s+cover\b/gi, 'back glass'],
  [/\bsim\s+(?:holder|slot)\b/gi, 'sim tray'],
  [/চার্জিং\s+(?:পোর্ট|বোর্ড|লজিক)/gu, 'charging logic'],
  [/ব্যাক\s+(?:কভার|গ্লাস)/gu, 'back glass'],
  [/সিম\s+(?:হোল্ডার|স্লট|ট্রে)/gu, 'sim tray'],
];

const SEARCH_WORD_ALIASES = new Map([
  ['screen', 'display'], ['disple', 'display'], ['disply', 'display'], ['diplay', 'display'], ['dispaly', 'display'],
  ['samsang', 'samsung'], ['samung', 'samsung'], ['sumsung', 'samsung'],
  ['xiomi', 'xiaomi'], ['xaomi', 'xiaomi'], ['xiaome', 'xiaomi'],
  ['realmi', 'realme'], ['oppoo', 'oppo'], ['infinx', 'infinix'],
  ['camara', 'camera'], ['camra', 'camera'], ['spekar', 'speaker'], ['spikar', 'speaker'], ['loudspekar', 'loudspeaker'],
  ['chrging', 'charging'], ['chargng', 'charging'], ['chargin', 'charging'], ['charjing', 'charging'],
  ['logik', 'logic'], ['lojic', 'logic'], ['lojik', 'logic'],
  ['ডিসপ্লে', 'display'], ['স্ক্রিন', 'display'], ['এলসিডি', 'lcd'], ['ওএলইডি', 'oled'], ['ওলেড', 'oled'],
  ['টাচ', 'touch'], ['ক্যামেরা', 'camera'], ['স্পিকার', 'speaker'], ['মাইক', 'microphone'], ['মাইক্রোফোন', 'microphone'],
  ['চার্জিং', 'charging'], ['লজিক', 'logic'], ['ব্যাক', 'back'], ['গ্লাস', 'glass'], ['ফ্রেম', 'frame'], ['ফ্লেক্স', 'flex'],
  ['মাদারবোর্ড', 'motherboard'], ['আইসি', 'ic'], ['সিপিইউ', 'cpu'], ['সিম', 'sim'], ['ট্রে', 'tray'],
  ['ফিঙ্গারপ্রিন্ট', 'fingerprint'], ['স্যামসাং', 'samsung'], ['আইফোন', 'iphone'], ['অ্যাপল', 'apple'],
  ['শাওমি', 'xiaomi'], ['জিয়াওমি', 'xiaomi'], ['ভিভো', 'vivo'], ['অপো', 'oppo'], ['রিয়েলমি', 'realme'], ['রিয়েলমি', 'realme'],
]);

// Customers often paste a natural Google-style query into the store search
// ("Samsung A15 display price in Bangladesh"). These words express intent,
// not a model or part, so requiring every one of them to occur in a product
// name creates a false zero-result and sends the query to the broader fuzzy
// fallback. Remove them only when a real brand/model/part token remains — a
// query containing just "mobile" or "price" is left alone rather than being
// turned into an empty query that would list the whole catalogue.
const SEARCH_FILLER_WORDS = new Set([
  'for', 'price', 'prices', 'in', 'bangladesh', 'bd', 'mobile', 'phone', 'part', 'parts', 'buy', 'shop',
  'দাম', 'বাংলাদেশ', 'বাংলাদেশে', 'মোবাইল', 'মোবাইলের', 'পার্ট', 'পার্টস', 'জন্য', 'কিনতে', 'কোথায়', 'কোথায়',
]);

// Correct one-character omissions, insertions and adjacent transpositions
// only against a small, factual vocabulary of brands and part names. This
// rescues queries such as "ihpone 13 disply" and "opoo a16 charjing" while
// leaving model codes (A15, C61, 13 Pro Max...) completely untouched. A
// broad spell-checker would be dangerous here because phone model names are
// often valid words/codes that are absent from a normal dictionary.
const SEARCH_AUTOCORRECT_VOCABULARY = [
  'apple', 'google', 'honor', 'huawei', 'infinix', 'iphone', 'itel', 'motorola', 'nokia', 'nothing', 'oneplus', 'oppo',
  'pixel', 'realme', 'samsung', 'sony', 'tecno', 'vivo', 'xiaomi',
  'back', 'camera', 'charging', 'display', 'fingerprint', 'flex', 'frame', 'glass', 'lcd', 'logic', 'loudspeaker',
  'microphone', 'motherboard', 'oled', 'sim', 'speaker', 'tray',
];

function damerauLevenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }
  return matrix[a.length][b.length];
}

function autocorrectSearchWord(word) {
  const lower = word.toLowerCase();
  if (!/^[a-z]{4,24}$/.test(lower) || SEARCH_FILLER_WORDS.has(lower) || SEARCH_AUTOCORRECT_VOCABULARY.includes(lower)) return word;
  const maxDistance = lower.length >= 8 ? 2 : 1;
  let match = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of SEARCH_AUTOCORRECT_VOCABULARY) {
    if (Math.abs(candidate.length - lower.length) > maxDistance) continue;
    const distance = damerauLevenshtein(lower, candidate);
    if (distance < bestDistance) {
      match = candidate;
      bestDistance = distance;
    } else if (distance === bestDistance) {
      // An ambiguous correction is worse than no correction.
      match = null;
    }
  }
  return bestDistance <= maxDistance ? (match || word) : word;
}

export function normalizeSearchQuery(value) {
  // Bound work per keystroke, normalize Bengali model digits and punctuation,
  // and preserve alphanumeric model codes (A15 must never become A16).
  let query = String(value || '').slice(0, 200).normalize('NFKC')
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
    .replace(/([\p{L}\p{N}])\s*\+/gu, '$1 plus ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  for (const [pattern, replacement] of SEARCH_PHRASE_ALIASES) query = query.replace(pattern, replacement);
  let words = query.split(' ').map((word) => autocorrectSearchWord(SEARCH_WORD_ALIASES.get(word.toLowerCase()) || word));
  // A typo may have hidden a phrase alias during the first pass (for
  // example "charjing port"). Run the factual phrase map once more after
  // individual words have been corrected.
  query = words.join(' ');
  for (const [pattern, replacement] of SEARCH_PHRASE_ALIASES) query = query.replace(pattern, replacement);
  words = query.split(' ');
  const substantiveWords = words.filter((word) => !SEARCH_FILLER_WORDS.has(word.toLowerCase()));
  return (substantiveWords.length ? substantiveWords : words).slice(0, 12).join(' ');
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
    typoTolerance: { disableOnNumbers: true },
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
  queueProductUrlsForIndexNow([product]);
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
export async function deleteProductFromIndex(id, product = null) {
  if (product) queueProductUrlsForIndexNow([product]);
  const c = getClient();
  if (!c) return;
  await c.index(PRODUCTS_INDEX).deleteDocument(id);
}

// Bulk upsert — used by the initial backfill script and bulk import, where
// indexing one row at a time would mean one HTTP round-trip per row against
// the search server on top of the one already happening against Postgres.
export async function indexProducts(products) {
  queueProductUrlsForIndexNow(products);
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
    matchingStrategy: 'all',
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

  const words = [...new Set(normalized.split(' ').filter(Boolean))];
  const filters = [
    Prisma.sql`published = true`,
    Prisma.sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))`,
  ];
  if (category && category !== 'All') {
    filters.push(Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = lower(${String(category)}))`);
  }
  if (brand && brand !== 'All') filters.push(Prisma.sql`lower(brand) = lower(${String(brand)})`);

  // A high whole-query similarity can hide a completely wrong model or part.
  // Require EVERY word to match. Model codes/numbers and known part/brand
  // words must be exact tokens; only unknown alphabetic words get a bounded
  // per-word trigram fallback. Never fuzzy-match A999 to A99 or 13 to 14.
  const productWords = Prisma.sql`lower(concat_ws(' ', name, sku, brand))`;
  for (const word of words) {
    const boundary = `(^|[^[:alnum:]])${word}([^[:alnum:]]|$)`;
    const exact = Prisma.sql`${productWords} ~ ${boundary}`;
    if (/\d/.test(word) || word.length < 4 || ['plus', 'pro', 'max', 'ultra', 'mini', 'lite', 'note'].includes(word) || SEARCH_AUTOCORRECT_VOCABULARY.includes(word)) {
      filters.push(exact);
    } else {
      filters.push(Prisma.sql`(${exact} OR EXISTS (
        SELECT 1 FROM regexp_split_to_table(${productWords}, '[^[:alnum:]]+') AS token
        WHERE abs(length(token) - ${word.length}) <= ${word.length >= 8 ? 2 : 1}
          AND similarity(token, ${word}) >= ${word.length >= 8 ? 0.5 : 0.45}
      ))`);
    }
  }

  const score = Prisma.sql`GREATEST(
    similarity(lower(name), ${normalized}),
    word_similarity(${normalized}, lower(name)),
    similarity(lower(sku), ${normalized}),
    similarity(lower(brand), ${normalized})
  )`;
  const where = Prisma.sql`${Prisma.join(filters, ' AND ')}`;
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
