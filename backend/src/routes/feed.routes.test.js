import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMerchantFeedXml } from './feed.routes.js';

function product(overrides = {}) {
  return {
    id: 'p1',
    name: 'Samsung Galaxy A16 Display',
    desc: 'OLED display assembly',
    img: '/uploads/a16-display.jpg',
    price: 1200,
    stock: 5,
    sku: null,
    brand: null,
    category: 'Display',
    ...overrides,
  };
}

test('buildMerchantFeedXml', async (t) => {
  await t.test('an out-of-stock product still appears in the feed, marked out_of_stock', () => {
    // Regression test: the route used to query with `stock: { gt: 0 }`,
    // which silently dropped every out-of-stock product before this
    // function ever ran — the out_of_stock branch below was unreachable.
    const xml = buildMerchantFeedXml({ products: [product({ stock: 0 })], siteUrl: 'https://example.com' });
    assert.match(xml, /<g:id>p1<\/g:id>/);
    assert.match(xml, /<g:availability>out_of_stock<\/g:availability>/);
  });

  await t.test('an in-stock product is marked in_stock', () => {
    const xml = buildMerchantFeedXml({ products: [product({ stock: 5 })], siteUrl: 'https://example.com' });
    assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  });

  await t.test('a product with no image is excluded entirely (Merchant Center requires g:image_link)', () => {
    const xml = buildMerchantFeedXml({ products: [product({ img: '' })], siteUrl: 'https://example.com' });
    assert.equal(xml.includes('<g:id>p1</g:id>'), false);
  });

  await t.test('sku present -> mpn included and identifier_exists=yes; absent -> the opposite', () => {
    const withSku = buildMerchantFeedXml({ products: [product({ sku: 'NT-DIS-001' })], siteUrl: 'https://example.com' });
    assert.match(withSku, /<g:mpn>NT-DIS-001<\/g:mpn>/);
    assert.match(withSku, /<g:identifier_exists>yes<\/g:identifier_exists>/);

    const withoutSku = buildMerchantFeedXml({ products: [product({ sku: null })], siteUrl: 'https://example.com' });
    assert.equal(withoutSku.includes('<g:mpn>'), false);
    assert.match(withoutSku, /<g:identifier_exists>no<\/g:identifier_exists>/);
  });

  await t.test('g:product_type reflects the real product category, never invented', () => {
    const xml = buildMerchantFeedXml({ products: [product({ category: 'Back Glass' })], siteUrl: 'https://example.com' });
    assert.match(xml, /<g:product_type>Back Glass<\/g:product_type>/);
  });

  await t.test('no brand falls back to the store name, never a fabricated brand', () => {
    const xml = buildMerchantFeedXml({ products: [product({ brand: null })], siteUrl: 'https://example.com' });
    assert.match(xml, /<g:brand>Noyon Telecom<\/g:brand>/);
  });

  await t.test('special characters in name/description are XML-escaped', () => {
    const xml = buildMerchantFeedXml({
      products: [product({ name: 'Cable & Connector "Pro"' })],
      siteUrl: 'https://example.com',
    });
    assert.match(xml, /<title>Cable &amp; Connector &quot;Pro&quot;<\/title>/);
  });

  await t.test('relative image paths are resolved against siteUrl; absolute ones are left alone', () => {
    const relative = buildMerchantFeedXml({ products: [product({ img: '/uploads/x.jpg' })], siteUrl: 'https://example.com' });
    assert.match(relative, /<g:image_link>https:\/\/example\.com\/uploads\/x\.jpg<\/g:image_link>/);

    const absolute = buildMerchantFeedXml({
      products: [product({ img: 'https://res.cloudinary.com/x.jpg' })],
      siteUrl: 'https://example.com',
    });
    assert.match(absolute, /<g:image_link>https:\/\/res\.cloudinary\.com\/x\.jpg<\/g:image_link>/);
  });
});
