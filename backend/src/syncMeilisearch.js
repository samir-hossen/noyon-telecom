// One-off utility: pushes every product currently in Postgres into the
// Meilisearch search index. Needed once when you first point
// MEILISEARCH_HOST at a fresh instance (an empty index has nothing to
// search until this runs), and safe to re-run any time — every write here
// is an upsert (addDocuments), so re-running just re-syncs, never
// duplicates. Also the right move after rebuilding a Meilisearch instance
// from scratch (e.g. moved hosting, lost a volume) since Postgres, not
// Meilisearch, is the source of truth for product data — see
// utils/search.js.
//
// No-ops with a clear message if MEILISEARCH_HOST isn't set, same as every
// other optional-service script in this codebase.
//
// Usage:
//   cd backend
//   npm run sync:search
import 'dotenv/config';
import prisma from './prismaClient.js';
import { indexProducts, isSearchEngineEnabled } from './utils/search.js';

async function main() {
  if (!isSearchEngineEnabled()) {
    console.log('MEILISEARCH_HOST is not set — nothing to sync. See backend/.env.example.');
    return;
  }

  const products = await prisma.product.findMany();
  if (products.length === 0) {
    console.log('No products in the database yet — nothing to sync.');
    return;
  }

  await indexProducts(products);
  console.log(`Synced ${products.length} product(s) to the Meilisearch index.`);
}

main()
  .catch((err) => {
    console.error('Search sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
