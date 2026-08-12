// Small admin-editable settings store backed by the Setting table (see
// prisma/schema.prisma). Currently just the flat delivery fee, which used
// to be a hardcoded constant in orders.routes.js requiring a code deploy
// to change — now an admin can update it from the Admin panel and it takes
// effect on the next checkout (within the cache TTL below).
import prisma from '../prismaClient.js';
import { getOrSet, cache } from './cache.js';

export const DEFAULT_DELIVERY_FEE = 150;

export async function getDeliveryFee() {
  const value = await getOrSet('settings:deliveryFee', 300, async () => {
    const row = await prisma.setting.findUnique({ where: { key: 'deliveryFee' } });
    if (!row) return DEFAULT_DELIVERY_FEE;
    const num = Number(row.value);
    return Number.isFinite(num) ? num : DEFAULT_DELIVERY_FEE;
  });
  return value;
}

export async function setDeliveryFee(value) {
  const fee = Math.max(0, Math.round(Number(value)));
  if (!Number.isFinite(fee)) throw new Error('Delivery fee must be a number.');
  await prisma.setting.upsert({
    where: { key: 'deliveryFee' },
    create: { key: 'deliveryFee', value: String(fee) },
    update: { value: String(fee) },
  });
  cache.del('settings:deliveryFee');
  return fee;
}
