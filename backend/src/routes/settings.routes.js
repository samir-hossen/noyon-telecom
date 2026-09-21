import { Router } from 'express';
import { getDeliveryFee, getOnlinePaymentEnabled, getAnnouncement } from '../utils/settings.js';

const router = Router();

// Public, read-only — lets Cart/Checkout show the real current delivery
// fee as an estimate before checkout, instead of a hardcoded number that
// could drift from what admin actually set. Never contains anything
// sensitive, so a short public cache is safe.
router.get('/public', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    const [deliveryFee, onlinePaymentEnabled, announcement] = await Promise.all([
      getDeliveryFee(),
      getOnlinePaymentEnabled(),
      getAnnouncement(),
    ]);
    // Lets the Contact page show the real configured support address
    // instead of a hardcoded one baked into frontend source — this is
    // already the same address contact/quote/order-alert emails are sent
    // to (see contact.routes.js etc.), just surfaced here for display too.
    // It's a support inbox meant to be public-facing, same as the phone
    // number/address already shown on that page — not a secret.
    const contactEmail = process.env.STORE_CONTACT_EMAIL || 'support@noyontelecom.com';
    // Same reasoning as contactEmail above — was hardcoded directly in
    // frontend JSX/JSON-LD in three separate places (Footer, Contact,
    // index.html's static Organization block), so changing or removing the
    // page needed a code deploy. `|| null` (not a fallback URL) since an
    // unset/removed Facebook page should just hide the link entirely rather
    // than ever guess a URL.
    const facebookUrl = process.env.SOCIAL_FACEBOOK_URL || null;
    res.json({ deliveryFee, onlinePaymentEnabled, announcement, contactEmail, facebookUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
