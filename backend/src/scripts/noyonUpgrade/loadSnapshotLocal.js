// Loads a products snapshot (the JSON written by
// noyon-telecom-kit/scripts/fetch_noyon_products.py from the live public API)
// into a LOCAL database, so the import scripts and the site can be tested
// against a copy of the real catalog before anything touches production.
//
// Refuses to run unless DATABASE_URL points at localhost.
//
// Usage:
//   cd backend
//   DATABASE_URL=postgresql://me@localhost:5432/noyon_local node src/scripts/noyonUpgrade/loadSnapshotLocal.js ../../noyon-telecom-kit/data/noyon_products.json
import fs from 'node:fs';
import prisma from '../../prismaClient.js';
import { assertLocalDatabase } from './dbGuard.js';

const FIELDS = [
  'id', 'slug', 'name', 'desc', 'categories', 'category', 'images', 'img', 'price', 'compareAt', 'stock',
  'lowStockThreshold', 'moq', 'bulkPricing', 'rating', 'reviewCount', 'sku', 'brand', 'compatibleModels',
  'warranty', 'published', 'createdAt', 'updatedAt',
];

async function main() {
  assertLocalDatabase();
  const file = process.argv[2];
  if (!file) throw new Error('Pass the snapshot JSON path as the first argument.');
  const products = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = products.map((p) => {
    const row = {};
    for (const f of FIELDS) if (p[f] !== undefined) row[f] = p[f];
    row.price = Number(p.price) || 0;
    row.readyToSell = Number(p.stock) > 0 && row.price > 0;
    return row;
  });
  const result = await prisma.product.createMany({ data: rows, skipDuplicates: true });
  console.log(`Loaded ${result.count} of ${rows.length} products into the local database.`);
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
