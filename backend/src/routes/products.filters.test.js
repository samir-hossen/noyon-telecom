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
