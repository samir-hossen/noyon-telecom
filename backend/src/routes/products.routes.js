import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { serializeProduct, serializeReview, withViewerPricing } from '../utils/serialize.js';
import { upload, storeUploadedFile } from '../utils/upload.js';
import { buildProductWhere, buildProductOrderBy, parsePagination, getActiveCategories, getActiveBrands } from '../utils/productQuery.js';
import { setProductCacheControl } from '../utils/cacheControl.js';
import { getOrSet, invalidateProductCache } from '../utils/cache.js';
import { searchProductIds, isSearchEngineEnabled } from '../utils/search.js';

const router = Router();

// Wholesale mobile phone spare-parts taxonomy. Kept as a flat list here;
// the storefront mega-menu (Phase 2) groups these visually.
export const ALL_CATEGORIES = [
  'Display', 'OLED', 'LCD', 'Touch', 'Battery', 'Back Glass', 'Housing', 'Frame',
  'Camera', 'Charging Port', 'Speaker', 'Microphone', 'Flex', 'Logic Board',
  'Motherboard', 'IC', 'CPU', 'Buttons', 'SIM Tray', 'Fingerprint', 'Face ID',
  'Repair Tools', 'Accessories',
];

const ALL_BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola'];

// Powers the homepage's five product rails in ONE round trip, with each
// section computed in the database instead of the frontend fetching the
// entire catalog and slicing it in JS. That client-side-slice approach
// (the previous implementation) works fine at a few hundred SKUs, but at
// 10k-100k+ products it means shipping the whole catalog to every visitor
// on every homepage load — a correctness and performance problem, not just
// a slow one. Each section here is a small, indexed/limited query instead.
router.get('/home-sections', optionalAuth, async (req, res, next) => {
  try {
    setProductCacheControl(req, res);
    const take = 8; // covers both the 4-up rails and latestImports' 4:8 slice
    // Cache-aside on the raw DB rows only — never on the final response.
    // These four queries return the exact same rows for every visitor
    // (dealer pricing is applied per-request below, after this cache read),
    // so caching here can never leak one dealer's price into another
    // visitor's response. 90s balances "homepage feels current" against
    // "don't re-run 4 queries for every single hit" — see utils/cache.js
    // for the invalidation story (admin edits clear this immediately;
    // checkout deliberately doesn't, by design).
    const [featuredRows, newArrivalRows, bestSellerRows, dealRows] = await getOrSet(
      'products:home-sections',
      90,
      () =>
        Promise.all([
          prisma.product.findMany({ where: { stock: { gt: 0 }, published: true }, orderBy: { price: 'desc' }, take: 4 }),
          prisma.product.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' }, take }),
          prisma.product.findMany({ where: { reviewCount: { gt: 0 }, published: true }, orderBy: { rating: 'desc' }, take: 4 }),
          // compareAt > price can't be expressed as a plain Prisma `where` filter
          // (it compares two columns on the same row), so this one query stays
          // raw SQL — same pattern already used for the admin analytics
          // top-products query. Nothing here is user input, so there's no
          // injection surface. See DEPLOYMENT.md for the recommended partial
          // index once the catalog grows large.
          prisma.$queryRaw`
        SELECT * FROM "Product"
        WHERE "compareAt" IS NOT NULL AND "compareAt" > price AND stock > 0 AND published = true
        ORDER BY ("compareAt" - price) / "compareAt" DESC
        LIMIT 6
      `,
        ])
    );

    const pack = (rows) => rows.map((p) => withViewerPricing(serializeProduct(p), req.user));
    res.json({
      featured: pack(featuredRows),
      newArrivals: pack(newArrivalRows.slice(0, 4)),
      latestImports: pack(newArrivalRows.slice(4, 8)),
      bestSellers: pack(bestSellerRows),
      deals: pack(dealRows),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    setProductCacheControl(req, res);
    const searchTerm = (req.query.search || '').toString().trim();
    const sort = (req.query.sort || '').toString();
    const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 12 });

    // A real search term (someone typed something, not just browsing a
    // category) is exactly the case Meilisearch earns its keep for —
    // typo-tolerance and relevance ranking that Postgres `contains`
    // matching can't do. Falls straight through to the unchanged Postgres
    // path below whenever there's no search term, or MEILISEARCH_HOST
    // isn't configured — see utils/search.js. This route's response shape
    // never changes either way, so the frontend needs no changes at all.
    if (searchTerm && isSearchEngineEnabled()) {
      const searchResult = await searchProductIds({
        query: searchTerm,
        category: req.query.category,
        brand: req.query.brand,
        page,
        limit,
        sort,
      });
      if (searchResult) {
        const { ids, total } = searchResult;
        const rowsById = new Map((await prisma.product.findMany({ where: { id: { in: ids } } })).map((p) => [p.id, p]));
        // Meilisearch decided the order (relevance, or an explicit sort);
        // Prisma's `id IN (...)` doesn't preserve that order on its own, so
        // the rows are re-assembled in the order Meilisearch returned.
        // `.filter(Boolean)` drops any id that's been deleted from Postgres
        // but not yet removed from the search index (a brief window right
        // after a delete, not a correctness risk to what's shown).
        const rows = ids.map((id) => rowsById.get(id)).filter(Boolean);
        return res.json({
          products: rows.map((p) => withViewerPricing(serializeProduct(p), req.user)),
          categories: await getOrSet('products:active-categories', 45, () => getActiveCategories(prisma, ALL_CATEGORIES)),
          brands: await getOrSet('products:active-brands', 45, () => getActiveBrands(prisma, ALL_BRANDS)),
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        });
      }
    }

    const where = buildProductWhere({
      category: req.query.category,
      brand: req.query.brand,
      search: searchTerm,
      status: 'published', // storefront only ever shows published products
    });
    const orderBy = buildProductOrderBy(sort);

    // Same cache-aside approach as /home-sections: `where`/`orderBy`/
    // `skip`/`take` are always identical for two visitors browsing the same
    // category/brand/search/sort/page combination (status is hardcoded
    // 'published' above, not viewer-dependent), so the raw rows+count are
    // safe to share across requests. A search box being typed into
    // one keystroke at a time (see Shop.jsx's debounce) means the same
    // handful of query combinations get hit repeatedly within seconds of
    // each other — exactly the case this avoids re-querying for.
    const cacheKey = `products:list:${JSON.stringify({ where, orderBy, skip, take })}`;
    const [rows, total] = await getOrSet(cacheKey, 45, () =>
      Promise.all([prisma.product.findMany({ where, orderBy, skip, take }), prisma.product.count({ where })])
    );

    res.json({
      products: rows.map((p) => withViewerPricing(serializeProduct(p), req.user)),
      categories: await getOrSet('products:active-categories', 45, () => getActiveCategories(prisma, ALL_CATEGORIES)),
      brands: ALL_BRANDS,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    setProductCacheControl(req, res);
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    // A draft (not-yet-priced) product is invisible to everyone except an
    // admin previewing it — same 404 as a nonexistent product, so a direct
    // link to a draft doesn't leak that it exists or reveal a placeholder price.
    if (!product.published && req.user?.role !== 'admin') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product: withViewerPricing(serializeProduct(product), req.user) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    // Fully public, never personalized (no auth on this route at all —
    // same review list for every visitor), so an unconditional short
    // public cache is safe here without any of the Vary/no-store handling
    // the pricing-bearing routes above need.
    res.set('Cache-Control', 'public, max-age=60');
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reviews: reviews.map(serializeReview) });
  } catch (err) {
    next(err);
  }
});

// Any signed-in customer can upload photos for their own review (this is
// intentionally NOT admin-only, unlike /admin/upload-multiple). Capped at 4
// files here — separately from multer's global 8-file limit in upload.js —
// since a handful of photos is plenty to prove "yes, this is the part I
// received" without turning a review into a product photoshoot.
router.post('/reviews/upload-images', requireAuth, requireCsrf, upload.array('images', 4), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });
    const urls = await Promise.all(req.files.map(storeUploadedFile));
    res.json({ urls });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reviews', requireAuth, requireCsrf, async (req, res, next) => {
  try {
    const { rating, comment, images } = req.body;
    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5 || !comment || !comment.trim()) {
      return res.status(400).json({ error: 'Please provide a rating (1-5) and a comment.' });
    }
    // Images are uploaded separately (via /reviews/upload-images) and only
    // their resulting URLs are sent here — trust the shape, not the source,
    // so a handful of bad strings can't corrupt the JSON column.
    const imageUrls = Array.isArray(images)
      ? images.filter((u) => typeof u === 'string' && u.trim()).slice(0, 4)
      : [];

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Only verified purchasers may review — the customer must have at least
    // one order containing this product that has actually been paid for or
    // fulfilled (not just "processing", which includes unpaid COD orders
    // that haven't shipped yet, or carts that never completed checkout).
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: { userId: req.user.id, status: { in: ['paid', 'shipped', 'delivered'] } },
      },
    });
    if (!purchase) {
      return res.status(403).json({ error: 'Only customers who have purchased this product can leave a review.' });
    }

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: product.id, userId: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this product.' });
    }

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: req.user.id,
        userName: req.user.name,
        rating: ratingNum,
        comment: comment.trim(),
        images: imageUrls,
      },
    });

    // Recompute the product's aggregate rating from every review, rather
    // than an incremental running average — simpler to reason about and
    // cheap enough at this scale.
    const agg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { rating: agg._avg.rating || 0, reviewCount: agg._count },
    });
    // A changed rating can reorder bestSellers on the homepage (sorted by
    // rating) — clear the cache so the next visitor sees it, rather than
    // waiting out the TTL.
    invalidateProductCache();

    res.status(201).json({ review: serializeReview(review), product: withViewerPricing(serializeProduct(updated), req.user) });
  } catch (err) {
    next(err);
  }
});

export default router;
