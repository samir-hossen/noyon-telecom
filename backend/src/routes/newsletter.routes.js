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

// One-click unsubscribe — GET (not POST) because this is meant to be a
// plain link a mail client can open directly, the same way every real
// newsletter's unsubscribe link works; no CSRF token applies to a top-level
// navigation like this, and the action is naturally idempotent (deleting
// an already-removed subscriber is a harmless no-op) — no admin account or
// broadcast-sending capability exists yet to abuse (see the comment above
// the POST route), so this is only ever a self-serve opt-out. Returns a
// minimal HTML page directly rather than redirecting to a frontend route,
// since this is a rarely-visited utility link with nothing else to show.
router.get('/unsubscribe', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim();
    if (EMAIL_RE.test(email)) {
      await prisma.newsletterSubscriber.deleteMany({ where: { email } });
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed — Noyon Telecom</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#3a2e2a;">
<h2>You've been unsubscribed</h2>
<p>${email ? email + ' will' : 'You will'} no longer receive newsletter emails from Noyon Telecom.</p>
<p><a href="${process.env.FRONTEND_URL || 'https://noyontelecom.com'}">Return to noyontelecom.com</a></p>
</body></html>`);
  } catch (err) {
    next(err);
  }
});

export default router;
