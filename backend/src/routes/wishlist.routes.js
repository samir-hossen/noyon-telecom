import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { serializeProduct, priceForViewer } from '../utils/serialize.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      products: rows.map((r) => {
        const product = serializeProduct(r.product);
        return { ...product, retailPrice: product.price, price: priceForViewer(product, req.user) };
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:productId', requireCsrf, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId: req.params.productId } },
      update: {},
      create: { userId: req.user.id, productId: req.params.productId },
    });
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.delete('/:productId', requireCsrf, async (req, res, next) => {
  try {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
    res.json({});
  } catch (err) {
    next(err);
  }
});

export default router;
