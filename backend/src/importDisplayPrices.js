// Imports/updates the "Display" category price list (see data/displayPriceList.js)
// into the Product table. Safe to run again and again — it's an *upsert* keyed
// on SKU, so re-running after editing a price in displayPriceList.js just
// updates that row's price, instead of creating duplicate products.
//
// Usage:
//   cd backend
//   npm run import:display-prices
//
// This is deliberately a separate script from seed.js: seed.js only ever
// runs once against an empty database (it no-ops if products already
// exist), but a real shop updates its price list regularly — this script
// is meant to be re-run every time prices change, without touching any
// other product data.
import 'dotenv/config';
import prisma from './prismaClient.js';
import { DISPLAY_PRICE_LIST } from './data/displayPriceList.js';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1592286927505-1def25115481?w=800&q=80&auto=format';

// Turns "A13 5G" -> "A13-5G", "13 C" -> "13-C", etc. so it's a clean,
// URL/SKU-safe token.
function slugifyModel(model) {
  return model.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildProduct({ models, price }) {
  const label = models.join(' / ');
  const sku = `NT-DIS-${models.map(slugifyModel).join('-')}`;
  return {
    name: `${label} Display`,
    desc: `Replacement display assembly compatible with ${label}. Pre-tested before dispatch. Confirm exact model match before ordering in bulk.`,
    categories: ['Display'],
    category: 'Display',
    images: [PLACEHOLDER_IMAGE],
    img: PLACEHOLDER_IMAGE,
    price,
    stock: 50,
    sku,
    compatibleModels: models,
    moq: 1,
    warranty: '7 Days Testing Warranty',
  };
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const row of DISPLAY_PRICE_LIST) {
    const product = buildProduct(row);
    const existing = await prisma.product.findUnique({ where: { sku: product.sku } });

    if (existing) {
      // Only touch price/desc/compatibleModels on re-import — never
      // overwrite stock, images, or anything an admin may have already
      // edited by hand in the dashboard since the last import.
      await prisma.product.update({
        where: { sku: product.sku },
        data: { price: product.price, desc: product.desc, compatibleModels: product.compatibleModels },
      });
      updated += 1;
    } else {
      await prisma.product.create({ data: product });
      created += 1;
    }
  }

  console.log(`Display price import done: ${created} created, ${updated} updated.`);
  console.log('Reminder: swap the placeholder image and verify stock counts for these in Admin before launch.');
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
