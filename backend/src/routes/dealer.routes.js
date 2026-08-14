import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { upload, storeUploadedFile } from '../utils/upload.js';

const router = Router();

function requireDealer(req, res, next) {
  if (req.user.role !== 'dealer') return res.status(403).json({ error: 'Dealer account required' });
  next();
}

// Lets a dealer (pending or approved) upload/replace their trade license
// document after registration — speeds up admin verification without
// requiring it as a hard blocker at signup time. requireDealer runs before
// upload.single so a non-dealer request is rejected before multer buffers
// the file (up to 5MB) or a Cloudinary upload call happens, not after.
router.post('/trade-license', requireAuth, requireDealer, requireCsrf, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const url = await storeUploadedFile(req.file);
    const updated = await prisma.user.update({ where: { id: req.user.id }, data: { tradeLicenseUrl: url } });
    res.json({ tradeLicenseUrl: updated.tradeLicenseUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
