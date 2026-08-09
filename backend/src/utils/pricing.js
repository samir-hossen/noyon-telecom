// Pure pricing math kept separate from Prisma/DB access so it can be unit
// tested directly (no test database, no mocking prisma) — see
// pricing.test.js. Routes stay responsible for fetching the coupon row and
// validating it exists/is active; this file only does the arithmetic.

// Given a coupon row (must have { type: 'percent' | 'fixed', value }) and an
// order subtotal, returns the discount amount in BDT, rounded to 2 decimals.
// A 'fixed' discount is capped at the subtotal itself — a ৳500-off coupon on
// a ৳300 order should never make the order total go negative.
export function computeCouponDiscount(coupon, subtotal) {
  const sub = Number(subtotal) || 0;
  if (!coupon || sub <= 0) return 0;
  if (coupon.type === 'percent') {
    return Math.round(((sub * coupon.value) / 100) * 100) / 100;
  }
  return Math.min(coupon.value, sub);
}

// True if the subtotal meets the coupon's minimum-order requirement.
// Coupons with no minSubtotal set (0/null/undefined) always pass.
export function meetsMinSubtotal(coupon, subtotal) {
  const sub = Number(subtotal) || 0;
  return sub >= (coupon?.minSubtotal || 0);
}

// True if a coupon hasn't expired. Coupons with no expiresAt set never
// expire (existing coupons created before usage limits/expiry existed all
// have expiresAt = null, so this is a pure additive check — nothing that
// worked before stops working). Doesn't check `active` or minSubtotal
// (see meetsMinSubtotal) or usage limits (see isWithinUsageLimit) — each
// concern stays a separate, independently-testable check rather than one
// do-everything function.
export function isCouponExpired(coupon) {
  return Boolean(coupon?.expiresAt) && new Date(coupon.expiresAt).getTime() <= Date.now();
}

// Usage-limit check. `totalUses` and `customerUses` are counts the caller
// already fetched (a straightforward `tx.order.count(...)` — see
// orders.routes.js and coupons.routes.js); this function only applies the
// comparison, so the actual limit logic stays unit-testable without a
// database. Either limit left unset (null/undefined) on the coupon means
// no cap on that dimension — an existing coupon with neither limit set
// behaves exactly as it did before this existed.
export function isWithinUsageLimit(coupon, totalUses, customerUses) {
  if (coupon?.usageLimit != null && totalUses >= coupon.usageLimit) return false;
  if (coupon?.usageLimitPerCustomer != null && customerUses >= coupon.usageLimitPerCustomer) return false;
  return true;
}

// Order totals math (shipping + tax + grand total), pulled out of
// orders.routes.js so the exact arithmetic that decides what a customer is
// charged can be unit tested without a database — see pricing.test.js.
// `rules` lets callers pass the same constants defined in orders.routes.js
// (FREE_SHIPPING_THRESHOLD / FLAT_SHIPPING / TAX_RATE) instead of duplicating
// magic numbers here, so there's exactly one place those numbers live.
export function computeOrderTotals(subtotal, discount, rules) {
  const { freeShippingThreshold, flatShipping, taxRate } = rules;
  const sub = +(Number(subtotal) || 0).toFixed(2);
  const disc = Math.min(Number(discount) || 0, sub);
  const shippingFee = sub >= freeShippingThreshold ? 0 : flatShipping;
  const taxableAmount = sub - disc;
  const tax = +(taxableAmount * taxRate).toFixed(2);
  const total = +(taxableAmount + shippingFee + tax).toFixed(2);
  return { subtotal: sub, discount: disc, shippingFee, tax, total };
}
