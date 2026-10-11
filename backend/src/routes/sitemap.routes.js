import { Router } from 'express';
import prisma from '../prismaClient.js';
import { getOrSet } from '../utils/cache.js';
import { getActiveCategories, getActiveBrands, getActiveBrandCategoryPairs, storefrontWhere } from '../utils/productQuery.js';
import { ALL_CATEGORIES, ALL_BRANDS } from './products.routes.js';
import { productPath, slugify } from '../utils/slug.js';
import { isDisabledCategory, DISABLED_CATEGORIES_LOWER } from '../config/catalog.js';

const router = Router();
// Set SITE_URL in the backend .env to your real storefront domain in production.
// In production, a missing SITE_URL previously fell back to a placeholder
// domain (https://www.yourdomain.com) and silently shipped it to Google in
// every sitemap URL — wrong URLs in a submitted sitemap can take weeks to
// notice and re-crawl. Failing loudly at startup instead (same pattern as
// the SSLCommerz/Cloudinary "required in production" checks elsewhere) so
// this is caught in a deploy log, not discovered later in Search Console.
// Local dev keeps the harmless localhost fallback.
if (process.env.NODE_ENV === 'production' && !process.env.SITE_URL) {
  throw new Error('SITE_URL must be set in production (see backend/.env.example) — refusing to generate sitemaps with a placeholder domain.');
}
const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Newest product change in the storefront catalog (the sitemaps' lastmod).
async function latestCatalogChange() {
  const rows = await prisma.$queryRaw`
    SELECT max("updatedAt") AS at FROM "Product"
    WHERE published = true
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))`;
  return rows[0]?.at ? new Date(rows[0].at) : new Date();
}

// Single entry point for search engines / Search Console. Every sitemap is
// listed on the storefront's own domain (SITE_URL) — noyontelecom.com/sitemap-*.xml
// are rewritten to this backend by the storefront's Render rules, so Google
// sees one host (cross-host sitemaps need both hosts verified).
router.get('/sitemap-index.xml', async (req, res, next) => {
  try {
    const lastmod = (await getOrSet('sitemap:latest', 300, latestCatalogChange)).toISOString();
    res.set('Content-Type', 'application/xml');
    // Fully public, crawler-facing, never personalized — safe to cache.
    res.set('Cache-Control', 'public, max-age=300');
    const maps = ['sitemap-pages.xml', 'sitemap-products.xml', 'sitemap-models.xml'];
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((m) => `  <sitemap>
    <loc>${SITE_URL}/${m}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`);
  } catch (err) {
    next(err);
  }
});

// Homepage + the storefront's evergreen marketing pages, plus every
// category/brand that currently has at least one published product —
// computed from the live catalog via the same getActiveCategories/
// getActiveBrands helpers the Shop page's filter pills use, rather than
// hardcoded. A previous static frontend/public/sitemap.xml listed only 3 of
// the 20 real brands and needed a manual edit every time a category was
// added/retired — exactly the "static sitemap that goes outdated" problem.
// Pure and DB-free (categories/brands passed in) so it's unit-testable
// without a database — see sitemap.routes.test.js.
// Kept in sync by hand with frontend/src/content/blogPosts.js — the
// frontend and backend are separate deployable packages (no shared import
// between them), and this list only changes when a new guide is published,
// which is rare enough that a manual mirror here is simpler than wiring up
// a build-time sync for it.
// The battery guide ('original-vs-copy-battery-chenar-upay') is left out on
// purpose while the battery section is OFF — no battery URLs in the sitemap.
const BLOG_SLUGS = [
  'oled-vs-lcd-display-kena-guide',
  'charging-port-noshto-hoyar-karon',
  'mobile-servicing-business-suru-korte-parts-stock',
  'paikari-mobile-parts-kenar-age-7-bishoy',
];

export function buildPagesSitemapXml({ siteUrl, categories: allCategories, brands, brandCategoryPairs: allPairs = [], lastmod = {} }) {
  // Switched-off categories (Battery) never go in, whatever the caller passes.
  const categories = allCategories.filter((c) => !isDisabledCategory(c));
  const brandCategoryPairs = allPairs.filter((p) => !isDisabledCategory(p.category));
  // lastmod = newest product change on that page (when known).
  const at = (d) => (d ? new Date(d).toISOString() : undefined);
  const entries = [
    { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: at(lastmod.all) },
    { loc: `${siteUrl}/shop`, priority: '0.9', changefreq: 'daily', lastmod: at(lastmod.all) },
    // Clean paths, matching the frontend's canonical /category/<slug> and
    // /brand/<slug> routes (see frontend/src/utils/taxonomy.js) — these
    // replaced the old /shop?category=/?brand= query-string URLs, which
    // self-canonicalize to this same clean form now instead of being what
    // gets submitted to Google.
    ...categories.map((c) => ({ loc: `${siteUrl}/category/${slugify(c)}`, priority: '0.7', lastmod: at(lastmod.category?.get(c)) })),
    ...brands.map((b) => ({ loc: `${siteUrl}/brand/${slugify(b)}`, priority: '0.6', lastmod: at(lastmod.brand?.get(b)) })),
    // /brand/<brand>/<category> (e.g. /brand/samsung/display) — the route
    // already existed and resolves fine, it just wasn't submitted anywhere,
    // so Google had no way to discover it on its own.
    ...brandCategoryPairs.map((p) => ({ loc: `${siteUrl}/brand/${slugify(p.brand)}/${slugify(p.category)}`, priority: '0.5', lastmod: at(p.lastmod) })),
    { loc: `${siteUrl}/about`, priority: '0.6' },
    { loc: `${siteUrl}/blog`, priority: '0.7', changefreq: 'weekly' },
    ...BLOG_SLUGS.map((slug) => ({ loc: `${siteUrl}/blog/${slug}`, priority: '0.6' })),
    { loc: `${siteUrl}/request-quote`, priority: '0.6' },
    // NOT /register: robots.txt disallows it (it's the auth/signup form),
    // so listing it here would tell Google to index a URL it's also told
    // not to crawl — contradictory signals that show up in Search Console
    // as "Indexed, though blocked by robots.txt". The old static
    // frontend/public/sitemap.xml this route replaced had the same
    // register-vs-robots.txt conflict; carried over here by mistake when
    // porting it to be dynamic, caught during a later verification pass.
    { loc: `${siteUrl}/contact`, priority: '0.5' },
  ];
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <priority>${e.priority}</priority>${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ''}
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

// Newest product change per category, brand and brand + category.
async function pageLastmods() {
  const rows = await prisma.$queryRaw`
    SELECT brand, cat, max("updatedAt") AS at
    FROM "Product", jsonb_array_elements_text(categories) cat
    WHERE published = true
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))
    GROUP BY brand, cat`;
  const category = new Map();
  const brand = new Map();
  const pair = new Map();
  let all = null;
  const newer = (a, b) => (!a || b > a ? b : a);
  for (const r of rows) {
    const t = new Date(r.at);
    category.set(r.cat, newer(category.get(r.cat), t));
    if (r.brand) {
      brand.set(r.brand, newer(brand.get(r.brand), t));
      pair.set(`${r.brand}|${r.cat}`, t);
    }
    all = newer(all, t);
  }
  return { all, category, brand, pair };
}

router.get('/sitemap-pages.xml', async (req, res, next) => {
  try {
    // Same public/unpersonalized/short-cache reasoning as sitemap-products.xml
    // below — invalidateProductCache() (admin product writes) clears this
    // too, so a newly active category/brand doesn't wait out the TTL.
    res.set('Cache-Control', 'public, max-age=300');
    const xml = await getOrSet('sitemap:pages-xml', 300, async () => {
      const [categories, brands, brandCategoryPairs, lastmod] = await Promise.all([
        getActiveCategories(prisma, ALL_CATEGORIES),
        getActiveBrands(prisma, ALL_BRANDS),
        getActiveBrandCategoryPairs(prisma),
        pageLastmods(),
      ]);
      const pairs = brandCategoryPairs.map((p) => ({ ...p, lastmod: lastmod.pair.get(`${p.brand}|${p.category}`) }));
      return buildPagesSitemapXml({ siteUrl: SITE_URL, categories, brands, brandCategoryPairs: pairs, lastmod });
    });
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// Dynamically generated so it always reflects the live catalog, however many
// thousands of SKUs it grows to — a static file can't keep up at that scale.
router.get('/sitemap-products.xml', async (req, res, next) => {
  try {
    // This one actually queries the catalog (unlike the static index
    // above), so caching it briefly saves a real full-table read on
    // repeat crawler hits — still fully public/unpersonalized. Caches the
    // fully-rendered XML string itself (not just the rows) since there's no
    // per-request variation at all here — same 300s window as the
    // Cache-Control header below, and the same invalidateProductCache()
    // used by admin product writes (see admin.routes.js) clears this too,
    // so a newly-added product's URL doesn't wait out the TTL to appear.
    res.set('Cache-Control', 'public, max-age=300');
    const xml = await getOrSet('sitemap:products-xml', 300, async () => {
      const products = await prisma.product.findMany({ where: storefrontWhere(), select: { id: true, slug: true, name: true, updatedAt: true, createdAt: true } });
      const urls = products
        .map(
          (p) => `  <url>
    <loc>${SITE_URL}${productPath(p)}</loc>
    <lastmod>${new Date(p.updatedAt || p.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
        )
        .join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    });

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// Model hub pages (/model/<slug>) with at least two parts — a hub with a
// single part would just repeat that product page.
router.get('/sitemap-models.xml', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    const xml = await getOrSet('sitemap:models-xml', 300, async () => {
      const rows = await prisma.$queryRaw`
        SELECT ms AS slug, count(*)::int AS n, max("updatedAt") AS at
        FROM "Product", unnest("modelSlugs") ms
        WHERE published = true
          AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))
        GROUP BY ms HAVING count(*) >= 2 ORDER BY ms`;
      const urls = rows
        .map(
          (r) => `  <url>
    <loc>${SITE_URL}/model/${escapeXml(r.slug)}</loc>
    <lastmod>${new Date(r.at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
        )
        .join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    });
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export { escapeXml, SITE_URL };
export default router;
