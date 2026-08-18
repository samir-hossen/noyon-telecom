import { Router } from 'express';
import prisma from '../prismaClient.js';
import { escapeXml, SITE_URL } from './sitemap.routes.js';
import { getOrSet } from '../utils/cache.js';

const router = Router();

// Google Merchant Center feed spec: https://support.google.com/merchants/answer/7052112
// Wholesale note: Merchant Center is built for consumer retail pricing.
// Since this storefront's public price is the retail/MRP price (dealer
// pricing only ever applies to logged-in approved dealers), the retail
// price is what's correct to submit here — Ads/Shopping will always show
// the same price a first-time visitor sees on the site.
// Pure and DB-free (rows passed in) so it's unit-testable without a
// database — see feed.routes.test.js. Deliberately keeps out-of-stock
// products IN the feed (marked `out_of_stock`) rather than dropping them —
// a previous `stock: { gt: 0 }` filter on the query below silently excluded
// every out-of-stock product before this code ever ran, making the
// `g:availability` ternary's "out_of_stock" branch unreachable dead code.
// That meant a product selling out made it vanish from Merchant Center
// entirely instead of correctly showing as temporarily unavailable — Google
// treats a listing disappearing and reappearing as a worse signal than one
// that stays present with accurate availability.
export function buildMerchantFeedXml({ products, siteUrl }) {
  const items = products
    // g:image_link is a required field per Google's feed spec — a
    // product with no photo yet (img is '', see utils/fallbackImage.js
    // and the placeholder handling in admin.routes.js/import scripts)
    // previously fell through to `${siteUrl}${''}`, i.e. the bare
    // homepage URL submitted as the product's image. That's an invalid
    // image for Merchant Center (at best the item gets rejected; at
    // worst it's accepted with the wrong image showing in ads) — and a
    // product with no real photo isn't ready to advertise anyway, so
    // it's excluded from the feed entirely until a photo is added.
    .filter((p) => p.img)
    .map((p) => {
      const link = `${siteUrl}/product/${p.id}`;
      const image = p.img.startsWith('http') ? p.img : `${siteUrl}${p.img}`;
      return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(p.desc || p.name)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${p.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${p.price.toFixed(2)} BDT</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(p.brand || 'Noyon Telecom')}</g:brand>
      ${p.sku ? `<g:mpn>${escapeXml(p.sku)}</g:mpn>` : ''}
      <g:product_type>${escapeXml(p.category)}</g:product_type>
      <g:google_product_category>Electronics &gt; Communications &gt; Telephony &gt; Mobile Phone Accessories</g:google_product_category>
      <g:identifier_exists>${p.sku ? 'yes' : 'no'}</g:identifier_exists>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Noyon Telecom — Wholesale Mobile Phone Spare Parts</title>
    <link>${siteUrl}</link>
    <description>Wholesale mobile phone spare parts catalog for Google Merchant Center.</description>
${items}
  </channel>
</rss>`;
}

router.get('/google-merchant.xml', async (req, res, next) => {
  try {
    // Fully public, unpersonalized (always retail `price`, never dealer
    // pricing), fetched by Google's crawler on its own schedule — a short
    // cache spares a full-catalog query on repeat/overlapping crawl hits.
    // Caches the fully-rendered XML (no per-request variation), same
    // invalidateProductCache() as the storefront/sitemap caches.
    res.set('Cache-Control', 'public, max-age=300');
    const xml = await getOrSet('feed:google-merchant-xml', 300, async () => {
      const products = await prisma.product.findMany({ where: { published: true } });
      return buildMerchantFeedXml({ products, siteUrl: SITE_URL });
    });

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
