// One-off utility: assigns a URL slug (e.g. "y03t-oled-display") to every
// product that doesn't have one yet — pre-existing rows from before the
// `slug` column was added, plus anything created by a path that doesn't
// assign one itself (bulk import, backup restore).
//
// Self-limiting: matches zero rows once every product already has a slug,
// so it's safe to leave running on every future boot too (same pattern as
// fixBrokenPlaceholderImages.js — Render's free tier has no Shell/one-off-job
// access, so a startup self-heal is how a one-time data fix gets applied).
//
// Usage:
//   cd backend
//   node src/backfillProductSlugs.js
import { pathToFileURL } from 'node:url';
import prisma from './prismaClient.js';
import { uniqueSlugFromSet } from './utils/slug.js';

export async function backfillProductSlugs() {
  const needsSlug = await prisma.product.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  });
  if (needsSlug.length === 0) return 0;

  const taken = await prisma.product.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  });
  const existingSlugs = new Set(taken.map((p) => p.slug));

  let fixed = 0;
  for (const p of needsSlug) {
    const slug = uniqueSlugFromSet(p.name, existingSlugs);
    existingSlugs.add(slug);
    // Raw SQL rather than prisma.product.update() — Prisma's `@updatedAt`
    // silently bumps `updatedAt` to "now" on any Client-API update unless
    // you explicitly override it, which previously made every backfilled
    // product's sitemap lastmod jump to this script's run time instead of
    // its real last content change. Raw SQL touches only the column named.
    await prisma.$executeRaw`UPDATE "Product" SET "slug" = ${slug} WHERE "id" = ${p.id}`;
    fixed += 1;
  }

  return fixed;
}

async function main() {
  const fixed = await backfillProductSlugs();
  console.log(`Assigned a URL slug to ${fixed} product(s).`);
}

// Only run the CLI entrypoint when this file is executed directly, not when
// index.js imports backfillProductSlugs from it — see
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
