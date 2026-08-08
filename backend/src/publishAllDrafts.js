// One-off utility: flips every currently-unpublished product to published.
// Useful if you already ran an older version of the import scripts (when
// they created drafts) and don't want to re-run the whole import just to
// make them visible — this just flips the flag on whatever's already there.
//
// Usage:
//   cd backend
//   npm run publish:all-drafts
import 'dotenv/config';
import prisma from './prismaClient.js';

async function main() {
  const result = await prisma.product.updateMany({
    where: { published: false },
    data: { published: true },
  });
  console.log(`Published ${result.count} previously-draft product(s).`);
  if (result.count > 0) {
    console.log('Reminder: any of these still at ৳0 price are visible but not purchasable (stock 0) until priced.');
  }
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
