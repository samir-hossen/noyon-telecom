import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeProductCard, PRODUCT_CARD_SELECT } from './serialize.js';

const product = {
  id: 'p1', slug: 'phone-display', name: 'Phone Display', category: 'Display',
  img: '/photo.webp', price: 1000, priceStatus: 'published', dealerPrice: 800,
  stock: 3, rating: 4.6, reviewCount: 2, moq: 1, sku: 'DISPLAY', brand: 'Phone',
  desc: 'Long product description. '.repeat(100), draftPrice: 123, priceNote: 'private',
  compatibleModels: ['Phone'], modelSlugs: ['phone'], images: ['/photo.webp'],
  qualityOptions: [],
};

test('card keeps display fields while omitting detail payload and private prices', () => {
  const card = serializeProductCard(product, null);
  assert.equal(card.name, product.name);
  assert.equal(card.price, 1000);
  assert.equal(card.stock, 3);
  for (const key of ['desc', 'images', 'compatibleModels', 'modelSlugs', 'draftPrice', 'priceNote', 'dealerPrice']) {
    assert.equal(key in card, false, key);
  }
  assert.ok(JSON.stringify(card).length < JSON.stringify(product).length / 2);
});

test('card preserves approved dealer pricing', () => {
  const card = serializeProductCard(product, { role: 'dealer', dealerStatus: 'approved', dealerDiscountPercent: 10 });
  assert.equal(card.price, 720);
  assert.equal(card.retailPrice, 1000);
});

test('draft prices and quality prices remain hidden', () => {
  const card = serializeProductCard({ ...product, priceStatus: 'draft', compareAt: 1200,
    qualityOptions: [{ label: 'Original', price: 1000 }] }, null);
  assert.equal(card.price, null);
  assert.equal(card.retailPrice, null);
  assert.equal(card.compareAt, null);
  assert.deepEqual(card.qualityOptions, []);
});

test('database projection preserves cards for every viewer and price state', () => {
  const viewers = [null, { role: 'customer' },
    { role: 'dealer', dealerStatus: 'pending' },
    { role: 'dealer', dealerStatus: 'approved', dealerDiscountPercent: 10 }];
  for (const priceStatus of ['draft', 'published']) {
    const row = { ...product, priceStatus, compareAt: 1200,
      bulkPricing: [{ minQty: 1, price: 900 }],
      qualityOptions: [{ label: 'Original', price: 1000 }] };
    const projected = Object.fromEntries(Object.keys(PRODUCT_CARD_SELECT).map((key) => [key, row[key]]));
    for (const viewer of viewers) {
      assert.deepEqual(serializeProductCard(projected, viewer), serializeProductCard(row, viewer));
    }
    assert.ok(JSON.stringify(projected).length < JSON.stringify(row).length / 2);
  }
});
