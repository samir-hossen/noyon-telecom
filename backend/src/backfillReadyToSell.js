// One-off utility: recomputes `readyToSell` (stock > 0 && price > 0) for
// every product whose stored value doesn't match what its current
// stock/price would compute to — catches rows written before this column
// existed, plus anything that changed stock/price through a path other than
// the admin create/update/import/restore routes.
//
// A single UPDATE ... WHERE statement rather than a JS loop, since this is a
// simple computed comparison Postgres can do in one pass over the whole
// table — no reason to pull every row into Node first.
//
// Self-limiting: matches zero rows once every product's readyToSell is
// already correct, so it's safe to leave running on every future boot too
// (same pattern as fixBrokenPlaceholderImages.js — Render's free tier has
// no Shell/one-off-job access).
//
// Usage:
//   cd backend
//   node src/backfillReadyToSell.js
import { pathToFileURL } from 'node:url';
import prisma from './prismaClient.js';

export async function backfillReadyToSell() {
  const result = await prisma.$executeRaw`
    UPDATE "Product"
    SET "readyToSell" = (stock > 0 AND price > 0)
    WHERE "readyToSell" != (stock > 0 AND price > 0)
  `;
  return result;
}

async function main() {
  const fixed = await backfillReadyToSell();
  console.log(`Recomputed readyToSell for ${fixed} product(s).`);
}

// Only run the CLI entrypoint when this file is executed directly, not when
// index.js imports backfillReadyToSell from it — see
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
