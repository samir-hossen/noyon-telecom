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

// Lets an admin turn the SSLCommerz online-payment option on checkout on/off
// without a code deploy — previously this was a hardcoded `false` constant
// in Checkout.jsx (ONLINE_PAYMENT_ENABLED) that had to be flipped in code
// and redeployed once the gateway credentials were ready. Defaults to false
// (opt-in) so a fresh deploy never shows a payment method before an admin
// has actually verified the gateway works.
export async function getOnlinePaymentEnabled() {
  return getOrSet('settings:onlinePaymentEnabled', 300, async () => {
    const row = await prisma.setting.findUnique({ where: { key: 'onlinePaymentEnabled' } });
    return row?.value === 'true';
  });
}

export async function setOnlinePaymentEnabled(value) {
  const enabled = !!value;
  await prisma.setting.upsert({
    where: { key: 'onlinePaymentEnabled' },
    create: { key: 'onlinePaymentEnabled', value: String(enabled) },
    update: { value: String(enabled) },
  });
  cache.del('settings:onlinePaymentEnabled');
  return enabled;
}
