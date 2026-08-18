import { Router } from 'express';
import prisma from '../prismaClient.js';
import { getOrSet } from '../utils/cache.js';
import { getActiveCategories, getActiveBrands } from '../utils/productQuery.js';
import { ALL_CATEGORIES, ALL_BRANDS } from './products.routes.js';

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
// /api/sitemap-pages.xml and /api/sitemap-products.xml below are served by
// THIS backend, not the frontend — they need the backend's own public URL.
// (A same-origin proxy through the frontend's _redirects was tried and
// reverted — Render's static-site _redirects doesn't actually proxy to an
// external absolute URL despite matching Netlify's documented syntax; it
// silently fell through to the SPA catch-all instead, serving index.html
// in place of the XML. See the API-domain Search Console property instead
// for submitting this sitemap without hitting the cross-origin submission
// box issue.)
const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Single entry point for search engines / Search Console: merges the
// dynamic pages sitemap (home/static/category/brand URLs) with the dynamic,
// always-current product sitemap below into one <sitemapindex>, so nobody
// has to remember to submit two separate URLs.
router.get('/sitemap-index.xml', (req, res) => {
  const lastmod = new Date().toISOString();
  res.set('Content-Type', 'application/xml');
  // Fully public, crawler-facing, never personalized — safe to cache
  // unconditionally. 5 minutes is conservative enough that a fresh
  // product/catalog change is still reflected quickly, while sparing a
  // repeat-crawl request from regenerating this on every hit.
  res.set('Cache-Control', 'public, max-age=300');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${API_URL}/api/sitemap-pages.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${API_URL}/api/sitemap-products.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`);
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
export function buildPagesSitemapXml({ siteUrl, categories, brands }) {
  const entries = [
    { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${siteUrl}/shop`, priority: '0.9', changefreq: 'daily' },
    ...categories.map((c) => ({ loc: `${siteUrl}/shop?category=${encodeURIComponent(c)}`, priority: '0.7' })),
    ...brands.map((b) => ({ loc: `${siteUrl}/shop?brand=${encodeURIComponent(b)}`, priority: '0.6' })),
    { loc: `${siteUrl}/about`, priority: '0.6' },
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
    <loc>${escapeXml(e.loc)}</loc>
    <priority>${e.priority}</priority>${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ''}
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

router.get('/sitemap-pages.xml', async (req, res, next) => {
  try {
    // Same public/unpersonalized/short-cache reasoning as sitemap-products.xml
    // below — invalidateProductCache() (admin product writes) clears this
    // too, so a newly active category/brand doesn't wait out the TTL.
    res.set('Cache-Control', 'public, max-age=300');
    const xml = await getOrSet('sitemap:pages-xml', 300, async () => {
      const [categories, brands] = await Promise.all([
        getActiveCategories(prisma, ALL_CATEGORIES),
        getActiveBrands(prisma, ALL_BRANDS),
      ]);
      return buildPagesSitemapXml({ siteUrl: SITE_URL, categories, brands });
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
      const products = await prisma.product.findMany({ where: { published: true }, select: { id: true, updatedAt: true, createdAt: true } });
      const urls = products
        .map(
          (p) => `  <url>
    <loc>${SITE_URL}/product/${p.id}</loc>
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

export { escapeXml, SITE_URL };
export default router;
