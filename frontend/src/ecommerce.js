// Single call-site API for standard ecommerce events, fanned out to every
// configured tracker (GA4, Meta Pixel, TikTok Pixel) with each platform's
// own event names/params. Callers never need to know which trackers are
// actually enabled — every function below is a safe no-op if none are.
import { trackEvent, trackGoogleAdsConversion } from './analytics.js';
import { fbqTrack, ttqTrack } from './pixels.js';

const CURRENCY = 'BDT';

function ga4Item(p, qty = 1) {
  return {
    item_id: p.sku || p.id,
    item_name: p.name,
    item_brand: p.brand || undefined,
    item_category: p.category,
    price: p.price,
    quantity: qty,
  };
}

export function trackViewItem(product) {
  trackEvent('view_item', { currency: CURRENCY, value: product.price, items: [ga4Item(product)] });
  fbqTrack('ViewContent', { content_ids: [product.sku || product.id], content_name: product.name, content_type: 'product', value: product.price, currency: CURRENCY });
  ttqTrack('ViewContent', { content_id: product.sku || product.id, content_name: product.name, price: product.price, currency: CURRENCY });
}

export function trackAddToCart(product, qty = 1) {
  const value = product.price * qty;
  trackEvent('add_to_cart', { currency: CURRENCY, value, items: [ga4Item(product, qty)] });
  fbqTrack('AddToCart', { content_ids: [product.sku || product.id], content_name: product.name, content_type: 'product', value, currency: CURRENCY });
  ttqTrack('AddToCart', { content_id: product.sku || product.id, content_name: product.name, quantity: qty, price: product.price, value, currency: CURRENCY });
}

export function trackAddToWishlist(product) {
  trackEvent('add_to_wishlist', { currency: CURRENCY, value: product.price, items: [ga4Item(product)] });
  fbqTrack('AddToWishlist', { content_ids: [product.sku || product.id], content_name: product.name, value: product.price, currency: CURRENCY });
}

export function trackSearch(term) {
  trackEvent('search', { search_term: term });
  fbqTrack('Search', { search_string: term });
  ttqTrack('Search', { query: term });
}

export function trackBeginCheckout(items, total) {
  trackEvent('begin_checkout', { currency: CURRENCY, value: total, items: items.map((i) => ga4Item(i, i.qty)) });
  fbqTrack('InitiateCheckout', { value: total, currency: CURRENCY, num_items: items.length });
  ttqTrack('InitiateCheckout', { value: total, currency: CURRENCY, quantity: items.reduce((s, i) => s + i.qty, 0) });
}

export function trackPurchase(order) {
  trackEvent('purchase', {
    transaction_id: order.id,
    currency: CURRENCY,
    value: order.total,
    shipping: order.shippingFee,
    items: order.items.map((i) => ga4Item({ ...i, id: i.productId }, i.qty)),
  });
  // Pass order.id as the Meta event_id so this browser Pixel Purchase event
  // is deduplicated against the equivalent server-side Conversions API event
  // (backend/src/utils/metaCapi.js uses the same order.id as its event_id).
  fbqTrack('Purchase', { value: order.total, currency: CURRENCY, content_ids: order.items.map((i) => i.productId), content_type: 'product' }, order.id);
  ttqTrack('CompletePayment', { value: order.total, currency: CURRENCY, content_id: order.id });
  trackGoogleAdsConversion({ value: order.total, transactionId: order.id });
}

export function trackRequestQuote(product) {
  trackEvent('generate_lead', { currency: CURRENCY, value: product?.price || 0, content_name: product?.name });
  fbqTrack('Lead', { content_name: product?.name });
  ttqTrack('SubmitForm', { content_name: product?.name });
}
