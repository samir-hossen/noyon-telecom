import { createHmac } from 'node:crypto';
import { storefrontWhere } from './productQuery.js';

export function viewIdentity(req, now = new Date(), secret = process.env.JWT_SECRET) {
  const ua = String(req.headers?.['user-agent'] || '');
  if (!secret || !req.ip || !ua || req.user?.role === 'admin' || /bot|crawler|spider|headless|google.*inspection/i.test(ua)) return null;
  const day = now.toISOString().slice(0, 10);
  // Rotates every day; no raw IP, user ID or browser fingerprint is stored.
  const visitorKey = createHmac('sha256', secret).update(`${day}\n${req.ip}\n${ua}`).digest('hex');
  return { day, visitorKey };
}

let cleanedDay = '';
export async function recordProductView(db, req) {
  const identity = viewIdentity(req);
  if (!identity) return;
  const product = await db.product.findFirst({ where: storefrontWhere({ id: String(req.params.id) }), select: { id: true } });
  if (!product) return;
  const { visitorKey, day } = identity;
  // One atomic SQL statement: concurrent reloads increment at most once.
  // Avoid Prisma @updatedAt: a view is not a catalog edit or new arrival.
  await db.$executeRaw`
    WITH counted AS (
      INSERT INTO "ProductView" ("productId", "visitorKey", "day")
      VALUES (${product.id}, ${visitorKey}, ${day}::date)
      ON CONFLICT DO NOTHING RETURNING "productId"
    )
    UPDATE "Product" SET "viewCount" = "viewCount" + 1
    WHERE id IN (SELECT "productId" FROM counted)
  `;
  if (cleanedDay !== day) {
    cleanedDay = day;
    // Deduplication keys only need to survive two days; aggregate counts stay.
    db.productView.deleteMany({ where: { day: { lt: new Date(Date.parse(day) - 2 * 86400000) } } }).catch(() => { cleanedDay = ''; });
  }
}
