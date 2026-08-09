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
import { pathToFileURL } from 'node:url';
import prisma from './prismaClient.js';

// Exported so index.js can also run this once at boot for deployments where
// a one-off Shell/job isn't available (Render's free tier doesn't include
// Shell access) — safe to call on every boot since it's a no-op once every
// matching row has already been cleared.
export async function fixBrokenPlaceholderImages() {
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

  return fixed;
}

async function main() {
  const fixed = await fixBrokenPlaceholderImages();
  console.log(`Cleared broken Unsplash placeholder from ${fixed} product(s).`);
  if (fixed > 0) {
    console.log('These now show the frontend\'s built-in placeholder icon instead of a broken image — add real photos via Admin when ready.');
  }
}

// Only run the CLI entrypoint when this file is executed directly
// (`node src/fixBrokenPlaceholderImages.js`), not when index.js imports
// fixBrokenPlaceholderImages from it. process.argv[1] isn't guaranteed to
// be an absolute path (depends on how node was invoked), so it has to go
// through pathToFileURL rather than a plain string comparison against
// import.meta.url — a plain `file://${process.argv[1]}` comparison silently
// never matches when invoked with a relative path like `node src/foo.js`.
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
