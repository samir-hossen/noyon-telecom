import { Router } from 'express';
import prisma from '../prismaClient.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { serializeOrder, priceForViewer } from '../utils/serialize.js';
import { sendMail } from '../utils/mailer.js';
import { sendSms } from '../utils/sms.js';
import { sendWhatsApp, buildOrderWhatsAppMessage } from '../utils/whatsapp.js';
import { sendMetaPurchaseEvent } from '../utils/metaCapi.js';
import { computeOrderTotals, isCouponExpired, isWithinUsageLimit } from '../utils/pricing.js';
import { canViewOrder } from '../utils/orderAccess.js';
import { getDeliveryFee } from '../utils/settings.js';

const router = Router();

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
    // Admin-editable (see utils/settings.js / Admin panel Settings tab),
    // not a hardcoded constant — read once here rather than inside the
    // transaction below since it's a cached, non-order-specific value.
    const deliveryFee = await getDeliveryFee();

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
        // Same "silently just don't apply the discount, still let the order
        // through" behavior already used for an inactive coupon or a
        // subtotal below the minimum — a customer who's ready to buy
        // shouldn't have their whole order blocked over a coupon problem,
        // and they've already had a chance to see a clear reason why at
        // the /coupons/validate step before ever reaching this point. The
        // only way usageLimit/usageLimitPerCustomer trips here without
        // having been caught there first is a genuine race — someone else
        // used the last remaining redemption in the last few seconds —
        // which this atomic recount (inside the same Serializable
        // transaction as the stock checks below) exists specifically to
        // catch correctly rather than letting two concurrent checkouts
        // both slip through a coupon meant for one use.
        if (coupon && coupon.active && !isCouponExpired(coupon) && subtotal >= coupon.minSubtotal) {
          let withinLimit = true;
          if (coupon.usageLimit != null || coupon.usageLimitPerCustomer != null) {
            const [totalUses, customerUses] = await Promise.all([
              coupon.usageLimit != null ? tx.order.count({ where: { couponCode: coupon.code } }) : Promise.resolve(0),
              coupon.usageLimitPerCustomer != null
                ? tx.order.count({
                    where: {
                      couponCode: coupon.code,
                      // Case-insensitive: canViewOrder() already treats guest
                      // email matching as case-insensitive, but an exact
                      // match here would let a guest dodge a per-customer
                      // limit just by varying the casing they type each order.
                      ...(req.user ? { userId: req.user.id } : { guestEmail: { equals: shipping.email, mode: 'insensitive' } }),
                    },
                  })
                : Promise.resolve(0),
            ]);
            withinLimit = isWithinUsageLimit(coupon, totalUses, customerUses);
          }
          if (withinLimit) {
            discount = coupon.type === 'percent' ? +((subtotal * coupon.value) / 100).toFixed(2) : Math.min(coupon.value, subtotal);
            appliedCouponCode = coupon.code;
          }
        }
      }

      // freeShippingThreshold: Infinity — no order currently qualifies for
      // free shipping, every order is charged the flat deliveryFee. If
      // that policy changes later, set this back to a real BDT threshold.
      const { shippingFee, tax, total } = computeOrderTotals(subtotal, discount, {
        freeShippingThreshold: Infinity,
        flatShipping: deliveryFee,
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
        // Only clear the cart rows that actually became order items — not
        // the whole cart. `lines` was snapshotted before this transaction
        // started, so a concurrent add-to-cart (another tab/device) mid-
        // checkout must survive, not be silently wiped along with it.
        await tx.cartItem.deleteMany({
          where: { userId: req.user.id, productId: { in: lines.map((l) => l.productId) } },
        });
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

    // Admin-facing WhatsApp alert — full order + customer details, so
    // fulfillment can start straight from WhatsApp without opening the
    // Admin panel. See utils/whatsapp.js for the (free) setup steps.
    sendWhatsApp(buildOrderWhatsAppMessage(order)).catch((err) =>
      console.error('Failed to send order WhatsApp alert:', order.id, err.message)
    );

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

    // Previously had NO check at all for guest orders (order.userId ===
    // null): anyone who obtained the order id (a forwarded confirmation
    // link, a screenshot, a browser-history entry, a referrer header
    // leaked to a third-party script on the confirmation page) could view
    // the full order — shipping name, address, phone, items — with
    // nothing more than that id. cuid ids aren't practically
    // brute-forceable, but "hard to guess" alone is a weaker guarantee
    // than an actual authorization check. Requiring the guest's own email
    // (see utils/orderAccess.js) closes that gap without requiring a guest
    // account system — the confirmation/payment redirects already append
    // it automatically (see confirmationUrl in payment.routes.js and the
    // checkout success navigation in Checkout.jsx), so a legitimate
    // customer never has to type anything extra.
    if (!canViewOrder(order, req.user, req.query.email)) {
      return res.status(403).json({ error: 'You do not have access to this order' });
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
