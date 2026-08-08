import { Router } from 'express';
import prisma from '../prismaClient.js';
import { escapeXml, SITE_URL } from './sitemap.routes.js';

const router = Router();

// Google Merchant Center feed spec: https://support.google.com/merchants/answer/7052112
// Wholesale note: Merchant Center is built for consumer retail pricing.
// Since this storefront's public price is the retail/MRP price (dealer
// pricing only ever applies to logged-in approved dealers), the retail
// price is what's correct to submit here — Ads/Shopping will always show
// the same price a first-time visitor sees on the site.
router.get('/google-merchant.xml', async (req, res, next) => {
  try {
    // Fully public, unpersonalized (always retail `price`, never dealer
    // pricing), fetched by Google's crawler on its own schedule — a short
    // cache spares a full-catalog query on repeat/overlapping crawl hits.
    res.set('Cache-Control', 'public, max-age=300');
    const products = await prisma.product.findMany({ where: { stock: { gt: 0 }, published: true } });
    const items = products
      .map((p) => {
        const link = `${SITE_URL}/product/${p.id}`;
        const image = p.img?.startsWith('http') ? p.img : `${SITE_URL}${p.img || ''}`;
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
      <g:google_product_category>Electronics &gt; Communications &gt; Telephony &gt; Mobile Phone Accessories</g:google_product_category>
      <g:identifier_exists>${p.sku ? 'yes' : 'no'}</g:identifier_exists>
    </item>`;
      })
      .join('\n');

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Noyon Telecom — Wholesale Mobile Phone Spare Parts</title>
    <link>${SITE_URL}</link>
    <description>Wholesale mobile phone spare parts catalog for Google Merchant Center.</description>
${items}
  </channel>
</rss>`);
  } catch (err) {
    next(err);
  }
});

export default router;
