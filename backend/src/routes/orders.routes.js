import { Router } from 'express';
import prisma from '../prismaClient.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { serializeOrder, priceForViewer } from '../utils/serialize.js';
import { sendMail } from '../utils/mailer.js';
import { sendSms } from '../utils/sms.js';
import { sendMetaPurchaseEvent } from '../utils/metaCapi.js';
import { computeOrderTotals } from '../utils/pricing.js';

const router = Router();

// Keep these in sync with FREE_SHIPPING_THRESHOLD / SHIPPING_FEE in
// frontend/src/pages/Cart.jsx and Checkout.jsx — the frontend only ever
// shows an *estimate*; this is what's actually charged, so a mismatch here
// silently overrides what the customer was quoted.
const FREE_SHIPPING_THRESHOLD = 1500; // in BDT
const FLAT_SHIPPING = 60; // in BDT
const TAX_RATE = 0; // Tax disabled — no tax is added to any order.

router.post('/checkout', optionalAuth, requireCsrf, async (req, res, next) => {
  try {
    const { shipping, payment, couponCode, items: guestItems } = req.body;

    if (!shipping || !shipping.name || !shipping.address || !shipping.city || !shipping.phone || !shipping.email) {
      return res.status(400).json({ error: 'Please fill in all shipping details.' });
    }
    if (!payment || !['cod', 'online'].includes(payment.method)) {
      return res.status(400).json({ error: 'Please choose a payment method.' });
    }

    // Build a normalized list of { productId, qty } from either the user's
    // server-side cart or the guest cart items sent in the request body.
    let lines;
    if (req.user) {
      const cartRows = await prisma.cartItem.findMany({ where: { userId: req.user.id } });
      lines = cartRows.map((c) => ({ productId: c.productId, qty: c.qty }));
    } else {
      if (!Array.isArray(guestItems) || guestItems.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty.' });
      }
      lines = guestItems
        .filter((i) => i && i.productId && Number(i.qty) > 0)
        .map((i) => ({ productId: i.productId, qty: Math.floor(Number(i.qty)) }));
    }
    if (lines.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });

    const lowStockAlerts = [];

    // Serializable isolation (Prisma/Postgres's default is Read
    // Committed): two near-simultaneous checkout requests from the same
    // logged-in user's cart (double-click, a network retry, two open
    // tabs) could otherwise both read the same still-populated cart
    // before either cleared it, and both successfully create a separate
    // order from it — the atomic stock updateMany below already stops
    // overselling, but nothing stopped the duplicate order itself.
    // Reproduced and verified directly against Postgres: under Read
    // Committed, two concurrent requests produced two orders; under
    // Serializable, the second correctly aborts with a clean, retryable
    // conflict (Prisma error P2034, handled in errorHandler.js) instead
    // of silently succeeding twice.
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const orderItemsData = [];
      let subtotal = 0;
      for (const line of lines) {
        const product = productMap.get(line.productId);
        if (!product) throw new HttpError(400, `A product in your cart is no longer available.`);
        if (product.stock < line.qty) throw new HttpError(400, `Not enough stock for "${product.name}" (only ${product.stock} left).`);
        const moq = product.moq || 1;
        if (line.qty < moq) throw new HttpError(400, `"${product.name}" has a minimum order quantity of ${moq}.`);
        // Approved dealers pay their dealerPrice (minus any personal discount),
        // never the retail price — this must match what they were quoted on
        // the product page and in their cart, computed the same way (server
        // side, from req.user) so it can't be spoofed from the client.
        const unitPrice = priceForViewer(product, req.user, line.qty);
        subtotal += unitPrice * line.qty;
        orderItemsData.push({ productId: product.id, name: product.name, img: product.img, price: unitPrice, qty: line.qty });
      }
      subtotal = +subtotal.toFixed(2);

      let discount = 0;
      let appliedCouponCode = null;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase().trim() } });
        if (coupon && coupon.active && subtotal >= coupon.minSubtotal) {
          discount = coupon.type === 'percent' ? +((subtotal * coupon.value) / 100).toFixed(2) : Math.min(coupon.value, subtotal);
          appliedCouponCode = coupon.code;
        }
      }

      const { shippingFee, tax, total } = computeOrderTotals(subtotal, discount, {
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        flatShipping: FLAT_SHIPPING,
        taxRate: TAX_RATE,
      });

      // Decrement stock atomically and conditionally (stock >= qty) inside the
      // same transaction. The default Postgres isolation level (Read
      // Committed) does NOT stop two concurrent checkouts from both reading
      // the same stock number and both passing the check above — that's a
      // classic overselling bug during a flash sale or any traffic spike.
      // `updateMany` with the quantity guard folded into the WHERE clause
      // makes the decrement itself atomic: only one of two racing requests
      // can win when stock is tight, and the loser gets a clean "out of
      // stock" error instead of silently pushing stock negative.
      for (const line of lines) {
        const result = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.qty } },
          data: { stock: { decrement: line.qty } },
        });
        if (result.count === 0) {
          const p = productMap.get(line.productId);
          throw new HttpError(409, `"${p?.name || 'An item'}" just sold out. Please update your cart and try again.`);
        }
        const p = productMap.get(line.productId);
        const remainingStock = p.stock - line.qty;
        if (remainingStock <= (p.lowStockThreshold ?? 5)) {
          lowStockAlerts.push({ name: p.name, sku: p.sku, remainingStock });
        }
      }

      const created = await tx.order.create({
        data: {
          userId: req.user?.id || null,
          guestEmail: req.user ? null : shipping.email,
          shipping,
          paymentMethod: payment.method,
          couponCode: appliedCouponCode,
          subtotal,
          discount,
          shippingFee,
          tax,
          total,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      if (req.user) {
        await tx.cartItem.deleteMany({ where: { userId: req.user.id } });
      }

      return created;
    }, { isolationLevel: 'Serializable' });

    res.status(201).json({ order: serializeOrder(order) });

    // Order confirmation SMS — sent regardless of payment method (COD or
    // online) since this just confirms the order was placed, not that
    // money has been received. Many BD customers trust an SMS more than an
    // email for this, and don't always check email after checkout.
    const shortOrderId = order.id.slice(-8).toUpperCase();
    // Note: the ৳ symbol pushes this out of GSM-7 into Unicode SMS encoding
    // (70 chars/segment instead of 160) — fine for a short message like
    // this, but keep it in mind if you extend the text much further, since
    // crossing 70 chars would split it into (and bill) two segments instead of one.
    sendSms(
      shipping.phone,
      `Noyon Telecom: Order #${shortOrderId} placed, total ৳${Math.round(order.total).toLocaleString('en-BD')}. We'll text you again once it ships.`
    ).catch((err) => console.error('Failed to send order confirmation SMS:', order.id, err.message));

    // Cash-on-delivery orders are "purchased" the moment they're placed (no
    // separate payment-gateway confirmation step) — fire the server-side
    // Purchase event here. Online-payment orders fire this instead from the
    // SSLCommerz IPN handler once the money has actually been confirmed
    // (see payment.routes.js), so this stays a no-op for those.
    if (payment.method === 'cod') {
      sendMetaPurchaseEvent({ order, req }).catch(() => {});
    }

    if (lowStockAlerts.length > 0) {
      const alertLines = lowStockAlerts
        .map((p) => `- ${p.name}${p.sku ? ` (SKU: ${p.sku})` : ''}: ${p.remainingStock} left`)
        .join('\n');
      sendMail({
        to: process.env.STORE_CONTACT_EMAIL || 'support@noyontelecom.com',
        subject: `Low stock alert — ${lowStockAlerts.length} item${lowStockAlerts.length > 1 ? 's' : ''} need restocking`,
        text: `The following products just fell to or below their low-stock threshold after order #${order.id}:\n\n${alertLines}\n\nRestock soon to avoid turning away orders.`,
      }).catch((err) => console.error('Failed to send low-stock alert email:', err.message));
    }
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    // Paginated (default 10/page) rather than returning the customer's
    // entire order history in one response — a repeat wholesale dealer can
    // accumulate hundreds of orders over time, and this page previously had
    // no cap at all.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user.id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where: { userId: req.user.id } }),
    ]);
    res.json({ orders: orders.map(serializeOrder), total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    next(err);
  }
});

// Lightweight lifetime stats (order count + total spent) for a signed-in
// customer/dealer, computed with a DB aggregate instead of pulling every
// order row into memory — used by DealerDashboard's summary cards so those
// numbers stay correct (and cheap) regardless of how many orders someone
// has placed, now that GET /mine itself is paginated above.
router.get('/mine/summary', requireAuth, async (req, res, next) => {
  try {
    const agg = await prisma.order.aggregate({
      where: { userId: req.user.id },
      _count: true,
      _sum: { total: true },
    });
    res.json({ count: agg._count, totalSpent: agg._sum.total || 0 });
  } catch (err) {
    next(err);
  }
});

// Guests reach their confirmation page with only the order ID (no account
// to authenticate with), so guest orders are viewable by ID alone — the
// same trust model as most guest order-tracking links. Orders that belong
// to a registered account are locked to that account (or an admin).
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.userId) {
      const isOwner = req.user && req.user.id === order.userId;
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isOwner && !isAdmin) return res.status(403).json({ error: 'You do not have access to this order' });
    }

    res.json({ order: serializeOrder(order) });
  } catch (err) {
    next(err);
  }
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default router;
