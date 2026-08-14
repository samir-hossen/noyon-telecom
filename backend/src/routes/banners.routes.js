import { Router } from 'express';
import prisma from '../prismaClient.js';
import { getOrSet } from '../utils/cache.js';

const router = Router();

// Public, read-only — powers the homepage hero carousel. Only `active`
// banners, ordered the same way the admin list shows them. Short cache
// since this is hit on every homepage load; admin writes clear it
// immediately (see admin.routes.js's banner routes).
router.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    const banners = await getOrSet('banners:active', 60, () =>
      prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })
    );
    res.json({ banners });
  } catch (err) {
    next(err);
  }
});

export default router;
