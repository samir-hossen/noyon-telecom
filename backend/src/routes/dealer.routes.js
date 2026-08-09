import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { upload, storeUploadedFile } from '../utils/upload.js';

const router = Router();

// Lets a dealer (pending or approved) upload/replace their trade license
// document after registration — speeds up admin verification without
// requiring it as a hard blocker at signup time.
router.post('/trade-license', requireAuth, requireCsrf, upload.single('image'), async (req, res, next) => {
  try {
    if (req.user.role !== 'dealer') return res.status(403).json({ error: 'Dealer account required' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const url = await storeUploadedFile(req.file);
    const updated = await prisma.user.update({ where: { id: req.user.id }, data: { tradeLicenseUrl: url } });
    res.json({ tradeLicenseUrl: updated.tradeLicenseUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
