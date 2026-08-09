import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../prismaClient.js';
import { requireCsrf } from '../middleware/csrf.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The footer newsletter box is on every single page, so it's a plausible
// target for a scripted email-list-scraping/spam bot the same way the RFQ
// form is (see quotes.routes.js) — capped generously since a real person
// only ever submits this once.
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this connection. Please try again later.' },
});

router.post('/', newsletterLimiter, requireCsrf, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!EMAIL_RE.test(email || '')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const normalized = email.toLowerCase().trim();
    try {
      await prisma.newsletterSubscriber.create({ data: { email: normalized } });
    } catch (err) {
      // Already subscribed — treat as success rather than an error so
      // resubmitting (e.g. from another page) doesn't look like a failure.
      if (err.code !== 'P2002') throw err;
    }
    res.status(201).json({});
  } catch (err) {
    next(err);
  }
});

export default router;
