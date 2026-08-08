import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { serializeProduct, serializeOrder } from '../utils/serialize.js';
import { buildProductWhere, buildProductOrderBy, parsePagination } from '../utils/productQuery.js';
import { logAdminAction } from '../utils/audit.js';
import { upload, storeUploadedFile, deleteStoredImage } from '../utils/upload.js';
import { generateSecret, secretToQrDataUrl, verifyToken as verifyTotp } from '../utils/totp.js';
import { sendMail } from '../utils/mailer.js';
import { sendSms } from '../utils/sms.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const ORDER_STATUSES = ['processing', 'paid', 'shipped', 'delivered', 'cancelled'];

// ---------- Products ----------

router.post('/products', requireCsrf, async (req, res, next) => {
  try {
    const p = req.body;
    if (!p.name || !p.desc || !Array.isArray(p.images) || p.images.length === 0 || !p.price) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }
    const created = await prisma.product.create({
      data: {
        name: p.name,
        desc: p.desc,
        categories: p.categories?.length ? p.categories : [p.category],
        category: p.category || p.categories?.[0],
        images: p.images,
        img: p.img || p.images[0],
        price: parseFloat(p.price),
        compareAt: p.compareAt ? parseFloat(p.compareAt) : null,
        stock: parseInt(p.stock, 10) || 0,
        sku: p.sku || null,
        brand: p.brand || null,
        compatibleModels: Array.isArray(p.compatibleModels) ? p.compatibleModels : [],
        moq: parseInt(p.moq, 10) || 1,
        dealerPrice: p.dealerPrice ? parseFloat(p.dealerPrice) : null,
        bulkPricing: Array.isArray(p.bulkPricing) ? p.bulkPricing : [],
        warranty: p.warranty || null,
        // Defaults to true (same as the schema default) for a normal admin
        // create, but lets bulk-import scripts explicitly pass `false` for
        // draft/unpriced rows — see importDisplayPrices.js for the pattern.
        published: p.published !== undefined ? Boolean(p.published) : true,
      },
    });
    await logAdminAction(req.user, 'product.create', { productId: created.id, name: created.name });
    res.status(201).json({ product: serializeProduct(created) });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', requireCsrf, async (req, res, next) => {
  try {
    const p = req.body;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: p.name,
        desc: p.desc,
        categories: p.categories?.length ? p.categories : [p.category],
        category: p.category || p.categories?.[0],
        images: p.images,
        img: p.img || p.images?.[0],
        price: p.price !== undefined ? parseFloat(p.price) : undefined,
        compareAt: p.compareAt ? parseFloat(p.compareAt) : null,
        stock: p.stock !== undefined ? parseInt(p.stock, 10) : undefined,
        sku: p.sku !== undefined ? (p.sku || null) : undefined,
        brand: p.brand !== undefined ? (p.brand || null) : undefined,
        compatibleModels: Array.isArray(p.compatibleModels) ? p.compatibleModels : undefined,
        moq: p.moq !== undefined ? parseInt(p.moq, 10) || 1 : undefined,
        dealerPrice: p.dealerPrice !== undefined ? (p.dealerPrice ? parseFloat(p.dealerPrice) : null) : undefined,
        bulkPricing: Array.isArray(p.bulkPricing) ? p.bulkPricing : undefined,
        warranty: p.warranty !== undefined ? (p.warranty || null) : undefined,
        published: p.published !== undefined ? Boolean(p.published) : undefined,
      },
    });
    // Clean up any images that were removed/replaced so storage doesn't
    // accumulate orphaned files (fire-and-forget — doesn't block the response).
    if (existing && Array.isArray(existing.images) && Array.isArray(p.images)) {
      const removed = existing.images.filter((img) => !p.images.includes(img));
      removed.forEach((img) => deleteStoredImage(img));
    }
    await logAdminAction(req.user, 'product.update', { productId: updated.id, name: updated.name });
    res.json({ product: serializeProduct(updated) });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    let deleted;
    try {
      deleted = await prisma.product.delete({ where: { id: req.params.id } });
    } catch (err) {
      // Products that appear in any past order can't be hard-deleted — the
      // OrderItem.productId foreign key blocks it (by design: an order's
      // line items must keep pointing at a real product row so historical
      // invoices/reports stay accurate). This is by far the most common
      // reason a delete fails here, so it gets its own clear message
      // instead of falling through to the generic "something went wrong"
      // in errorHandler.js — an admin hitting this needs to know their
      // click DID something (there was a real reason), and what to do
      // instead (set stock to 0 to take it off sale).
      if (err.code === 'P2003') {
        return res.status(409).json({
          error: 'This product has order history and can\u2019t be deleted. Set its stock to 0 to remove it from sale instead.',
        });
      }
      throw err;
    }

    // Clean up the product's images from storage — fire-and-forget.
    if (Array.isArray(existing.images)) {
      existing.images.forEach((img) => deleteStoredImage(img));
    }
    await logAdminAction(req.user, 'product.delete', { productId: deleted.id, name: deleted.name });
    res.json({});
  } catch (err) {
    next(err);
  }
});

// Paginated product list for the admin panel's management table.
//
// This is deliberately separate from the public GET /api/products listing:
// that route hardcodes `where.published = true` (drafts must never leak to
// shoppers), which also means it silently omitted every draft/unpriced
// product from the admin table — the table already had "Draft" badge UI
// for exactly this case, but the data feeding it could never contain one.
// At 10k+ SKUs, with bulk imports regularly landing rows as unpublished
// drafts (see importDisplayPrices.js / publishAllDrafts.js), that made a
// growing slice of the catalog invisible and unmanageable from the UI.
router.get('/products', async (req, res, next) => {
  try {
    const where = buildProductWhere({
      category: req.query.category,
      brand: req.query.brand,
      search: req.query.search,
      status: (req.query.status || 'all').toString(), // all | published | draft
    });
    const orderBy = buildProductOrderBy(); // admin list has no sort control — always newest first
    const { page, limit, skip, take } = parsePagination(req.query, { defaultLimit: 50 });

    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip, take }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products: rows.map(serializeProduct),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Bulk import/export (Excel/CSV, via the admin panel's SheetJS parsing) ----------
// The admin panel reads/writes the actual .xlsx file client-side (SheetJS);
// this endpoint just accepts the parsed rows as JSON and upserts by SKU —
// keeps the backend format-agnostic (CSV, Excel, whatever parses to rows).

router.get('/products/export', async (req, res, next) => {
  try {
    // Unpaginated on purpose — this is a deliberate bulk-export action, not
    // the public catalog listing, so returning everything is correct here.
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ products: products.map(serializeProduct) });
  } catch (err) {
    next(err);
  }
});

router.post('/products/import', requireCsrf, async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (rows.length === 0) return res.status(400).json({ error: 'No rows to import' });
    if (rows.length > 5000) return res.status(400).json({ error: 'Import is limited to 5000 rows per file' });

    let created = 0;
    let updated = 0;
    const errors = [];

    // Processes one parsed spreadsheet row: validates required fields, then
    // upserts by SKU. Pulled out of the loop below so rows can run
    // concurrently in small batches instead of one full DB round-trip at a
    // time — at 5000 rows, sequential awaits could take minutes and risk
    // hitting an HTTP/proxy timeout before the import ever finishes.
    async function importRow(r, rowNumber) {
      if (!r.name || !r.price || !r.category) {
        errors.push({ row: rowNumber, error: 'Missing required field (name, price, category)' });
        return;
      }
      const data = {
        name: String(r.name).trim(),
        desc: String(r.desc || r.name).trim(),
        category: String(r.category).trim(),
        categories: String(r.categories || r.category).split(',').map((c) => c.trim()).filter(Boolean),
        price: parseFloat(r.price),
        compareAt: r.compareAt ? parseFloat(r.compareAt) : null,
        stock: parseInt(r.stock, 10) || 0,
        sku: r.sku ? String(r.sku).trim() : null,
        brand: r.brand ? String(r.brand).trim() : null,
        compatibleModels: r.compatibleModels
          ? String(r.compatibleModels).split(',').map((m) => m.trim()).filter(Boolean)
          : [],
        moq: parseInt(r.moq, 10) || 1,
        dealerPrice: r.dealerPrice ? parseFloat(r.dealerPrice) : null,
        warranty: r.warranty ? String(r.warranty).trim() : null,
        lowStockThreshold: r.lowStockThreshold ? parseInt(r.lowStockThreshold, 10) : 5,
        images: r.images ? String(r.images).split(',').map((s) => s.trim()).filter(Boolean) : ['/uploads/placeholder.png'],
      };
      data.img = data.images[0];

      try {
        const existing = data.sku ? await prisma.product.findUnique({ where: { sku: data.sku } }) : null;
        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.product.create({ data });
          created++;
        }
      } catch (rowErr) {
        errors.push({ row: rowNumber, error: rowErr.message });
      }
    }

    const BATCH_SIZE = 20;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      // allSettled (not all) so one row throwing outside its own try/catch
      // still can't abort the rest of the batch.
      await Promise.allSettled(batch.map((r, bi) => importRow(r, i + bi + 2)));
    }

    // Batches run concurrently, so errors can arrive out of row order —
    // sort them back into row order for a predictable report.
    errors.sort((a, b) => a.row - b.row);

    await logAdminAction(req.user, 'product.bulk_import', { created, updated, errorCount: errors.length });
    res.json({ created, updated, errors });
  } catch (err) {
    next(err);
  }
});

// ---------- Inventory ----------

router.get('/inventory/low-stock', async (req, res, next) => {
  try {
    // Filtered at the DB level via raw SQL (Prisma's `where` can't compare
    // two columns of the same row — stock vs. lowStockThreshold — in one
    // clause). Same safe pattern already used for the homepage "deals"
    // query in products.routes.js: no user input reaches this query, so
    // there's no injection surface. This replaces a previous version that
    // pulled every single product row into Node and filtered in JS, which
    // was a full-table scan/transfer on every check at 10k+ SKUs.
    const lowStock = await prisma.$queryRaw`
      SELECT * FROM "Product"
      WHERE stock <= COALESCE("lowStockThreshold", 5)
      ORDER BY stock ASC
      LIMIT 500
    `;
    res.json({ products: lowStock.map(serializeProduct) });
  } catch (err) {
    next(err);
  }
});

// ---------- Analytics ----------
// All figures come straight from the database via aggregate/groupBy queries,
// not from summing whatever page of orders happens to be loaded client-side.
// A revenue dashboard that's only as complete as the current page of orders
// silently under-reports as the store grows — this stays correct and fast
// no matter how many orders exist.
router.get('/analytics', async (req, res, next) => {
  try {
    const notCancelled = { status: { not: 'cancelled' } };

    const [revenueAgg, pendingCount, guestOrderCount, statusGroups] = await Promise.all([
      prisma.order.aggregate({ where: notCancelled, _sum: { total: true }, _count: { _all: true } }),
      prisma.order.count({ where: { status: { in: ['processing', 'paid'] } } }),
      prisma.order.count({ where: { userId: null } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const totalRevenue = revenueAgg._sum.total || 0;
    const liveOrderCount = revenueAgg._count._all || 0;
    const avgOrderValue = liveOrderCount ? totalRevenue / liveOrderCount : 0;

    const statusCounts = {};
    ORDER_STATUSES.forEach((s) => { statusCounts[s] = 0; });
    statusGroups.forEach((g) => { statusCounts[g.status] = g._count._all; });

    // Revenue for the last 14 days — bounded date range, so this only ever
    // touches a small, recent slice of the orders table (backed by the
    // Order.createdAt index) rather than the full history.
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);
    const recentOrders = await prisma.order.findMany({
      where: { ...notCancelled, createdAt: { gte: since } },
      select: { total: true, createdAt: true },
    });
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const revenueByDay = days.map((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const dayTotal = recentOrders
        .filter((o) => o.createdAt >= d && o.createdAt < next)
        .reduce((sum, o) => sum + o.total, 0);
      return { date: d, total: dayTotal };
    });

    // Top 5 products by quantity sold, computed in the database via a join
    // + GROUP BY rather than pulling every order line item into Node.
    // Bounded to the last 90 days (not all-time) — an admin dashboard
    // "top sellers" list should reflect what's moving *now*, not be
    // dominated forever by whichever product happened to sell well in the
    // store's first month. This also keeps the query's work bounded as
    // order history grows, the same way revenueByDay above it already is,
    // instead of scanning every OrderItem row ever created. Uses the same
    // indexed Order.createdAt/status columns as that query.
    const topProductsSince = new Date();
    topProductsSince.setDate(topProductsSince.getDate() - 90);
    const topProductsRaw = await prisma.$queryRaw`
      SELECT oi."productId" as "productId", MAX(oi.name) as name,
             SUM(oi.qty)::int as qty, SUM(oi.price * oi.qty) as revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status != 'cancelled' AND o."createdAt" >= ${topProductsSince}
      GROUP BY oi."productId"
      ORDER BY qty DESC
      LIMIT 5
    `;
    const topProducts = topProductsRaw.map((p) => ({ ...p, revenue: Number(p.revenue) }));

    res.json({
      totalRevenue,
      avgOrderValue,
      pendingCount,
      guestOrderCount,
      statusCounts,
      revenueByDay,
      topProducts,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Dealers ----------
// Full dealer dashboard/self-service UI lands in a later phase; these
// endpoints give admins the ability to review and approve dealer signups now.

// Paginated + searchable. With 10,000+ registered dealers, an unbounded
// `findMany()` (the previous behavior) ships the entire dealer table to the
// browser on every load of this tab — slow for the admin and a needless
// bulk export of every dealer's business name, phone, and address in one
// response. Defaults to the 'pending' queue, since that's the actual daily
// admin task (approve/reject new signups), not "browse everyone".
router.get('/dealers', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const status = (req.query.status || '').toString();
    const search = (req.query.search || '').toString().trim();

    const where = { role: 'dealer', ...(status ? { dealerStatus: status } : {}) };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [dealers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, email: true, businessName: true, phone: true,
          address: true, dealerStatus: true, dealerDiscountPercent: true, createdAt: true,
          tradeLicenseUrl: true, dealerVerifiedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ dealers, total, totalPages: Math.max(1, Math.ceil(total / limit)), page });
  } catch (err) {
    next(err);
  }
});

router.patch('/dealers/:id/status', requireCsrf, async (req, res, next) => {
  try {
    const { status, dealerDiscountPercent } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid dealer status' });
    }
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        dealerStatus: status,
        ...(dealerDiscountPercent !== undefined
          ? { dealerDiscountPercent: Math.min(100, Math.max(0, parseFloat(dealerDiscountPercent) || 0)) }
          : {}),
        // Stamp the first time a dealer is approved — re-approving later
        // (e.g. after editing their discount) doesn't reset this.
        ...(status === 'approved' && !existing?.dealerVerifiedAt ? { dealerVerifiedAt: new Date() } : {}),
      },
    });
    await logAdminAction(req.user, 'dealer.status', { dealerId: updated.id, status });
    res.json({
      dealer: {
        id: updated.id,
        dealerStatus: updated.dealerStatus,
        dealerDiscountPercent: updated.dealerDiscountPercent,
        dealerVerifiedAt: updated.dealerVerifiedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Uploads ----------

router.post('/upload', requireCsrf, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const url = await storeUploadedFile(req.file);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.post('/upload-multiple', requireCsrf, upload.array('images', 8), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });
    const urls = await Promise.all(req.files.map(storeUploadedFile));
    res.json({ urls });
  } catch (err) {
    next(err);
  }
});

// ---------- Orders ----------

// Paginated + filterable so this stays fast once the store has thousands of
// orders. An unbounded `findMany()` here (the previous behavior) re-fetches
// and re-serializes the ENTIRE order history — including every line item —
// on every single admin page load; at real order volume that turns the
// orders tab into the slowest, most fragile page in the whole admin panel.
router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const status = (req.query.status || '').toString();
    const search = (req.query.search || '').toString().trim();

    const where = {};
    if (status && ORDER_STATUSES.includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map(serializeOrder),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (err) {
    next(err);
  }
});

const ORDER_STATUS_MESSAGES = {
  paid: { subject: 'Payment received', text: 'We\u2019ve received payment for your order. We\u2019ll start preparing it for shipment shortly.' },
  shipped: { subject: 'Your order has shipped', text: 'Your order is on its way! You\u2019ll receive it soon.' },
  delivered: { subject: 'Your order was delivered', text: 'Your order has been marked as delivered. Thanks for shopping with Noyon Telecom!' },
  cancelled: { subject: 'Your order was cancelled', text: 'Your order has been cancelled. If this is unexpected, please contact us and we\u2019ll help sort it out.' },
};

async function notifyOrderStatus(order) {
  const notice = ORDER_STATUS_MESSAGES[order.status];
  if (!notice) return; // "processing" is the default state customers already saw at checkout — no email needed.
  const to = order.user?.email || order.guestEmail;
  const trackLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-confirmation/${order.id}`;
  const shortOrderId = order.id.slice(-8).toUpperCase();

  if (to) {
    try {
      await sendMail({
        to,
        subject: `${notice.subject} — Noyon Telecom (Order #${shortOrderId})`,
        text: `${notice.text}\n\nTrack your order: ${trackLink}`,
      });
    } catch (err) {
      // Never let a mail-provider hiccup block the admin from updating order status.
      console.error('Failed to send order status email:', order.id, err.message);
    }
  }

  const phone = order.shipping?.phone;
  if (phone) {
    try {
      await sendSms(phone, `Noyon Telecom: ${notice.subject} (Order #${shortOrderId}). Track: ${trackLink}`);
    } catch (err) {
      console.error('Failed to send order status SMS:', order.id, err.message);
    }
  }
}

router.patch('/orders/:id/status', requireCsrf, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: req.params.id }, select: { status: true } });

      const order = await tx.order.update({
        where: { id: req.params.id },
        data: { status },
        include: { items: true, user: { select: { email: true } } },
      });

      // Stock is reserved (decremented) atomically at checkout — see
      // orders.routes.js — but until now nothing ever released it back on
      // cancellation, whether cancelled here by an admin or via any other
      // path that reaches this same transition. Left unfixed, every
      // cancelled order permanently and silently understates real stock,
      // forcing manual reconciliation as cancellations accumulate. Only
      // fires on the actual transition into 'cancelled' (not if it was
      // already cancelled), so re-saving an already-cancelled order can't
      // double-restock it.
      if (status === 'cancelled' && existing?.status !== 'cancelled') {
        for (const item of order.items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
        }
      }

      return order;
    });

    await logAdminAction(req.user, 'order.status', { orderId: updated.id, status });
    notifyOrderStatus(updated); // fire-and-forget — don't make the admin wait on outbound email
    res.json({ order: serializeOrder(updated) });
  } catch (err) {
    next(err);
  }
});

// ---------- Coupons ----------

router.get('/coupons', async (req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
});

router.post('/coupons', requireCsrf, async (req, res, next) => {
  try {
    const { code, type, value, minSubtotal } = req.body;
    if (!code || !['percent', 'fixed'].includes(type) || !(value > 0)) {
      return res.status(400).json({ error: 'Please fill in a valid code, type, and value.' });
    }
    const coupon = await prisma.coupon.create({
      data: { code: code.toUpperCase().trim(), type, value: parseFloat(value), minSubtotal: parseFloat(minSubtotal) || 0 },
    });
    await logAdminAction(req.user, 'coupon.create', { code: coupon.code });
    res.status(201).json({ coupon });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'A coupon with that code already exists.' });
    next(err);
  }
});

router.put('/coupons/:id', requireCsrf, async (req, res, next) => {
  try {
    const { active, type, value, minSubtotal } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        active: active !== undefined ? active : undefined,
        type,
        value: value !== undefined ? parseFloat(value) : undefined,
        minSubtotal: minSubtotal !== undefined ? parseFloat(minSubtotal) : undefined,
      },
    });
    await logAdminAction(req.user, 'coupon.update', { code: coupon.code, active: coupon.active });
    res.json({ coupon });
  } catch (err) {
    next(err);
  }
});

router.delete('/coupons/:id', requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    await prisma.coupon.delete({ where: { id: req.params.id } });
    await logAdminAction(req.user, 'coupon.delete', { code: existing?.code });
    res.json({});
  } catch (err) {
    next(err);
  }
});

// ---------- 2FA (admin account security) ----------

router.post('/2fa/setup', requireCsrf, async (req, res, next) => {
  try {
    const secret = generateSecret(req.user.email);
    const qrCode = await secretToQrDataUrl(secret.otpauth_url);
    await prisma.user.update({ where: { id: req.user.id }, data: { twoFASecretPending: secret.base32 } });
    res.json({ secret: secret.base32, qrCode });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/enable', requireCsrf, async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.twoFASecretPending) return res.status(400).json({ error: 'Start 2FA setup first' });
    if (!code || !verifyTotp(user.twoFASecretPending, code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFAEnabled: true, twoFASecret: user.twoFASecretPending, twoFASecretPending: null },
    });
    await logAdminAction(req.user, '2fa.enable', {});
    res.json({});
  } catch (err) {
    next(err);
  }
});

// Disabling 2FA requires a valid current TOTP code, same as enabling it —
// previously this only needed a valid session (any authenticated admin
// request), so a hijacked session/stolen cookie could silently strip 2FA
// protection with a single call and no further proof of possessing the
// authenticator. Re-checking the code here closes that gap.
router.post('/2fa/disable', requireCsrf, async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.twoFAEnabled) return res.status(400).json({ error: '2FA is not enabled' });
    if (!code || !verifyTotp(user.twoFASecret, code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFAEnabled: false, twoFASecret: null, twoFASecretPending: null },
    });
    await logAdminAction(req.user, '2fa.disable', {});
    res.json({});
  } catch (err) {
    next(err);
  }
});

// ---------- Audit log ----------

router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// ---------- RFQ / Quotes ----------

router.get('/quotes', async (req, res, next) => {
  try {
    const status = (req.query.status || '').toString();
    const where = status ? { status } : {};
    // RFQ volume is normally far lower than order volume (only some
    // shoppers request a bulk quote), so full pagination isn't needed yet —
    // but capped with `take` as a safety net against unbounded growth,
    // same defensive instinct as the other admin list endpoints above.
    const quotes = await prisma.quote.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
    res.json({ quotes });
  } catch (err) {
    next(err);
  }
});

router.patch('/quotes/:id', requireCsrf, async (req, res, next) => {
  try {
    const { status, adminNote, quotedTotal } = req.body;
    if (status && !['pending', 'responded', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const updated = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        status: status || undefined,
        adminNote: adminNote !== undefined ? adminNote : undefined,
        quotedTotal: quotedTotal !== undefined ? (quotedTotal ? parseFloat(quotedTotal) : null) : undefined,
      },
    });
    await logAdminAction(req.user, 'quote.update', { quoteId: updated.id, status: updated.status });
    res.json({ quote: updated });
  } catch (err) {
    next(err);
  }
});

// ---------- Backup & Restore ----------
// An application-level data snapshot (JSON), not a substitute for real
// database backups (pg_dump / managed Postgres point-in-time recovery,
// which should also be configured at the hosting level). This gives admins
// a quick, portable export of the catalog and a way to restore it, without
// needing database access.

router.get('/backup/export', async (req, res, next) => {
  try {
    const [products, coupons, dealers] = await Promise.all([
      prisma.product.findMany(),
      prisma.coupon.findMany(),
      prisma.user.findMany({
        where: { role: 'dealer' },
        select: {
          id: true, name: true, email: true, businessName: true, phone: true, address: true,
          dealerStatus: true, dealerDiscountPercent: true, createdAt: true,
        },
      }),
    ]);
    await logAdminAction(req.user, 'backup.export', { productCount: products.length });
    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      products,
      coupons,
      dealers,
    });
  } catch (err) {
    next(err);
  }
});

// Restore is scoped to products only, upserted by SKU/id — restoring users
// or orders wholesale from a file is a much bigger blast radius (could
// silently overwrite live customer data) and isn't worth the risk here.
router.post('/backup/restore', requireCsrf, async (req, res, next) => {
  try {
    const products = Array.isArray(req.body.products) ? req.body.products : [];
    if (products.length === 0) return res.status(400).json({ error: 'No products found in backup file' });

    let restored = 0;
    // Batched concurrency, matching /products/import — a fully sequential
    // upsert loop over 10,000+ rows could take minutes and risk an
    // HTTP/proxy timeout before the restore ever finishes.
    const RESTORE_BATCH_SIZE = 20;
    for (let i = 0; i < products.length; i += RESTORE_BATCH_SIZE) {
      const batch = products.slice(i, i + RESTORE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((p) => {
          const { id, ...rest } = p;
          delete rest.createdAt;
          delete rest.updatedAt;
          return prisma.product.upsert({ where: { id }, create: { id, ...rest }, update: rest });
        })
      );
      // Skip rows that fail (e.g. unique SKU conflict with a different id) —
      // report the count restored rather than failing the whole batch.
      restored += results.filter((r) => r.status === 'fulfilled').length;
    }
    await logAdminAction(req.user, 'backup.restore', { restored, attempted: products.length });
    res.json({ restored, attempted: products.length });
  } catch (err) {
    next(err);
  }
});

export default router;
