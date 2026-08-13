import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { serializeProduct, withViewerPricing } from '../utils/serialize.js';

const router = Router();
router.use(requireAuth);

class CartError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadCart(userId, user) {
  const rows = await prisma.cartItem.findMany({ where: { userId }, include: { product: true } });
  const items = rows.map((r) => ({
    productId: r.productId,
    qty: r.qty,
    product: withViewerPricing(serializeProduct(r.product), user, r.qty),
  }));
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  return { items, subtotal };
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await loadCart(req.user.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.post('/add', requireCsrf, async (req, res, next) => {
  try {
    const { productId, qty } = req.body;
    const addQty = Math.max(1, parseInt(qty, 10) || 1);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Serializable so two near-simultaneous adds of the same product
    // (double-click, two open tabs) can't both read the same pre-add qty
    // and have the second write clobber the first — one loses the race
    // and gets a clean, retryable 409 (see errorHandler.js) instead of the
    // customer's cart silently ending up short a unit.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { userId_productId: { userId: req.user.id, productId } },
      });
      const moq = product.moq || 1;
      const requestedQty = Math.max(moq, (existing?.qty || 0) + addQty);
      const nextQty = Math.min(product.stock, requestedQty);
      if (nextQty <= 0) throw new CartError(400, 'This product is out of stock');
      if (nextQty < moq) throw new CartError(400, `This product has a minimum order quantity of ${moq}.`);

      await tx.cartItem.upsert({
        where: { userId_productId: { userId: req.user.id, productId } },
        update: { qty: nextQty },
        create: { userId: req.user.id, productId, qty: nextQty },
      });
    }, { isolationLevel: 'Serializable' });

    res.json(await loadCart(req.user.id, req.user));
  } catch (err) {
    if (err instanceof CartError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.put('/update', requireCsrf, async (req, res, next) => {
  try {
    const { productId, qty } = req.body;
    const newQty = parseInt(qty, 10);

    if (!newQty || newQty <= 0) {
      await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId } });
    } else {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const moq = product.moq || 1;
      if (newQty < moq) return res.status(400).json({ error: `This product has a minimum order quantity of ${moq}.` });
      const clampedQty = Math.min(newQty, product.stock);
      // Re-check after clamping to stock: if stock is lower than the MOQ
      // (e.g. moq=5 but only 3 left), the clamp above can silently pull the
      // quantity back below moq. Left unchecked, this would save a cart line
      // that violates the product's own minimum order quantity — same bug
      // class the atomic stock guard in POST /add already protects against.
      if (clampedQty < moq) {
        return res.status(400).json({ error: `Only ${product.stock} left in stock, which is below the minimum order quantity of ${moq}.` });
      }
      await prisma.cartItem.upsert({
        where: { userId_productId: { userId: req.user.id, productId } },
        update: { qty: clampedQty },
        create: { userId: req.user.id, productId, qty: clampedQty },
      });
    }
    res.json(await loadCart(req.user.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.delete('/remove/:productId', requireCsrf, async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
    res.json(await loadCart(req.user.id, req.user));
  } catch (err) {
    next(err);
  }
});

export default router;
