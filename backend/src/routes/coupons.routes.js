import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireCsrf } from '../middleware/csrf.js';
import { computeCouponDiscount, meetsMinSubtotal } from '../utils/pricing.js';

const router = Router();

// NOTE: this expects `subtotal` in the request body so a percent-off coupon
// can be turned into a concrete dollar amount server-side (the source of
// truth for pricing should never be the client). The frontend's checkout
// page is expected to send the cart subtotal it already has on hand.
router.post('/validate', requireCsrf, async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    const sub = Number(subtotal) || 0;

    if (!code) return res.status(400).json({ error: 'Enter a coupon code' });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!coupon || !coupon.active) {
      return res.status(404).json({ error: 'That coupon code is invalid or no longer active' });
    }
    if (!meetsMinSubtotal(coupon, sub)) {
      return res.status(400).json({ error: `This coupon requires a minimum order of ৳${Math.round(coupon.minSubtotal).toLocaleString('en-BD')}` });
    }

    const discount = computeCouponDiscount(coupon, sub);

    res.json({ code: coupon.code, discount });
  } catch (err) {
    next(err);
  }
});

export default router;
