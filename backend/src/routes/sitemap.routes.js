import { Router } from 'express';
import prisma from '../prismaClient.js';
import { getOrSet } from '../utils/cache.js';

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
// /api/sitemap-products.xml below is served by THIS backend, not the
// frontend — it needs the backend's own public URL, not SITE_URL (which
// points at the frontend). Using SITE_URL here previously made the sitemap
// index advertise a URL that 404s (the frontend static host has no /api
// route at all), which Search Console would only surface weeks later as a
// failed sitemap fetch. Same env var payment.routes.js already uses for
// this backend's own public URL.
const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Single entry point for search engines / Search Console: merges the static
// core-pages sitemap (served from the frontend's /public) with the dynamic,
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
    <loc>${SITE_URL}/sitemap.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${API_URL}/api/sitemap-products.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>`);
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
