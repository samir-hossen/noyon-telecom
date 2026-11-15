import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import prisma from '../prismaClient.js';
import products from './products.routes.js';
import { invalidateProductCache } from '../utils/cache.js';

test('finder filters load only taxonomy and reuse it until an admin invalidates', async (t) => {
  invalidateProductCache();
  t.after(invalidateProductCache);
  let queries = 0;
  const originalQuery = prisma.$queryRaw;
  const originalFind = prisma.product.findMany;
  const originalCount = prisma.product.count;
  t.after(() => {
    prisma.$queryRaw = originalQuery;
    prisma.product.findMany = originalFind;
    prisma.product.count = originalCount;
  });
  prisma.$queryRaw = async (sql) => {
    queries++;
    return sql.join('').includes('AS cat')
      ? [{ cat: 'Display' }, { cat: 'Battery' }]
      : [{ brand: 'Samsung' }];
  };
  prisma.product.findMany = () => { throw new Error('must not fetch products'); };
  prisma.product.count = () => { throw new Error('must not count products'); };
  const app = express().use('/products', products);
  const first = await request(app).get('/products/filters').expect(200);
  assert.deepEqual(first.body, { categories: ['Display'], brands: ['Samsung'] });
  assert.match(first.headers['cache-control'], /public/);
  await request(app).get('/products/filters').expect(200);
  assert.equal(queries, 2);
  invalidateProductCache();
  await request(app).get('/products/filters').expect(200);
  assert.equal(queries, 4);
});

test('normal search exposes its correction and punctuation cannot return the catalog', async (t) => {
  invalidateProductCache();
  const original = { query: prisma.$queryRaw, find: prisma.product.findMany, count: prisma.product.count };
  t.after(() => {
    prisma.$queryRaw = original.query;
    prisma.product.findMany = original.find;
    prisma.product.count = original.count;
    invalidateProductCache();
  });
  let lastWhere;
  const product = { id: 'test-a15', name: 'Samsung A15 Display', category: 'Display', brand: 'Samsung', stock: 1, price: 1000, priceStatus: 'published' };
  prisma.$queryRaw = async (sql) => sql.join('').includes('AS cat') ? [{ cat: 'Display' }] : [{ brand: 'Samsung' }];
  prisma.product.findMany = async ({ where }) => { lastWhere = where; return where.id ? [] : [product]; };
  prisma.product.count = async ({ where }) => where.id ? 0 : 1;
  const app = express().use('/products', products);
  const corrected = await request(app).get('/products').query({ search: 'স্যামসাং A১৫ ডিসপ্লে?', card: '1' }).expect(200);
  assert.equal(corrected.body.correctedSearch, 'samsung A15 display');
  assert.equal(corrected.body.products[0].id, 'test-a15');
  assert.equal(lastWhere.published, true);
  assert.equal(corrected.body.fuzzy, undefined);
  const empty = await request(app).get('/products').query({ search: '?!', card: '1' }).expect(200);
  assert.equal(empty.body.total, 0);
  assert.deepEqual(empty.body.products, []);
  assert.deepEqual(lastWhere.id, { in: [] });
});
