import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireCsrf } from '../middleware/csrf.js';
import { optionalAuth } from '../middleware/auth.js';
import { computeCouponDiscount, meetsMinSubtotal, isCouponExpired, isWithinUsageLimit } from '../utils/pricing.js';

const router = Router();

// NOTE: this expects `subtotal` in the request body so a percent-off coupon
// can be turned into a concrete dollar amount server-side (the source of
// truth for pricing should never be the client). The frontend's checkout
// page is expected to send the cart subtotal it already has on hand.
// `email` is likewise expected from a guest checkout's own shipping form
// (logged-in users are identified via their session instead) — needed to
// give early, accurate feedback here if a per-customer usage limit is
// already reached, rather than only discovering that as a silently-dropped
// discount at final checkout submission.
router.post('/validate', optionalAuth, requireCsrf, async (req, res, next) => {
  try {
    const { code, subtotal, email } = req.body;
    const sub = Number(subtotal) || 0;

    if (!code) return res.status(400).json({ error: 'Enter a coupon code' });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!coupon || !coupon.active) {
      return res.status(404).json({ error: 'That coupon code is invalid or no longer active' });
    }
    if (isCouponExpired(coupon)) {
      return res.status(404).json({ error: 'That coupon code has expired' });
    }
    if (!meetsMinSubtotal(coupon, sub)) {
      return res.status(400).json({ error: `This coupon requires a minimum order of ৳${Math.round(coupon.minSubtotal).toLocaleString('en-BD')}` });
    }
    if (coupon.usageLimit != null || coupon.usageLimitPerCustomer != null) {
      const [totalUses, customerUses] = await Promise.all([
        coupon.usageLimit != null ? prisma.order.count({ where: { couponCode: coupon.code } }) : Promise.resolve(0),
        coupon.usageLimitPerCustomer != null
          ? prisma.order.count({
              where: {
                couponCode: coupon.code,
                // Case-insensitive for the same reason as the matching check
                // in orders.routes.js's checkout handler — email identity
                // shouldn't depend on how the guest happened to capitalize it.
                ...(req.user ? { userId: req.user.id } : { guestEmail: { equals: (email || '').toString().trim(), mode: 'insensitive' } }),
              },
            })
          : Promise.resolve(0),
      ]);
      if (!isWithinUsageLimit(coupon, totalUses, customerUses)) {
        return res.status(400).json({ error: 'This coupon has already reached its usage limit' });
      }
    }

    const discount = computeCouponDiscount(coupon, sub);

    res.json({ code: coupon.code, discount });
  } catch (err) {
    next(err);
  }
});

export default router;
