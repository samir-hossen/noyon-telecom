import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductWhere, buildProductOrderBy, parsePagination, MAX_LIMIT } from './productQuery.js';

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

  await t.test('search builds an OR across name/desc/sku/brand, case-insensitive', () => {
    const where = buildProductWhere({ search: '  iphone 13  ', status: 'all' });
    assert.equal(where.OR.length, 4);
    for (const clause of where.OR) {
      const [field] = Object.keys(clause);
      assert.equal(clause[field].contains, 'iphone 13'); // trimmed
      assert.equal(clause[field].mode, 'insensitive');
    }
  });

  await t.test('blank/whitespace-only search adds no OR clause', () => {
    const where = buildProductWhere({ search: '   ', status: 'all' });
    assert.equal('OR' in where, false);
  });

  await t.test('category + brand + search + status combine into one where clause', () => {
    const where = buildProductWhere({ category: 'Display', brand: 'Samsung', search: 'oled', status: 'published' });
    assert.deepEqual(where, {
      published: true,
      categories: { array_contains: 'Display' },
      brand: 'Samsung',
      OR: [
        { name: { contains: 'oled', mode: 'insensitive' } },
        { desc: { contains: 'oled', mode: 'insensitive' } },
        { sku: { contains: 'oled', mode: 'insensitive' } },
        { brand: { contains: 'oled', mode: 'insensitive' } },
      ],
    });
  });
});

test('buildProductOrderBy', async (t) => {
  await t.test('defaults to newest first', () => {
    assert.deepEqual(buildProductOrderBy(), { createdAt: 'desc' });
    assert.deepEqual(buildProductOrderBy(''), { createdAt: 'desc' });
    assert.deepEqual(buildProductOrderBy('not-a-real-sort'), { createdAt: 'desc' });
  });

  await t.test('recognizes price-asc, price-desc, and rating', () => {
    assert.deepEqual(buildProductOrderBy('price-asc'), { price: 'asc' });
    assert.deepEqual(buildProductOrderBy('price-desc'), { price: 'desc' });
    assert.deepEqual(buildProductOrderBy('rating'), { rating: 'desc' });
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
