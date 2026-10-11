import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductWhere, buildProductOrderBy, parsePagination, MAX_LIMIT, computeReadyToSell, resolvePriceUpdate, resolveQualityOptionsUpdate, parseOptionalPrice } from './productQuery.js';

test('buildProductWhere', async (t) => {
  await t.test('defaults to published-only when status is not provided (storefront case)', () => {
    const where = buildProductWhere({});
    assert.deepEqual(where, { published: true });
  });

  await t.test('status "all" applies no published filter (admin "all" case)', () => {
    const where = buildProductWhere({ status: 'all' });
    assert.equal('published' in where, false);
  });

  await t.test('status "published" and "draft" map correctly', () => {
    assert.equal(buildProductWhere({ status: 'published' }).published, true);
    assert.equal(buildProductWhere({ status: 'draft' }).published, false);
  });

  await t.test('category "All" is treated as no filter', () => {
    const where = buildProductWhere({ category: 'All', status: 'all' });
    assert.equal('categories' in where, false);
  });

  await t.test('a real category adds an array_contains filter', () => {
    const where = buildProductWhere({ category: 'Battery', status: 'all' });
    assert.deepEqual(where.categories, { array_contains: 'Battery' });
  });

  await t.test('brand "All" is treated as no filter, a real brand is applied', () => {
    assert.equal('brand' in buildProductWhere({ brand: 'All', status: 'all' }), false);
    assert.equal(buildProductWhere({ brand: 'Apple', status: 'all' }).brand, 'Apple');
  });

  await t.test('single-word search builds an OR across name/sku/brand, case-insensitive', () => {
    const where = buildProductWhere({ search: '  oled  ', status: 'all' });
    assert.equal(where.AND.length, 1);
    for (const clause of where.AND[0].OR) {
      const [field] = Object.keys(clause);
      assert.equal(clause[field].contains, 'oled'); // trimmed
      assert.equal(clause[field].mode, 'insensitive');
    }
  });

  await t.test('multi-word search requires each word to match somewhere (word-order independent)', () => {
    const where = buildProductWhere({ search: 'iphone 13 screen', status: 'all' });
    assert.equal(where.AND.length, 3);
    assert.deepEqual(
      where.AND.map((clause) => clause.OR[0].name.contains),
      ['iphone', '13', 'screen']
    );
    for (const wordClause of where.AND) {
      assert.equal(wordClause.OR.length, 3); // name, sku, brand (descriptions are template text — not searched)
    }
  });

  await t.test('blank/whitespace-only search adds no AND clause', () => {
    const where = buildProductWhere({ search: '   ', status: 'all' });
    assert.equal('AND' in where, false);
  });

  await t.test('category + brand + search + status combine into one where clause', () => {
    const where = buildProductWhere({ category: 'Display', brand: 'Samsung', search: 'oled', status: 'published' });
    assert.deepEqual(where, {
      published: true,
      categories: { array_contains: 'Display' },
      brand: 'Samsung',
      AND: [
        {
          OR: [
            { name: { contains: 'oled', mode: 'insensitive' } },
            { sku: { contains: 'oled', mode: 'insensitive' } },
            { brand: { contains: 'oled', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });
});

test('buildProductOrderBy', async (t) => {
  await t.test('defaults to sellable-first, then shown prices, then newest', () => {
    const expected = [{ readyToSell: 'desc' }, { priceStatus: 'desc' }, { createdAt: 'desc' }];
    assert.deepEqual(buildProductOrderBy(), expected);
    assert.deepEqual(buildProductOrderBy(''), expected);
    assert.deepEqual(buildProductOrderBy('not-a-real-sort'), expected);
  });

  await t.test('recognizes price-asc, price-desc, and rating — price sorts put published prices first', () => {
    assert.deepEqual(buildProductOrderBy('price-asc'), [{ priceStatus: 'desc' }, { price: 'asc' }, { createdAt: 'desc' }]);
    assert.deepEqual(buildProductOrderBy('price-desc'), [{ priceStatus: 'desc' }, { price: 'desc' }, { createdAt: 'desc' }]);
    assert.deepEqual(buildProductOrderBy('rating'), { rating: 'desc' });
  });
});

test('buildProductWhere priceStatus filter (admin only)', async (t) => {
  await t.test('filters by price shown/hidden when asked', () => {
    assert.equal(buildProductWhere({ status: 'all', priceStatus: 'draft' }).priceStatus, 'draft');
    assert.equal(buildProductWhere({ status: 'all', priceStatus: 'published' }).priceStatus, 'published');
  });
  await t.test('"all" or nothing adds no filter', () => {
    assert.equal('priceStatus' in buildProductWhere({ status: 'all', priceStatus: 'all' }), false);
    assert.equal('priceStatus' in buildProductWhere({}), false);
  });
});

test('computeReadyToSell', async (t) => {
  await t.test('true only when stock and price are positive AND the price is published', () => {
    assert.equal(computeReadyToSell(5, 100, 'published'), true);
    assert.equal(computeReadyToSell(0, 100, 'published'), false);
    assert.equal(computeReadyToSell(5, 0, 'published'), false);
    assert.equal(computeReadyToSell(0, 0, 'published'), false);
  });

  await t.test('a hidden (draft) price is never sellable', () => {
    assert.equal(computeReadyToSell(5, 100, 'draft'), false);
    assert.equal(computeReadyToSell(5, 100), false);
  });

  await t.test('coerces string inputs (e.g. straight from req.body/CSV parsing)', () => {
    assert.equal(computeReadyToSell('5', '100', 'published'), true);
    assert.equal(computeReadyToSell('0', '100', 'published'), false);
  });
});

test('resolvePriceUpdate (publish-on-edit)', async (t) => {
  await t.test('typing a price > 0 publishes it', () => {
    assert.deepEqual(resolvePriceUpdate({ price: '1150' }, 0), { price: 1150, priceStatus: 'published' });
    assert.deepEqual(resolvePriceUpdate({ price: 990 }, 880), { price: 990, priceStatus: 'published' });
  });

  await t.test('no price and no status changes nothing — an edit to name/photo never publishes a hidden price', () => {
    assert.deepEqual(resolvePriceUpdate({}, 880), {});
    assert.deepEqual(resolvePriceUpdate({ price: '' }, 880), {});
    assert.deepEqual(resolvePriceUpdate({ price: null }, 880), {});
  });

  await t.test('price 0 means "no price" and hides it', () => {
    assert.deepEqual(resolvePriceUpdate({ price: 0 }, 880), { price: 0, priceStatus: 'draft' });
  });

  await t.test('priceStatus draft hides the price but keeps the value', () => {
    assert.deepEqual(resolvePriceUpdate({ priceStatus: 'draft' }, 880), { priceStatus: 'draft' });
    assert.deepEqual(resolvePriceUpdate({ price: 900, priceStatus: 'draft' }, 880), { price: 900, priceStatus: 'draft' });
  });

  await t.test('priceStatus published needs a real price', () => {
    assert.deepEqual(resolvePriceUpdate({ priceStatus: 'published' }, 880), { priceStatus: 'published' });
    assert.ok(resolvePriceUpdate({ priceStatus: 'published' }, 0).error);
    assert.ok(resolvePriceUpdate({ price: 0, priceStatus: 'published' }, 880).error);
  });

  await t.test('rejects bad input instead of storing it', () => {
    assert.ok(resolvePriceUpdate({ price: 'abc' }, 0).error);
    assert.ok(resolvePriceUpdate({ price: -5 }, 0).error);
    assert.ok(resolvePriceUpdate({ priceStatus: 'live' }, 0).error);
  });
});

test('parseOptionalPrice', async (t) => {
  await t.test('undefined = leave as is, empty = clear, positive numbers kept', () => {
    assert.equal(parseOptionalPrice(undefined), undefined);
    assert.equal(parseOptionalPrice(''), null);
    assert.equal(parseOptionalPrice(null), null);
    assert.equal(parseOptionalPrice('1199'), 1199);
    assert.equal(parseOptionalPrice(0), null);
    assert.equal(parseOptionalPrice('abc'), null);
  });
});

test('parsePagination', async (t) => {
  await t.test('defaults to page 1 with the caller-provided default limit', () => {
    const p = parsePagination({}, { defaultLimit: 12 });
    assert.equal(p.page, 1);
    assert.equal(p.limit, 12);
    assert.equal(p.skip, 0);
    assert.equal(p.take, 12);
  });

  await t.test('computes skip correctly for later pages', () => {
    const p = parsePagination({ page: '3', limit: '20' }, { defaultLimit: 12 });
    assert.equal(p.page, 3);
    assert.equal(p.limit, 20);
    assert.equal(p.skip, 40);
    assert.equal(p.take, 20);
  });

  await t.test('never lets page go below 1, even for 0/negative/garbage input', () => {
    assert.equal(parsePagination({ page: '0' }).page, 1);
    assert.equal(parsePagination({ page: '-5' }).page, 1);
    assert.equal(parsePagination({ page: 'not-a-number' }).page, 1);
  });

  await t.test('clamps limit to MAX_LIMIT — never lets a client request the whole 10,000+ catalog in one page', () => {
    const p = parsePagination({ limit: '999999' }, { defaultLimit: 12 });
    assert.equal(p.limit, MAX_LIMIT);
    assert.equal(p.take, MAX_LIMIT);
  });

  await t.test('never lets limit go below 1 for a genuinely invalid value', () => {
    assert.equal(parsePagination({ limit: '-10' }, { defaultLimit: 12 }).limit, 1);
    assert.equal(parsePagination({ limit: 'not-a-number' }, { defaultLimit: 12 }).limit, 12);
  });

  await t.test('limit=0 is treated as "not specified" and falls back to the default (0 is falsy in `parseInt(...) || default`)', () => {
    // Documents existing, harmless behavior rather than asserting a stricter
    // rule that isn't actually what the code does.
    assert.equal(parsePagination({ limit: '0' }, { defaultLimit: 12 }).limit, 12);
  });

  await t.test('admin default limit (50) differs from storefront default (12) when unspecified', () => {
    assert.equal(parsePagination({}, { defaultLimit: 50 }).limit, 50);
    assert.equal(parsePagination({}, { defaultLimit: 12 }).limit, 12);
  });
});

test('resolveQualityOptionsUpdate (grades in an admin save)', async (t) => {
  const grades = [{ label: 'Original', price: 1699 }, { label: 'High Quality', price: 999 }];
  await t.test('not sent: grades untouched', () => {
    assert.equal(resolveQualityOptionsUpdate({ price: 500 }), null);
  });
  await t.test('grades saved go live, priced at the cheapest grade', () => {
    assert.deepEqual(resolveQualityOptionsUpdate({ qualityOptions: grades }), {
      qualityOptions: [{ label: 'High Quality', price: 999 }, { label: 'Original', price: 1699 }],
      price: 999,
      priceStatus: 'published',
    });
  });
  await t.test('an explicit draft keeps them hidden', () => {
    assert.equal(resolveQualityOptionsUpdate({ qualityOptions: grades, priceStatus: 'draft' }).priceStatus, 'draft');
  });
  await t.test('removing every grade without typing a price hides the price', () => {
    assert.deepEqual(resolveQualityOptionsUpdate({ qualityOptions: [] }, { qualityOptions: grades }), { qualityOptions: [], priceStatus: 'draft' });
  });
  await t.test('removing the grades and typing one price: the typed price decides', () => {
    assert.deepEqual(resolveQualityOptionsUpdate({ qualityOptions: [], price: '1200' }, { qualityOptions: grades }), { qualityOptions: [] });
  });
  await t.test('empty rows only (no real grade) on a product without grades changes nothing else', () => {
    assert.deepEqual(resolveQualityOptionsUpdate({ qualityOptions: [{ label: '', price: '' }] }, { qualityOptions: [] }), { qualityOptions: [] });
  });
});
