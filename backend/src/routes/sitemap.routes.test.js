import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPagesSitemapXml, escapeXml } from './sitemap.routes.js';

test('escapeXml', async (t) => {
  await t.test('escapes all five XML-special characters', () => {
    assert.equal(escapeXml(`<a> & 'b' "c"`), '&lt;a&gt; &amp; &apos;b&apos; &quot;c&quot;');
  });

  await t.test('leaves plain text untouched', () => {
    assert.equal(escapeXml('Samsung Galaxy A16'), 'Samsung Galaxy A16');
  });
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
      categories: ['Battery', 'Back Glass'],
      brands: ['Apple'],
    });
    assert.match(xml, /<loc>https:\/\/example\.com\/category\/battery<\/loc>/);
    // A multi-word category name becomes a single hyphenated slug, not a
    // percent-encoded query-string value.
    assert.match(xml, /<loc>https:\/\/example\.com\/category\/back-glass<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/brand\/apple<\/loc>/);
  });

  await t.test('produces well-formed, parseable XML', () => {
    const xml = buildPagesSitemapXml({ siteUrl: 'https://example.com', categories: ['Battery'], brands: ['Apple'] });
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
  });

  await t.test('never lists /register — robots.txt disallows it, so listing it here would tell Google to index a URL it also can’t crawl', () => {
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
