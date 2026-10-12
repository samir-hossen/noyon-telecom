// Applies a price list the owner sends (import/owner-prices/*.json): each
// listed product gets exactly those grades and goes live; with
// "hideOthersInScope" the rest of that brand + category goes back to
// "price on WhatsApp" (see planOwnerPrices in importPlan.js).
//
// DRY-RUN by default. --apply first saves the affected rows to --backup-dir.
//   node src/scripts/noyonUpgrade/applyOwnerPrices.js --file ../../import/owner-prices/iphone-back-glass-2026-10-12.json
//   ... --apply --backup-dir ../../backups   (+ --production off localhost)
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../../prismaClient.js';
import { isLocalDatabase, databaseHost } from './dbGuard.js';
import { planOwnerPrices } from './importPlan.js';
import { computeReadyToSell } from '../../utils/productQuery.js';
import { indexProducts } from '../../utils/search.js';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const APPLY = process.argv.includes('--apply');
const taka = (n) => `৳${Number(n).toLocaleString('en-US')}`;

async function main() {
  const file = arg('file');
  if (!file) throw new Error('--file <price list .json> is required');
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (APPLY && !isLocalDatabase() && !process.argv.includes('--production')) {
    throw new Error(`Database ${databaseHost()} isn't local — add --production to write to it.`);
  }
  const where = { ...(list.scope?.brand ? { brand: list.scope.brand } : {}), ...(list.scope?.category ? { category: list.scope.category } : {}) };
  const names = (list.prices || []).map((e) => e.name);
  const products = await prisma.product.findMany({ where: { OR: [where, { name: { in: names } }] } });
  const plan = planOwnerPrices(products, list);

  for (const x of plan.set) {
    const before = x.p.priceStatus === 'published' ? taka(x.p.price) : 'hidden';
    console.log(`SET   ${x.p.name.padEnd(32)} ${before.padStart(8)} → ${x.grades.map((g) => `${g.label} ${taka(g.price)}`).join(' · ')}`);
  }
  for (const p of plan.hide) console.log(`HIDE  ${p.name.padEnd(32)} ${taka(p.price).padStart(8)} → price on WhatsApp`);
  for (const n of plan.unmatched) console.log(`NOT FOUND  ${n}`);
  console.log(`\n${plan.set.length} priced, ${plan.hide.length} hidden, ${plan.unmatched.length} not found`);
  if (!APPLY) {
    console.log('DRY-RUN — nothing written. Add --apply to write.');
    return;
  }

  const backupDir = arg('backup-dir');
  if (!backupDir) throw new Error('--apply needs --backup-dir');
  const backupFile = path.join(backupDir, `owner-prices-before-${path.basename(file, '.json')}-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify([...plan.set.map((x) => x.p), ...plan.hide], null, 1));
  console.log(`Backup: ${backupFile}`);

  const note = list.note || 'owner price list';
  await prisma.$transaction([
    ...plan.set.map((x) => prisma.product.update({
      where: { id: x.p.id },
      data: {
        qualityOptions: x.grades,
        price: x.price,
        draftPrice: x.price,
        priceStatus: 'published',
        priceNote: note,
        readyToSell: computeReadyToSell(x.p.stock, x.price, 'published'),
      },
    })),
    ...plan.hide.map((p) => prisma.product.update({
      where: { id: p.id },
      data: { priceStatus: 'draft', readyToSell: false, priceNote: `${p.priceNote || ''} · price hidden: not on the ${note}` },
    })),
  ], { timeout: 120_000 });
  console.log('Done. Restart the API (or wait 5 minutes) so its caches show the prices.');
  const changed = await prisma.product.findMany({ where: { id: { in: [...plan.set.map((x) => x.p.id), ...plan.hide.map((p) => p.id)] } } });
  await indexProducts(changed).catch((err) => console.error('Search index update failed:', err.message));
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
