// Home page rails, one per brand (like the market sites): up to 6 parts of
// different types, each a product with a published price — the owner's own
// photo first, otherwise a different model each day (seeded by the date).
// The Apple row is shown as "iPhone", so iPhone parts come before iPad ones.
import prisma from '../prismaClient.js';

export const HOME_RAIL_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Realme'];
export const RAIL_PARTS = ['Display', 'Back Glass', 'Camera', 'Charging Port', 'Speaker', 'SIM Tray', 'Flex', 'Frame'];
export const RAIL_SIZE = 6;

// One pick per brand + part (rows come back in any order) -> the rails, parts in RAIL_PARTS order.
export function buildRails(picks, brands = HOME_RAIL_BRANDS) {
  return brands.map((brand) => ({
    brand,
    products: RAIL_PARTS
      .map((part) => picks.find((p) => p.brand === brand && p.category === part))
      .filter(Boolean)
      .slice(0, RAIL_SIZE),
  })).filter((rail) => rail.products.length > 0);
}

export async function loadBrandRails(seed = new Date().toISOString().slice(0, 10)) {
  const ids = await prisma.$queryRaw`
    SELECT id FROM (
      SELECT id, row_number() OVER (PARTITION BY brand, category ORDER BY (img <> '') DESC, (brand <> 'Apple' OR name ILIKE 'iPhone%') DESC, md5(id || ${seed})) AS rn
      FROM "Product"
      WHERE published = true AND "priceStatus" = 'published' AND price > 0
        AND brand = ANY(${HOME_RAIL_BRANDS}) AND category = ANY(${RAIL_PARTS})
    ) t
    WHERE rn = 1
  `;
  const rows = await prisma.product.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
  return buildRails(rows);
}
