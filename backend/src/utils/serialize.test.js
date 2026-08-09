import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { priceForViewer, serializeProduct, serializeReview, withViewerPricing } from './serialize.js';

function baseProduct(overrides = {}) {
  return {
    id: 'p1',
    price: 1000,
    dealerPrice: 800,
    bulkPricing: [],
    ...overrides,
  };
}

describe('priceForViewer', () => {
  test('guest (no user) pays retail price', () => {
    assert.equal(priceForViewer(baseProduct(), null), 1000);
  });

  test('customer role pays retail price, even if they somehow have a dealerPrice set', () => {
    const user = { role: 'customer' };
    assert.equal(priceForViewer(baseProduct(), user), 1000);
  });

  test('a dealer whose application is still pending pays retail, not dealer price', () => {
    const user = { role: 'dealer', dealerStatus: 'pending' };
    assert.equal(priceForViewer(baseProduct(), user), 1000);
  });

  test('an approved dealer pays dealerPrice', () => {
    const user = { role: 'dealer', dealerStatus: 'approved' };
    assert.equal(priceForViewer(baseProduct(), user), 800);
  });

  test('an approved dealer with a personal discount gets it applied on top of dealerPrice', () => {
    const user = { role: 'dealer', dealerStatus: 'approved', dealerDiscountPercent: 10 };
    // 800 * (1 - 0.10) = 720
    assert.equal(priceForViewer(baseProduct(), user), 720);
  });

  test('an approved dealer discount is clamped to 0-100%, so a bad value can never produce a negative price', () => {
    const user = { role: 'dealer', dealerStatus: 'approved', dealerDiscountPercent: 150 };
    assert.equal(priceForViewer(baseProduct(), user), 0);
    const userNegative = { role: 'dealer', dealerStatus: 'approved', dealerDiscountPercent: -20 };
    assert.equal(priceForViewer(baseProduct(), userNegative), 800);
  });

  test('an approved dealer falls back to retail price if dealerPrice was never set', () => {
    const user = { role: 'dealer', dealerStatus: 'approved' };
    assert.equal(priceForViewer(baseProduct({ dealerPrice: null }), user), 1000);
  });

  test('a non-dealer qualifying for a bulk-pricing tier pays the tier price', () => {
    const product = baseProduct({
      bulkPricing: [
        { minQty: 10, price: 900 },
        { minQty: 50, price: 800 },
      ],
    });
    assert.equal(priceForViewer(product, null, 1), 1000); // below any tier
    assert.equal(priceForViewer(product, null, 10), 900); // exactly the first tier
    assert.equal(priceForViewer(product, null, 49), 900); // still first tier
    assert.equal(priceForViewer(product, null, 50), 800); // best/highest qualifying tier
    assert.equal(priceForViewer(product, null, 500), 800); // still the best tier, no tier beyond it
  });

  test('bulk pricing never applies to an approved dealer (dealer pricing already IS the wholesale price)', () => {
    const product = baseProduct({ bulkPricing: [{ minQty: 1, price: 1 }] });
    const user = { role: 'dealer', dealerStatus: 'approved' };
    assert.equal(priceForViewer(product, user, 100), 800);
  });

  test('malformed bulkPricing entries (missing/non-numeric fields) are ignored rather than crashing', () => {
    const product = baseProduct({
      bulkPricing: [{ minQty: 10 }, { price: 500 }, null, { minQty: 5, price: 950 }],
    });
    assert.equal(priceForViewer(product, null, 20), 950);
  });
});

describe('serializeProduct', () => {
  test('passes through an already-array images field untouched', () => {
    const out = serializeProduct(baseProduct({ images: ['/a.jpg', '/b.jpg'], img: '/a.jpg', desc: 'x', category: 'Battery' }));
    assert.deepEqual(out.images, ['/a.jpg', '/b.jpg']);
  });

  test('falls back to a single-element array built from the legacy `img` field', () => {
    const out = serializeProduct(baseProduct({ images: undefined, img: '/legacy.jpg', desc: 'x', category: 'Battery' }));
    assert.deepEqual(out.images, ['/legacy.jpg']);
  });

  test('rounds rating to one decimal place', () => {
    const out = serializeProduct(baseProduct({ rating: 4.36789, desc: 'x', category: 'Battery', images: [] }));
    assert.equal(out.rating, 4.4);
  });
});

describe('serializeReview', () => {
  test('defaults images to an empty array when the row has none (e.g. reviews created before the images column existed)', () => {
    const out = serializeReview({ id: 'r1', productId: 'p1', userName: 'Rafi', rating: 5, comment: 'Great', createdAt: new Date() });
    assert.deepEqual(out.images, []);
  });

  test('passes through an existing images array', () => {
    const out = serializeReview({
      id: 'r1', productId: 'p1', userName: 'Rafi', rating: 5, comment: 'Great',
      images: ['/uploads/x.jpg'], createdAt: new Date(),
    });
    assert.deepEqual(out.images, ['/uploads/x.jpg']);
  });
});

describe('withViewerPricing', () => {
  // Regression coverage for a real data-exposure bug: serializeProduct()
  // always includes the raw `dealerPrice` field (the admin panel needs it),
  // and every customer-facing route (storefront listing/detail, cart,
  // wishlist, review submission) must strip it back out via this function
  // before the response goes out. A guest or ordinary customer has no
  // business seeing another tier's wholesale price sitting in the JSON,
  // even though the frontend UI never displays that field — it was still
  // readable in DevTools' Network tab by anyone until this was fixed.
  function serialized(overrides = {}) {
    return serializeProduct({ id: 'p1', price: 1000, dealerPrice: 800, bulkPricing: [], images: [], img: '', desc: 'x', category: 'Battery', ...overrides });
  }

  test('a guest (no user) never receives dealerPrice in the response', () => {
    const out = withViewerPricing(serialized(), null);
    assert.equal('dealerPrice' in out, false);
    assert.equal(out.price, 1000);
    assert.equal(out.retailPrice, 1000);
  });

  test('a logged-in non-dealer customer never receives dealerPrice', () => {
    const out = withViewerPricing(serialized(), { role: 'customer' });
    assert.equal('dealerPrice' in out, false);
  });

  test('a dealer whose application is still pending never receives dealerPrice', () => {
    const out = withViewerPricing(serialized(), { role: 'dealer', dealerStatus: 'pending' });
    assert.equal('dealerPrice' in out, false);
    assert.equal(out.price, 1000); // pays retail, matching priceForViewer's own behavior for a pending dealer
  });

  test('an approved dealer DOES receive their own dealerPrice back, and pays it', () => {
    const out = withViewerPricing(serialized(), { role: 'dealer', dealerStatus: 'approved' });
    assert.equal(out.dealerPrice, 800);
    assert.equal(out.price, 800);
    assert.equal(out.retailPrice, 1000); // original MRP still visible for comparison/discount-anchoring in the UI
  });

  test('every other product field still passes through untouched', () => {
    const out = withViewerPricing(serialized({ name: 'Battery A54', sku: 'NT-BAT-A54' }), null);
    assert.equal(out.name, 'Battery A54');
    assert.equal(out.sku, 'NT-BAT-A54');
    assert.equal(out.id, 'p1');
  });

  test('bulk-pricing tiers still apply correctly for a qualifying non-dealer quantity, with dealerPrice still stripped', () => {
    const product = serialized({ bulkPricing: [{ minQty: 10, price: 900 }] });
    const out = withViewerPricing(product, null, 10);
    assert.equal(out.price, 900);
    assert.equal('dealerPrice' in out, false);
  });
});
