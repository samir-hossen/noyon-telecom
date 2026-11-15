import test from 'node:test';
import assert from 'node:assert/strict';

// These tests only cover the "not configured" branches (MEILISEARCH_HOST
// unset) — the same no-op-by-default guarantee every other optional
// service in this codebase has (Cloudinary, Sentry, SMTP, reCAPTCHA). The
// actual search behavior against a real Meilisearch instance (indexing,
// typo-tolerant search, filters, sort) is covered by manual integration
// testing against a live instance — a live search engine isn't something
// this test suite spins up, the same reason there's no live-Postgres test
// here either (see the rest of this file's sibling *.test.js files, all of
// which test pure logic, not real network calls).
delete process.env.MEILISEARCH_HOST;
delete process.env.MEILISEARCH_API_KEY;
const { indexProduct, indexProducts, deleteProductFromIndex, searchProductIds, normalizeSearchQuery, isSearchEngineEnabled } = await import('./search.js');

test('normalizeSearchQuery fixes common customer spellings and catalog aliases', () => {
  assert.equal(normalizeSearchQuery('  samsang A15 disply  '), 'samsung A15 display');
  assert.equal(normalizeSearchQuery('iPhone 13 charging port'), 'iPhone 13 charging logic');
  assert.equal(normalizeSearchQuery('Samsung S23 charging board'), 'Samsung S23 charging logic');
  assert.equal(normalizeSearchQuery('One Plus 9 screen'), 'oneplus 9 display');
  assert.equal(normalizeSearchQuery('Redmi Note 12 SIM holder'), 'Redmi Note 12 sim tray');
});

test('normalizeSearchQuery understands Bengali product searches', () => {
  assert.equal(normalizeSearchQuery('স্যামসাং A15 ডিসপ্লে'), 'samsung A15 display');
  assert.equal(normalizeSearchQuery('আইফোন 13 চার্জিং পোর্ট'), 'iphone 13 charging logic');
  assert.equal(normalizeSearchQuery('শাওমি ব্যাক গ্লাস'), 'xiaomi back glass');
});

test('normalizeSearchQuery removes only natural-language filler words', () => {
  assert.equal(normalizeSearchQuery('display for samsung a15 price in Bangladesh'), 'display samsung a15');
  assert.equal(normalizeSearchQuery('Samsung A15 ডিসপ্লে দাম বাংলাদেশে'), 'Samsung A15 display');
  assert.equal(normalizeSearchQuery('mobile'), 'mobile');
  assert.equal(normalizeSearchQuery('price'), 'price');
});

test('search.js with no MEILISEARCH_HOST configured', async (t) => {
  await t.test('isSearchEngineEnabled() is false', () => {
    assert.equal(isSearchEngineEnabled(), false);
  });

  await t.test('indexProduct() resolves without making any network call', async () => {
    await assert.doesNotReject(() => indexProduct({ id: 'p1', name: 'Test' }));
  });

  await t.test('indexProducts() resolves without making any network call', async () => {
    await assert.doesNotReject(() => indexProducts([{ id: 'p1', name: 'Test' }]));
  });

  await t.test('deleteProductFromIndex() resolves without making any network call', async () => {
    await assert.doesNotReject(() => deleteProductFromIndex('p1'));
  });

  await t.test('searchProductIds() returns null, signalling the caller to fall back to Postgres', async () => {
    const result = await searchProductIds({ query: 'anything' });
    assert.equal(result, null);
  });
});
