// Meta (Facebook/Instagram) Conversions API — server-side purchase tracking.
//
// Why this exists on top of the browser Pixel (frontend/src/pixels.js):
// iOS 14.5+ App Tracking Transparency, ad blockers, and browser privacy
// features (Safari ITP, Firefox ETP) routinely block or drop the client-side
// Pixel's Purchase event. Meta's own guidance is that CAPI recovers a
// meaningful share of that lost signal, which directly improves ad
// delivery/optimization and lowers cost-per-result — this is the single
// highest-leverage tracking fix for an ads-funded store.
//
// Entirely optional and a no-op until META_CAPI_ACCESS_TOKEN + META_PIXEL_ID
// are set in backend/.env. Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// Setup:
// 1. Meta Events Manager -> your Pixel -> Settings -> Conversions API ->
//    "Generate access token" (or use a System User token for production).
// 2. Set META_PIXEL_ID (same id used in VITE_META_PIXEL_ID on the frontend)
//    and META_CAPI_ACCESS_TOKEN here.
// 3. Optional: set META_CAPI_TEST_EVENT_CODE while testing — Events Manager's
//    "Test events" tab shows them live without affecting real ad data.

import crypto from 'crypto';

const GRAPH_VERSION = 'v21.0';

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// Bangladeshi phone numbers are usually entered as 01XXXXXXXXX; Meta expects
// E.164 (no leading zero, country code prepended) before hashing, or match
// rates drop noticeably.
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  return digits;
}

function isConfigured() {
  return Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

// `req` is the Express request for the /checkout or IPN call — used to pull
// the _fbp/_fbc cookies the Pixel already set in the browser (critical for
// Meta to de-duplicate/match this server event against the browser Pixel
// event) plus the client IP and user agent Meta asks for.
export async function sendMetaPurchaseEvent({ order, req, eventId }) {
  if (!isConfigured()) return;

  try {
    const email = order.shipping?.email;
    const phone = normalizePhone(order.shipping?.phone);

    const userData = {
      client_ip_address: req.ip,
      client_user_agent: req.get('user-agent') || undefined,
      fbp: req.cookies?._fbp || undefined,
      fbc: req.cookies?._fbc || undefined,
      em: email ? [sha256(email)] : undefined,
      ph: phone ? [sha256(phone)] : undefined,
    };
    Object.keys(userData).forEach((k) => userData[k] === undefined && delete userData[k]);

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          // Same id the browser Pixel used for its own Purchase event
          // (frontend/src/ecommerce.js -> trackPurchase) so Meta
          // deduplicates the two into a single conversion instead of
          // double-counting.
          event_id: eventId || order.id,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: `${process.env.FRONTEND_URL || ''}/order-confirmation/${order.id}`,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            currency: 'BDT',
            value: order.total,
            content_type: 'product',
            content_ids: order.items.map((i) => i.productId),
            num_items: order.items.reduce((sum, i) => sum + i.qty, 0),
          },
        },
      ],
    };
    if (process.env.META_CAPI_TEST_EVENT_CODE) {
      payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_ACCESS_TOKEN}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Meta Conversions API error:', res.status, body);
    }
  } catch (err) {
    // Never let a tracking failure affect the actual order/payment flow.
    console.error('Meta Conversions API request failed:', err.message);
  }
}
