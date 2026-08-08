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
