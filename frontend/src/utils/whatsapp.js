// The store's WhatsApp number and the pre-filled messages behind the
// "দাম জানতে WhatsApp করুন" / "স্টক জানতে WhatsApp করুন" buttons. The message
// is Bangla on purpose — it goes to the owner (see CLAUDE.md "Language rule").
import { productUrl } from './slug';

export const WHATSAPP_NUMBER = '8801560047377';

// Same canonical-origin rule as usePageMeta: the real domain once
// VITE_SITE_URL is set, so a link sent from any host points at the live site.
const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

export function whatsappLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function productAbsoluteUrl(product) {
  return `${SITE_ORIGIN}${productUrl(product)}`;
}

function productLine(product) {
  return `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ''} — ${productAbsoluteUrl(product)}`;
}

export function priceRequestLink(product) {
  return whatsappLink(`আসসালামু আলাইকুম, এই পার্টসটার পাইকারি দাম জানতে চাই: ${productLine(product)}`);
}

export function stockRequestLink(product) {
  return whatsappLink(`আসসালামু আলাইকুম, এই পার্টসটার স্টক জানতে চাই: ${productLine(product)}`);
}

// The API sends `price: null` until the owner publishes a price, so this is
// the one check for "can this be bought online right now".
export function hasPublicPrice(product) {
  return Number(product?.price) > 0;
}

export function quoteRequestPath(product) {
  const params = new URLSearchParams({ productId: product.id, name: product.name, qty: String(product.moq || 1) });
  if (product.sku) params.set('sku', product.sku);
  return `/request-quote?${params}`;
}
