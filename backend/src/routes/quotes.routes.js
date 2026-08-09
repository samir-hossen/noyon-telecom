import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../prismaClient.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// RFQ submission is open to guests and (unlike /api/contact) has no
// reCAPTCHA in front of it, so it's the more attractive target for a spam
// bot flooding the sales inbox with fake requests-for-quote. Scoped to just
// this route (not the whole router) so it never throttles a dealer
// checking their own quote history via GET /mine.
const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many quote requests from this connection. Please try again later or contact us directly.' },
});

function serializeQuote(q) {
  return {
    id: q.id,
    name: q.name,
    email: q.email,
    phone: q.phone,
    businessName: q.businessName,
    items: Array.isArray(q.items) ? q.items : [],
    message: q.message,
    status: q.status,
    adminNote: q.adminNote,
    quotedTotal: q.quotedTotal,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

// Submit a new RFQ — works for guests and logged-in users/dealers alike.
router.post('/', quoteLimiter, optionalAuth, requireCsrf, async (req, res, next) => {
  try {
    const { name, email, phone, businessName, items, message } = req.body;
    if (!name?.trim() || !EMAIL_RE.test(email || '') || !phone?.trim()) {
      return res.status(400).json({ error: 'Name, a valid email, and phone number are required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Add at least one item to your quote request.' });
    }
    const cleanItems = items
      .map((i) => ({
        productId: i.productId || null,
        name: String(i.name || '').slice(0, 200),
        sku: i.sku || null,
        qty: Math.max(1, parseInt(i.qty, 10) || 1),
      }))
      .filter((i) => i.name);

    const quote = await prisma.quote.create({
      data: {
        userId: req.user?.id || null,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        businessName: businessName?.trim() || null,
        items: cleanItems,
        message: message?.trim() || null,
      },
    });

    // Best-effort notification — a failed email must never block the RFQ
    // from being saved, since the admin panel is the source of truth.
    sendMail({
      to: process.env.STORE_CONTACT_EMAIL || 'support@noyontelecom.com',
      subject: `New RFQ from ${quote.name}${quote.businessName ? ` (${quote.businessName})` : ''}`,
      text: `${quote.name} (${quote.email}, ${quote.phone}) requested a quote for ${cleanItems.length} item(s):\n${cleanItems
        .map((i) => `- ${i.name} x${i.qty}${i.sku ? ` [${i.sku}]` : ''}`)
        .join('\n')}\n\nMessage: ${quote.message || '(none)'}`,
    }).catch(() => {});

    res.status(201).json({ quote: serializeQuote(quote) });
  } catch (err) {
    next(err);
  }
});

// A logged-in user's own quote history.
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const quotes = await prisma.quote.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json({ quotes: quotes.map(serializeQuote) });
  } catch (err) {
    next(err);
  }
});

export default router;
