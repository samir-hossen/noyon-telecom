// Applies the reviewed noyonUpgrade files to a database (MASTER-PROMPT
// phase 7). DRY-RUN by default: prints what would change and writes nothing.
//
//   import/drafts-existing.json     hidden draft price for every existing product
//   import/name-fixes.json          clean names, brands, compatible models, new slugs (+ 301s), unpublish
//   import/existing-descriptions.json  new English descriptions for existing products (optional)
//   import/new-products.json        the new products (A–Z, except Battery)
//
// Prices: shown where the builder found them reliable (owner's decision, 11
// Oct 2026 — see CLAUDE.md), hidden otherwise. --no-publish hides every price
// instead (all drafts).
//
// The files were built from the 11 Oct catalog (--snapshot, default the kit's
// data/noyon_products.json). Prices, names, brands and descriptions the owner
// changed in admin since then are kept, and listed in the summary.
//
// --apply first writes a full JSON backup of the Product and
// ProductSlugRedirect tables to --backup-dir, then writes in batches of 100.
// Re-running is safe: new products are matched by SKU and slug, so nothing is
// created twice.
//
// Usage (from website/backend):
//   node src/scripts/noyonUpgrade/applyImport.js --import ../../import                 # dry-run
//   node src/scripts/noyonUpgrade/applyImport.js --import ../../import --apply --backup-dir ../../backups
// A database that isn't on localhost also needs --production (the backup
// still runs first).
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../../prismaClient.js';
import { isLocalDatabase, databaseHost } from './dbGuard.js';
import { planExisting, planNew, planOldAdminPrices, planGradeUpdates, toCreateData } from './importPlan.js';
import { backfillReadyToSell } from '../../backfillReadyToSell.js';
import { indexProducts } from '../../utils/search.js';

const BATCH = 100;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const has = (flag) => process.argv.includes(`--${flag}`);

const IMPORT_DIR = path.resolve(arg('import', '../../import'));
const APPLY = has('apply');
const BACKUP_DIR = path.resolve(arg('backup-dir', '../../backups'));
const PUBLISH = !has('no-publish');
const SNAPSHOT_FILE = path.resolve(arg('snapshot', '../../noyon-telecom-kit/data/noyon_products.json'));

function readJson(name, fallback = null) {
  const file = path.join(IMPORT_DIR, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function backup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const [products, redirects] = await Promise.all([prisma.product.findMany(), prisma.productSlugRedirect.findMany()]);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `db-products-${databaseHost()}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), host: databaseHost(), products, redirects }));
  return { file, products: products.length };
}

function readSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return null;
  return new Map(JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')).map((p) => [p.id, p]));
}

// When the hidden-price migration ran (= when this upgrade was deployed).
async function hiddenPriceDeployedAt() {
  try {
    const rows = await prisma.$queryRaw`SELECT finished_at FROM "_prisma_migrations" WHERE migration_name = '20261011074217_hidden_draft_price' AND finished_at IS NOT NULL`;
    return rows[0]?.finished_at || null;
  } catch {
    return null; // no migrations table: nothing to compare against, so nothing is re-shown
  }
}

function tally(list, key) {
  const out = {};
  for (const x of list) out[x[key]] = (out[x[key]] || 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

async function main() {
  const local = isLocalDatabase();
  if (!local && !has('production')) {
    throw new Error(`DATABASE_URL points at "${databaseHost()}". For a non-local database add --production (after deploying the new code, which adds the new columns).`);
  }
  const drafts = readJson('drafts-existing.json', []);
  const fixes = readJson('name-fixes.json', []);
  const descriptions = readJson('existing-descriptions.json', null);
  const newProducts = readJson('new-products.json', []);
  if (newProducts.some((n) => !n.desc)) {
    console.log('NOTE: some new products have no description yet (build with --descriptions after the owner OKs the templates).');
  }

  const snapshot = readSnapshot();
  if (!snapshot) console.log(`NOTE: no snapshot at ${SNAPSHOT_FILE} — descriptions edited in admin since 11 Oct can't be told apart and would be replaced.`);

  const dbProducts = await prisma.product.findMany();
  const existingPlan = planExisting(dbProducts, { drafts, fixes, descriptions, snapshot, publish: PUBLISH });
  const { create, alreadyThere } = planNew(newProducts, dbProducts);
  const gradeUpdates = planGradeUpdates(newProducts, dbProducts, { publish: PUBLISH });
  const oldAdminPrices = planOldAdminPrices(dbProducts, { drafts, newProducts, deployedAt: await hiddenPriceDeployedAt(), publish: PUBLISH });

  const summary = {
    database: databaseHost(),
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    productsNow: dbProducts.length,
    existing: {
      updated: existingPlan.length,
      draftPriceSet: existingPlan.filter((x) => x.data.draftPrice).length,
      priceShown: existingPlan.filter((x) => x.data.priceStatus === 'published').length,
      priceHidden: existingPlan.filter((x) => x.data.priceStatus === 'draft').length,
      noDraft: existingPlan.filter((x) => 'draftPrice' in x.data && !x.data.draftPrice).length,
      renamed: existingPlan.filter((x) => x.data.name).length,
      slugChanges: existingPlan.filter((x) => x.redirectFrom).length,
      brandSet: existingPlan.filter((x) => 'brand' in x.data).length,
      newDescriptions: existingPlan.filter((x) => x.data.desc).length,
      unpublish: existingPlan.filter((x) => x.unpublish).map((x) => x.before.name),
      keptYourEdits: existingPlan.filter((x) => x.kept.length).map((x) => `${x.before.name}: ${x.kept.join(', ')}`),
      pricedNow: dbProducts.filter((p) => p.price > 0).length, // their prices stay hidden until the owner publishes them
      pricesShownNow: dbProducts.filter((p) => p.priceStatus === 'published').length,
    },
    newProducts: {
      toCreate: create.length,
      alreadyInDatabase: alreadyThere,
      withDraft: create.filter((n) => n.draftPrice).length,
      priceShown: PUBLISH ? create.filter((n) => n.priceStatus === 'published').length : 0,
      withGrades: PUBLISH ? create.filter((n) => n.qualityOptions?.length).length : 0,
      alreadyInDatabaseGetGrades: gradeUpdates.length,
      setManually: create.filter((n) => String(n.flag || '').startsWith('SET MANUALLY')).length,
      byCategory: tally(create, 'category'),
      byBrand: tally(create, 'brand'),
    },
    addedInAdminSince11Oct: { priceShownAgain: oldAdminPrices.map((p) => `${p.name} (৳${p.price})`) },
    productsAfter: dbProducts.length + create.length,
  };

  if (!APPLY) {
    fs.writeFileSync(path.join(IMPORT_DIR, 'dry-run.json'), JSON.stringify({
      summary,
      sampleExisting: existingPlan.slice(0, 40).map((x) => ({ old: x.before.name, ...x.data, redirectFrom: x.redirectFrom })),
      sampleNew: create.filter((_, i) => i % Math.max(1, Math.floor(create.length / 40)) === 0).slice(0, 40),
    }, null, 1));
    console.log(JSON.stringify(summary, null, 2));
    console.log(`\nDRY-RUN — nothing written. Details: ${path.join(IMPORT_DIR, 'dry-run.json')}`);
    return;
  }

  if (create.some((n) => !n.desc) && !has('allow-empty-descriptions')) {
    throw new Error('Some new products have no description — rebuild the import files with --descriptions first.');
  }
  const b = await backup();
  console.log(`Backup: ${b.products} products -> ${b.file}`);

  let done = 0;
  for (const batch of chunks(existingPlan, BATCH)) {
    await prisma.$transaction(async (tx) => {
      for (const x of batch) {
        await tx.product.update({ where: { id: x.id }, data: x.data });
        if (x.redirectFrom) {
          await tx.productSlugRedirect.upsert({
            where: { slug: x.redirectFrom },
            create: { slug: x.redirectFrom, productId: x.id },
            update: { productId: x.id },
          });
        }
      }
      // Up to 200 round trips to a remote database per batch — far past
      // Prisma's default 5-second interactive-transaction limit.
    }, { maxWait: 60_000, timeout: 300_000 });
    done += batch.length;
    console.log(`existing: ${done}/${existingPlan.length}`);
  }

  let created = 0;
  for (const batch of chunks(create, BATCH)) {
    const result = await prisma.product.createMany({ data: batch.map((n) => toCreateData(n, { publish: PUBLISH })), skipDuplicates: true });
    created += result.count;
    console.log(`new: ${created}/${create.length}`);
  }

  let graded = 0;
  for (const batch of chunks(gradeUpdates, BATCH)) {
    await prisma.$transaction(async (tx) => {
      for (const g of batch) await tx.product.update({ where: { id: g.id }, data: g.data });
    }, { maxWait: 60_000, timeout: 300_000 });
    graded += batch.length;
    console.log(`grade prices: ${graded}/${gradeUpdates.length}`);
  }

  if (oldAdminPrices.length) {
    await prisma.product.updateMany({ where: { id: { in: oldAdminPrices.map((p) => p.id) } }, data: { priceStatus: 'published' } });
    console.log(`prices typed in admin after 11 Oct shown again: ${oldAdminPrices.length}`);
  }

  const fixedReady = await backfillReadyToSell();
  const touchedIds = [...existingPlan.map((x) => x.id), ...oldAdminPrices.map((p) => p.id), ...gradeUpdates.map((g) => g.id)];
  const touched = await prisma.product.findMany({ where: { OR: [{ id: { in: touchedIds } }, { sku: { in: create.map((n) => n.sku) } }] } });
  await indexProducts(touched).catch((err) => console.error('Search index update failed (non-fatal):', err.message));
  console.log(JSON.stringify({ ...summary, applied: { existingUpdated: done, newCreated: created, gradePricesAdded: graded, oldAdminPricesShown: oldAdminPrices.length, readyToSellFixed: fixedReady } }, null, 2));
  console.log('\nDone. Restart the API (or wait 5 minutes) so its in-memory caches show the new catalog.');
}

main()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
