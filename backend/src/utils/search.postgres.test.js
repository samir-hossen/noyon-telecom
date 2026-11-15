import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { searchProductIdsPostgres } from './search.js';

// Optional real PostgreSQL regression check. Use an isolated local database
// with pg_trgm installed; never use storefront/customer data as fixtures.
const databaseUrl = process.env.TEST_SEARCH_DATABASE_URL;
test('typo fallback preserves model, part and storefront filters in PostgreSQL', { skip: !databaseUrl }, async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname));
  const db = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    await db.$transaction(async (prisma) => {
      await prisma.$executeRaw`CREATE TEMP TABLE "Product" (
        id text PRIMARY KEY, name text, sku text, brand text, categories jsonb,
        published boolean, "viewCount" int DEFAULT 0, "createdAt" timestamp DEFAULT now()
      ) ON COMMIT DROP`;
      for (const [id, name, brand, category, published] of [
        ['ip13', 'Apple iPhone 13 Display', 'Apple', 'Display', true],
        ['ip14', 'Apple iPhone 14 Display', 'Apple', 'Display', true],
        ['ip13cam', 'Apple iPhone 13 Camera', 'Apple', 'Camera', true],
        ['a15', 'Samsung Galaxy A15 Display', 'Samsung', 'Display', true],
        ['a99', 'Samsung Galaxy A99 Display', 'Samsung', 'Display', true],
        ['op16', 'Oppo A16 Charging Logic', 'Oppo', 'Charging Logic', true],
        ['op16k', 'Oppo A16K Charging Logic', 'Oppo', 'Charging Logic', true],
        ['draft', 'Samsung Galaxy A15 Display', 'Samsung', 'Display', false],
        ['off', 'Samsung Galaxy A15 Battery', 'Samsung', 'Battery', true],
      ]) {
        await prisma.$executeRaw`INSERT INTO "Product" (id, name, sku, brand, categories, published)
          VALUES (${id}, ${name}, ${`NT-${id}`}, ${brand}, ${JSON.stringify([category])}::jsonb, ${published})`;
      }
      for (const [query, ids] of [
        ['ihpone 13 disply', ['ip13']],
        ['স্যামসাং A১৫ ডিসপ্লে?', ['a15']],
        ['opoo a16 charjing port', ['op16']],
        ['Samsung A999 displayz', []],
        ['iphone 13 camera xxxyyy', []],
        ['iphone 13 speaker', []],
        ['Samsung A15 battery', []],
      ]) {
        const result = await searchProductIdsPostgres({ prisma, query });
        assert.deepEqual(result.ids.sort(), ids, query);
        assert.equal(result.total, ids.length, query);
      }
      assert.equal((await searchProductIdsPostgres({ prisma, query: 'iphone 13', brand: 'Samsung' })).total, 0);
      assert.equal((await searchProductIdsPostgres({ prisma, query: 'iphone 13', category: 'Display' })).total, 1);
    });
  } finally {
    await db.$disconnect();
  }
});
