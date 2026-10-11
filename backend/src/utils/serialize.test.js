import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { priceForViewer, serializeProduct, serializeReview, withViewerPricing, isPricePublished } from './serialize.js';

function baseProduct(overrides = {}) {
  return {
    id: 'p1',
    price: 1000,
    priceStatus: 'published',
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
    return serializeProduct({ id: 'p1', price: 1000, priceStatus: 'published', dealerPrice: 800, bulkPricing: [], images: [], img: '', desc: 'x', category: 'Display', ...overrides });
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

describe('hidden draft price (owner policy, Oct 2026)', () => {
  function draft(overrides = {}) {
    return serializeProduct({
      id: 'p2', price: 880, priceStatus: 'draft', draftPrice: 1199, referencePrice: 1399,
      priceNote: 'etel 1399 [(single option)] <2,000 -200', compareAt: 1000, dealerPrice: 800,
      bulkPricing: [{ minQty: 10, price: 850 }], images: [], img: '', desc: 'x', category: 'Display', ...overrides,
    });
  }
  const HIDDEN_FIELDS = ['draftPrice', 'referencePrice', 'priceNote', 'priceStatus', 'dealerPrice'];

  test('isPricePublished: only a published price above 0 counts', () => {
    assert.equal(isPricePublished({ priceStatus: 'published', price: 1150 }), true);
    assert.equal(isPricePublished({ priceStatus: 'draft', price: 1150 }), false);
    assert.equal(isPricePublished({ priceStatus: 'published', price: 0 }), false);
    assert.equal(isPricePublished({ price: 1150 }), false);
    assert.equal(isPricePublished(null), false);
  });

  test('admin serializer keeps the hidden-price fields', () => {
    const out = draft();
    assert.equal(out.draftPrice, 1199);
    assert.equal(out.referencePrice, 1399);
    assert.equal(out.priceStatus, 'draft');
    assert.ok(out.priceNote.includes('1399'));
  });

  test('a draft product goes out with no price at all, to every kind of viewer', () => {
    for (const user of [null, { role: 'customer' }, { role: 'dealer', dealerStatus: 'pending' }, { role: 'dealer', dealerStatus: 'approved' }]) {
      const out = withViewerPricing(draft(), user, 10);
      assert.equal(out.price, null);
      assert.equal(out.retailPrice, null);
      assert.equal(out.compareAt, null);
      assert.deepEqual(out.bulkPricing, []);
      for (const f of HIDDEN_FIELDS) assert.equal(f in out, false, `${f} leaked`);
      const raw = JSON.stringify(out);
      for (const n of ['1199', '1399', '880', '850']) assert.equal(raw.includes(n), false, `${n} leaked in ${raw}`);
    }
  });

  test('a published product still never carries the draft fields', () => {
    const out = withViewerPricing(draft({ priceStatus: 'published', price: 1150 }), null);
    assert.equal(out.price, 1150);
    for (const f of HIDDEN_FIELDS) assert.equal(f in out, false, `${f} leaked`);
  });

  test('priceForViewer gives no price for a draft — checkout refuses it', () => {
    assert.equal(priceForViewer(draft(), null), null);
    assert.equal(priceForViewer(draft(), { role: 'dealer', dealerStatus: 'approved' }), null);
  });
});
