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
    res.json({ deliveryFee, onlinePaymentEnabled, announcement });
  } catch (err) {
    next(err);
  }
});

export default router;
