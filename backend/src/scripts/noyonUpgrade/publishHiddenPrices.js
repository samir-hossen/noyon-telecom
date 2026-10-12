// Owner, 12 Oct 2026: "make the hidden ones live" (except the switched-off
// glass parts). Shows the hidden prices that can be shown — see
// planHiddenPrices in importPlan.js:
//   cheap parts          market price − 20%, ending in 9 (owner's choice)
//   owner's own price    kept hidden on 11 Oct because the name was unclear
//   suggested price      the rule's price, when the market's prices agree
// Two market prices far apart, wrong market data and products with no price
// anywhere stay "price on WhatsApp" for the owner to set in the admin panel.
//
// DRY-RUN by default (prints the counts, writes a preview CSV). --apply first
// saves the affected rows to --backup-dir, then writes.
//   node src/scripts/noyonUpgrade/publishHiddenPrices.js --out ../../import/hidden-prices-preview.csv
//   node src/scripts/noyonUpgrade/publishHiddenPrices.js --apply --backup-dir ../../backups   (+ --production off localhost)
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../../prismaClient.js';
import { isLocalDatabase, databaseHost } from './dbGuard.js';
import { planHiddenPrices } from './importPlan.js';
import { computeReadyToSell } from '../../utils/productQuery.js';
import { indexProducts } from '../../utils/search.js';

const BATCH = 200;
const STAMP = 'shown 12 Oct 2026 (owner: show the hidden prices)';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const APPLY = process.argv.includes('--apply');
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  if (APPLY && !isLocalDatabase() && !process.argv.includes('--production')) {
    throw new Error(`Database ${databaseHost()} isn't local — add --production to write to it.`);
  }
  const rows = await prisma.product.findMany({
    where: { published: true, NOT: { priceStatus: 'published' } },
    select: { id: true, sku: true, name: true, category: true, categories: true, published: true, priceStatus: true, price: true, draftPrice: true, referencePrice: true, priceNote: true, stock: true },
  });
  const plan = planHiddenPrices(rows);
  const toShow = [
    ...plan.cheap.map((x) => ({ ...x, group: 'cheap part −20%', draftPrice: x.price })),
    ...plan.ownerKept.map((x) => ({ ...x, group: "owner's own price" })),
    ...plan.suggested.map((x) => ({ ...x, group: 'suggested price' })),
  ];

  const byCategory = {};
  for (const x of toShow) byCategory[x.p.category] = (byCategory[x.p.category] || 0) + 1;
  console.log(JSON.stringify({
    hiddenNow: rows.length,
    show: { cheapParts: plan.cheap.length, ownersOwnPrice: plan.ownerKept.length, suggestedPrice: plan.suggested.length, total: toShow.length },
    byCategory,
    stayHidden: { marketPricesFarApart: plan.keptHidden.filter((x) => x.reason !== 'market data wrong').length, marketDataWrong: plan.keptHidden.filter((x) => x.reason === 'market data wrong').length, noPriceAnywhere: plan.noPrice.length },
  }, null, 2));

  const out = arg('out');
  if (out) {
    const lines = [['name', 'sku', 'category', 'market price', 'new price', 'why'].map(csvCell).join(',')];
    for (const x of toShow) lines.push([x.p.name, x.p.sku, x.p.category, x.p.referencePrice, x.price, x.group].map(csvCell).join(','));
    for (const x of plan.keptHidden) lines.push([x.p.name, x.p.sku, x.p.category, x.p.referencePrice, '', `stays hidden: ${x.reason}`].map(csvCell).join(','));
    fs.writeFileSync(out, `${lines.join('\n')}\n`);
    console.log(`Preview: ${out}`);
  }
  if (!APPLY) {
    console.log('\nDRY-RUN — nothing written. Add --apply to show these prices.');
    return;
  }

  const backupDir = arg('backup-dir');
  if (!backupDir) throw new Error('--apply needs --backup-dir');
  const backupFile = path.join(backupDir, `hidden-prices-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(toShow.map((x) => x.p), null, 1));
  console.log(`Backup of the ${toShow.length} rows: ${backupFile}`);

  let done = 0;
  for (let i = 0; i < toShow.length; i += BATCH) {
    const batch = toShow.slice(i, i + BATCH);
    await prisma.$transaction(batch.map((x) => prisma.product.update({
      where: { id: x.p.id },
      data: {
        price: x.price,
        priceStatus: 'published',
        ...(x.draftPrice ? { draftPrice: x.draftPrice } : {}),
        priceNote: `${x.note || x.p.priceNote || ''} · ${STAMP}`,
        readyToSell: computeReadyToSell(x.p.stock, x.price, 'published'),
      },
    })));
    done += batch.length;
    process.stdout.write(`\r${done}/${toShow.length}`);
  }
  console.log('\nDone. Restart the API (or wait 5 minutes) so its caches show the prices.');
  const changed = await prisma.product.findMany({ where: { id: { in: toShow.map((x) => x.p.id) } } });
  await indexProducts(changed).catch((err) => console.error('Search index update failed:', err.message));
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
