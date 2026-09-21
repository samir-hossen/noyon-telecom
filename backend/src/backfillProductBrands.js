// One-off utility: fills in `brand` for any existing product that doesn't
// have one yet, when a known brand word is already spelled out in its own
// name (e.g. a product literally named "Samsung Galaxy A12 Display" that
// predates the brand column, or was bulk-imported by a path that didn't set
// it). Never guesses a brand for a bare model code — see utils/brand.js.
//
// Self-limiting: matches zero rows once nothing left has a detectable brand
// in its name, so it's safe to leave running on every future boot too (same
// pattern as fixBrokenPlaceholderImages.js/backfillProductSlugs.js —
// Render's free tier has no Shell/one-off-job access).
//
// Usage:
//   cd backend
//   node src/backfillProductBrands.js
import { pathToFileURL } from 'node:url';
import prisma from './prismaClient.js';
import { detectBrandFromText } from './utils/brand.js';

export async function backfillProductBrands() {
  const candidates = await prisma.product.findMany({
    where: { brand: null },
    select: { id: true, name: true },
  });

  let fixed = 0;
  for (const p of candidates) {
    const brand = detectBrandFromText(p.name);
    if (!brand) continue;
    // Raw SQL rather than prisma.product.update() — see backfillProductSlugs.js
    // for why: Prisma's `@updatedAt` would otherwise bump `updatedAt` to "now"
    // on every backfilled row, corrupting the sitemap's lastmod signal.
    await prisma.$executeRaw`UPDATE "Product" SET "brand" = ${brand} WHERE "id" = ${p.id}`;
    fixed += 1;
  }

  return fixed;
}

async function main() {
  const fixed = await backfillProductBrands();
  console.log(`Assigned a brand to ${fixed} product(s) from their existing name.`);
}

// Only run the CLI entrypoint when this file is executed directly, not when
// index.js imports backfillProductBrands from it — see
// fixBrokenPlaceholderImages.js for why pathToFileURL is needed here instead
// of a plain string comparison.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
  main()
    .catch((err) => {
      console.error('Failed:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
