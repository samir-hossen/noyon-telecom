import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPagesSitemapXml, buildProductsSitemapXml, escapeXml } from './sitemap.routes.js';

test('escapeXml', async (t) => {
  await t.test('escapes all five XML-special characters', () => {
    assert.equal(escapeXml(`<a> & 'b' "c"`), '&lt;a&gt; &amp; &apos;b&apos; &quot;c&quot;');
  });

  await t.test('leaves plain text untouched', () => {
    assert.equal(escapeXml('Samsung Galaxy A16'), 'Samsung Galaxy A16');
  });
});

test('buildProductsSitemapXml', () => {
  const xml = buildProductsSitemapXml({
    siteUrl: 'https://example.com',
    products: [{ id: 'p1', slug: 'samsung-a16-display', name: 'Samsung A16 Display & Frame', img: 'https://images.example.com/a16.jpg?x=1&y=2', updatedAt: new Date('2026-11-10T00:00:00Z') }],
  });
  assert.match(xml, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(xml, /<image:loc>https:\/\/images\.example\.com\/a16\.jpg\?x=1&amp;y=2<\/image:loc>/);
  assert.match(xml, /<image:title>Samsung A16 Display &amp; Frame<\/image:title>/);
});

test('buildPagesSitemapXml', async (t) => {
  await t.test('always includes the homepage and /shop even with no categories/brands', () => {
    const xml = buildPagesSitemapXml({ siteUrl: 'https://example.com', categories: [], brands: [] });
    assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/shop<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/about<\/loc>/);
  });

  await t.test('adds one clean-path URL per active category and brand, DB-driven rather than hardcoded', () => {
    const xml = buildPagesSitemapXml({
      siteUrl: 'https://example.com',
      categories: ['Display', 'Back Glass'],
      brands: ['Apple'],
    });
    assert.match(xml, /<loc>https:\/\/example\.com\/category\/display<\/loc>/);
    // A multi-word category name becomes a single hyphenated slug, not a
    // percent-encoded query-string value.
    assert.match(xml, /<loc>https:\/\/example\.com\/category\/back-glass<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/brand\/apple<\/loc>/);
  });

  await t.test('produces well-formed, parseable XML', () => {
    const xml = buildPagesSitemapXml({ siteUrl: 'https://example.com', categories: ['Display'], brands: ['Apple'] });
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
  });

  await t.test('never lists a switched-off category (battery section is OFF), even if one is passed in', () => {
    const xml = buildPagesSitemapXml({
      siteUrl: 'https://example.com',
      categories: ['Battery', 'Display'],
      brands: ['Samsung'],
      brandCategoryPairs: [{ brand: 'Samsung', category: 'Battery' }, { brand: 'Samsung', category: 'Display' }],
    });
    assert.doesNotMatch(xml, /battery/i);
    assert.match(xml, /\/brand\/samsung\/display</);
  });

  await t.test('never lists /register — it is a noindex utility page, not a search landing page', () => {
    const xml = buildPagesSitemapXml({ siteUrl: 'https://example.com', categories: [], brands: [] });
    assert.doesNotMatch(xml, /\/register</);
  });

  await t.test('adds a /brand/<brand>/<category> URL for each real combination, none if there are none', () => {
    const withPairs = buildPagesSitemapXml({
      siteUrl: 'https://example.com',
      categories: [],
      brands: [],
      brandCategoryPairs: [{ brand: 'Samsung', category: 'Display' }],
    });
    assert.match(withPairs, /<loc>https:\/\/example\.com\/brand\/samsung\/display<\/loc>/);

    const withoutPairs = buildPagesSitemapXml({ siteUrl: 'https://example.com', categories: [], brands: [] });
    assert.doesNotMatch(withoutPairs, /\/brand\/[a-z-]+\/[a-z-]+</);
  });
});
