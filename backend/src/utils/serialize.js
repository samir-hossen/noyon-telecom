// Normalizes a Prisma Product row into the exact shape the frontend expects
// (categories/images come back as JSON columns, but should be plain arrays).
export function serializeProduct(p) {
  return {
    id: p.id,
    name: p.name,
    desc: p.desc,
    categories: Array.isArray(p.categories) ? p.categories : [p.category],
    category: p.category,
    images: Array.isArray(p.images) ? p.images : [p.img],
    img: p.img,
    price: p.price,
    compareAt: p.compareAt ?? null,
    stock: p.stock,
    rating: Math.round(p.rating * 10) / 10,
    reviewCount: p.reviewCount,
    sku: p.sku ?? null,
    brand: p.brand ?? null,
    compatibleModels: Array.isArray(p.compatibleModels) ? p.compatibleModels : [],
    moq: p.moq ?? 1,
    dealerPrice: p.dealerPrice ?? null,
    bulkPricing: Array.isArray(p.bulkPricing) ? p.bulkPricing : [],
    warranty: p.warranty ?? null,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    published: p.published ?? true,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt ?? p.createdAt,
  };
}

// Returns the correct unit price for a given viewer and order quantity:
// - Approved dealers see dealerPrice (minus any personal discount) — this
//   assumes dealerPrice already reflects wholesale-level pricing, so bulk
//   quantity tiers (below) don't additionally apply on top of it.
// - Everyone else (guests, customers, pending dealers) pays retail price,
//   *unless* the requested quantity qualifies for a bulk-pricing tier, in
//   which case the tier's per-unit price applies. The product page shows
//   these tiers as a promise to the customer ("10+ units: X, 50+ units: Y"),
//   so checkout must honor them — otherwise the site is advertising a
//   discount it doesn't actually give, which is exactly the kind of thing
//   that erodes trust and generates support disputes/refund requests.
export function priceForViewer(product, user, qty = 1) {
  const isApprovedDealer = user?.role === 'dealer' && user?.dealerStatus === 'approved';
  if (isApprovedDealer) {
    const base = product.dealerPrice ?? product.price;
    const discount = Math.min(100, Math.max(0, user.dealerDiscountPercent || 0));
    return Math.max(0, Math.round(base * (1 - discount / 100) * 100) / 100);
  }

  const tiers = Array.isArray(product.bulkPricing) ? product.bulkPricing : [];
  const bestTier = tiers
    .filter((t) => t && Number.isFinite(t.minQty) && Number.isFinite(t.price) && qty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  return bestTier ? bestTier.price : product.price;
}

export function serializeReview(r) {
  return {
    id: r.id,
    productId: r.productId,
    userName: r.userName,
    rating: r.rating,
    comment: r.comment,
    images: Array.isArray(r.images) ? r.images : [],
    createdAt: r.createdAt,
  };
}

export function serializeOrder(o) {
  return {
    id: o.id,
    userId: o.userId,
    guestEmail: o.guestEmail,
    shipping: o.shipping,
    paymentMethod: o.paymentMethod,
    couponCode: o.couponCode,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    tax: o.tax,
    total: o.total,
    status: o.status,
    transactionId: o.transactionId ?? null,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      img: i.img,
      price: i.price,
      qty: i.qty,
    })),
  };
}
