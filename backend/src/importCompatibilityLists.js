// Parses CC_FLEX_RAW and SIM_TRAY_RAW (data/ccFlexRaw.js, data/simTrayRaw.js)
// and upserts each line as a Product — keyed by SKU, so re-running this
// after editing the raw lists updates existing rows instead of duplicating
// them (same pattern as importDisplayPrices.js).
//
// No prices were provided for either list, so every product here is
// created as `published: true` with `price: 0` — visible on the
// storefront showing ৳0, at the owner's explicit request (2026-08-02) to
// go live immediately and fill in real prices later via Admin. `stock`
// stays 0, which blocks checkout (see orders.routes.js), so nothing can
// actually be bought for free in the meantime.
//
// Usage:
//   cd backend
//   npm run import:compatibility-lists
import 'dotenv/config';
import prisma from './prismaClient.js';
import { CC_FLEX_RAW } from './data/ccFlexRaw.js';
import { SIM_TRAY_RAW } from './data/simTrayRaw.js';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&q=80&auto=format';

// Brand section headers as they appear in the raw lists -> normalized brand
// name. Left case-insensitive since the two source lists don't capitalize
// headers consistently ("SAMSANG" vs "Samsang", "REALMI" vs "REA", etc.).
const BRAND_HEADERS = {
  samsang: 'Samsung',
  samsung: 'Samsung',
  radmi: 'Xiaomi', // Redmi/POCO are Xiaomi sub-brands
  realmi: 'Realme',
  vivo: 'Vivo',
  oppo: 'Oppo',
  'oppo model': 'Oppo',
  itel: 'Itel',
  infinix: 'Infinix',
};

// Turns a raw block of text (one brand section, or a header line followed
// by product lines) into { brand, lines[] } groups. Blank lines separate
// groups; a line matching a known brand header (case-insensitively, with
// no other text on the line) starts a new group instead of being a product.
function parseSections(raw) {
  const lines = raw.split('\n').map((l) => l.trim());
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (!line) continue;
    const headerKey = line.toLowerCase();
    if (BRAND_HEADERS[headerKey]) {
      current = { brand: BRAND_HEADERS[headerKey], lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue; // stray line before any header — ignore
    // Strip a leading "12. " numbered-list prefix, if present (SIM Tray
    // list uses these; the C/C Flex list doesn't).
    const cleaned = line.replace(/^\d+\.\s*/, '');
    if (cleaned) current.lines.push(cleaned);
  }
  return sections;
}

function slugify(text) {
  return text.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

// One raw line like "Samsung Galaxy A01 / M01" (or "OPPO A15 / A15s")
// becomes one product whose compatibleModels is every "/"-separated
// alternative on that line. `usedSkus` disambiguates lines whose first
// model slugifies to the same string (e.g. "NOTE 13 Pro 5G" and
// "NOTE 13 Pro+ 5G" both slugify to "NOTE-13-PRO-5G" once "+" is
// stripped) by appending a numeric suffix — found by a real collision
// during testing, not hypothetical.
//
// published: true, price: 0 — by owner's explicit instruction (2026-08-02):
// go live immediately showing ৳0 rather than staying hidden, prices to be
// filled in later via Admin. stock stays 0, which blocks checkout on these
// (see orders.routes.js's atomic stock check) — so nothing can actually be
// bought for free while price is 0, even though it's visible/browsable.
function buildProduct(line, brand, { categories, category, skuPrefix }, usedSkus) {
  const models = line.split('/').map((m) => m.trim()).filter(Boolean);
  const label = models.join(' / ');
  let sku = `${skuPrefix}-${slugify(brand)}-${slugify(models[0])}`;
  let suffix = 2;
  while (usedSkus.has(sku)) {
    sku = `${skuPrefix}-${slugify(brand)}-${slugify(models[0])}-${suffix}`;
    suffix += 1;
  }
  usedSkus.add(sku);
  return {
    name: `${label} — ${category}`,
    desc: `${category} compatible with: ${label}. Price to be confirmed — contact us or check back soon.`,
    categories,
    category,
    images: [PLACEHOLDER_IMAGE],
    img: PLACEHOLDER_IMAGE,
    price: 0,
    stock: 0,
    sku,
    brand,
    compatibleModels: models,
    moq: 1,
    published: true,
  };
}

async function importList(raw, opts) {
  const sections = parseSections(raw);
  let created = 0;
  let updated = 0;
  const usedSkus = new Set();

  for (const section of sections) {
    for (const line of section.lines) {
      const product = buildProduct(line, section.brand, opts, usedSkus);
      const existing = await prisma.product.findUnique({ where: { sku: product.sku } });
      if (existing) {
        // Never touch price/stock/images on re-import — only description,
        // compatible-models list, and publish state, so any price an admin
        // has already entered by hand is preserved.
        await prisma.product.update({
          where: { sku: product.sku },
          data: { desc: product.desc, compatibleModels: product.compatibleModels, published: true },
        });
        updated += 1;
      } else {
        await prisma.product.create({ data: product });
        created += 1;
      }
    }
  }
  return { created, updated };
}

async function main() {
  const ccFlexResult = await importList(CC_FLEX_RAW, {
    categories: ['Charging Port', 'Flex'],
    category: 'Charging Port',
    skuPrefix: 'NT-CCFLEX',
  });
  console.log(`C/C Flex import: ${ccFlexResult.created} created, ${ccFlexResult.updated} updated.`);

  const simTrayResult = await importList(SIM_TRAY_RAW, {
    categories: ['SIM Tray'],
    category: 'SIM Tray',
    skuPrefix: 'NT-SIMTRAY',
  });
  console.log(`SIM Tray import: ${simTrayResult.created} created, ${simTrayResult.updated} updated.`);

  console.log(
    '\nAll imported rows are LIVE (published: true) but priced at ৳0 — visible on the storefront, ' +
      'not purchasable yet (stock is 0). Go to Admin -> Products, set a real price + stock + photo per item ' +
      'as you get to them.'
  );
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
