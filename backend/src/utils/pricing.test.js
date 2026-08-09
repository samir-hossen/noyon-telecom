import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeCouponDiscount, meetsMinSubtotal, isCouponExpired, isWithinUsageLimit, computeOrderTotals } from './pricing.js';

describe('computeCouponDiscount', () => {
  test('percent coupon returns the correct fraction of the subtotal', () => {
    assert.equal(computeCouponDiscount({ type: 'percent', value: 10 }, 1000), 100);
  });

  test('percent coupon result is rounded to 2 decimal places', () => {
    assert.equal(computeCouponDiscount({ type: 'percent', value: 15 }, 333), 49.95);
  });

  test('fixed coupon returns its flat value when subtotal is large enough', () => {
    assert.equal(computeCouponDiscount({ type: 'fixed', value: 200 }, 1000), 200);
  });

  test('fixed coupon is capped at the subtotal, so the order can never total below zero', () => {
    assert.equal(computeCouponDiscount({ type: 'fixed', value: 500 }, 300), 300);
  });

  test('no coupon or non-positive subtotal returns zero discount', () => {
    assert.equal(computeCouponDiscount(null, 1000), 0);
    assert.equal(computeCouponDiscount({ type: 'fixed', value: 100 }, 0), 0);
    assert.equal(computeCouponDiscount({ type: 'fixed', value: 100 }, -50), 0);
  });
});

describe('meetsMinSubtotal', () => {
  test('passes when subtotal is above the minimum', () => {
    assert.equal(meetsMinSubtotal({ minSubtotal: 500 }, 600), true);
  });

  test('fails when subtotal is below the minimum', () => {
    assert.equal(meetsMinSubtotal({ minSubtotal: 500 }, 400), false);
  });

  test('exactly meeting the minimum passes (boundary is inclusive)', () => {
    assert.equal(meetsMinSubtotal({ minSubtotal: 500 }, 500), true);
  });

  test('a coupon with no minSubtotal set always passes', () => {
    assert.equal(meetsMinSubtotal({}, 1), true);
    assert.equal(meetsMinSubtotal({ minSubtotal: null }, 0), true);
  });
});

describe('isCouponExpired', () => {
  test('a coupon with no expiresAt set never expires', () => {
    assert.equal(isCouponExpired({}), false);
    assert.equal(isCouponExpired({ expiresAt: null }), false);
  });

  test('a coupon whose expiresAt is in the past is expired', () => {
    assert.equal(isCouponExpired({ expiresAt: new Date(Date.now() - 60_000) }), true);
  });

  test('a coupon whose expiresAt is in the future is not expired', () => {
    assert.equal(isCouponExpired({ expiresAt: new Date(Date.now() + 60_000) }), false);
  });

  test('a coupon expiring exactly now is treated as expired (boundary is inclusive)', () => {
    const now = new Date();
    assert.equal(isCouponExpired({ expiresAt: now }), true);
  });
});

describe('isWithinUsageLimit', () => {
  // Regression coverage for a real gap: coupons previously had no usage
  // limit of any kind — the same customer could apply one to every order
  // they ever placed, and a leaked/shared code had no cap on total
  // redemptions either.
  test('a coupon with neither limit set is always within limit, regardless of usage counts', () => {
    assert.equal(isWithinUsageLimit({}, 999999, 999999), true);
  });

  test('total usage limit blocks once the count reaches it', () => {
    assert.equal(isWithinUsageLimit({ usageLimit: 100 }, 99, 0), true);
    assert.equal(isWithinUsageLimit({ usageLimit: 100 }, 100, 0), false);
    assert.equal(isWithinUsageLimit({ usageLimit: 100 }, 101, 0), false);
  });

  test('per-customer usage limit blocks once that customer\'s count reaches it', () => {
    assert.equal(isWithinUsageLimit({ usageLimitPerCustomer: 1 }, 50, 0), true);
    assert.equal(isWithinUsageLimit({ usageLimitPerCustomer: 1 }, 50, 1), false);
  });

  test('both limits set: either one being reached blocks it', () => {
    const coupon = { usageLimit: 100, usageLimitPerCustomer: 1 };
    assert.equal(isWithinUsageLimit(coupon, 50, 0), true); // under both
    assert.equal(isWithinUsageLimit(coupon, 100, 0), false); // total limit hit
    assert.equal(isWithinUsageLimit(coupon, 50, 1), false); // per-customer limit hit
  });
});

// This is the exact math that decides what a customer is actually charged
// at checkout (see orders.routes.js) — bugs here mean real money either
// overcharges customers or undercharges the store, so it gets the most
// thorough test coverage in this file, including boundary conditions.
describe('computeOrderTotals', () => {
  const rules = { freeShippingThreshold: 1500, flatShipping: 60, taxRate: 0.05 };

  test('charges flat shipping below the free-shipping threshold', () => {
    const result = computeOrderTotals(1000, 0, rules);
    assert.equal(result.shippingFee, 60);
  });

  test('waives shipping at or above the free-shipping threshold', () => {
    assert.equal(computeOrderTotals(1500, 0, rules).shippingFee, 0);
    assert.equal(computeOrderTotals(2000, 0, rules).shippingFee, 0);
  });

  test('tax is calculated on (subtotal - discount), not raw subtotal', () => {
    // 1000 subtotal, 200 discount -> taxable 800 -> 5% tax = 40
    const result = computeOrderTotals(1000, 200, rules);
    assert.equal(result.tax, 40);
  });

  test('total = (subtotal - discount) + shippingFee + tax', () => {
    const result = computeOrderTotals(1000, 200, rules);
    // taxable 800, shippingFee 60 (below threshold), tax 40 -> total 900
    assert.equal(result.total, 900);
  });

  test('a discount can never exceed the subtotal, even if passed in larger', () => {
    const result = computeOrderTotals(300, 999, rules);
    assert.equal(result.discount, 300);
    // fully discounted order still owes shipping + zero tax, never negative
    assert.equal(result.tax, 0);
    assert.ok(result.total >= 0);
  });

  test('boundary: subtotal exactly at free-shipping threshold after rounding', () => {
    const result = computeOrderTotals(1499.999, 0, rules);
    // rounds to 1500.00, which should qualify for free shipping
    assert.equal(result.subtotal, 1500);
    assert.equal(result.shippingFee, 0);
  });

  test('handles missing/garbage input without throwing or going negative', () => {
    const result = computeOrderTotals(undefined, null, rules);
    assert.equal(result.subtotal, 0);
    // A zero subtotal is still below the free-shipping threshold, so flat
    // shipping still applies — this shouldn't happen in practice (the route
    // rejects empty carts before this is ever called), but the important
    // guarantee here is just that nothing throws or goes negative.
    assert.equal(result.shippingFee, 60);
    assert.equal(result.total, 60);
    assert.ok(result.total >= 0);
  });
});
