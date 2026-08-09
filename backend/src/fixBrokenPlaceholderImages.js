// One-off utility: clears the old hotlinked Unsplash "placeholder" image
// from any product that still has one.
//
// importDisplayPrices.js and importCompatibilityLists.js were fixed to stop
// hotlinking Unsplash (empty img/images now falls back to the frontend's
// own built-in placeholder icon — see utils/fallbackImage.js) — but that
// fix only applies to products created *after* the change. Products
// imported before it still point at the old Unsplash URL, which now 404s
// (the photo was taken down/rotated on Unsplash's side), so the browser
// blocks the broken response (net::ERR_BLOCKED_BY_ORB) and shows a broken-
// image icon on every affected product card.
//
// Only touches rows whose img/images still reference images.unsplash.com —
// never touches a real photo (Cloudinary URL or /uploads/... path) an
// admin has already set by hand.
//
// Usage:
//   cd backend
//   npm run fix:broken-images
import 'dotenv/config';
import prisma from './prismaClient.js';

async function main() {
  const candidates = await prisma.product.findMany({
    where: { img: { contains: 'images.unsplash.com' } },
    select: { id: true, sku: true, images: true },
  });

  let fixed = 0;
  for (const p of candidates) {
    const images = (p.images || []).filter((url) => !url.includes('images.unsplash.com'));
    await prisma.product.update({
      where: { id: p.id },
      data: { img: '', images },
    });
    fixed += 1;
  }

  console.log(`Cleared broken Unsplash placeholder from ${fixed} product(s).`);
  if (fixed > 0) {
    console.log('These now show the frontend\'s built-in placeholder icon instead of a broken image — add real photos via Admin when ready.');
  }
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
