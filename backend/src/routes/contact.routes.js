import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../prismaClient.js';
import { requireCsrf } from '../middleware/csrf.js';
import { sendMail } from '../utils/mailer.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';

const router = Router();

// Previously covered only by the site-wide 600/15min backstop in app.js —
// far too loose to actually stop a script from flooding the support inbox
// (and, with recaptchaToken unset/invalid, verifyRecaptcha rejecting it
// costs nothing to attempt repeatedly). Matches quoteLimiter's reasoning in
// quotes.routes.js — scoped to just this route, not the whole router.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages from this connection. Please try again later or WhatsApp us directly.' },
});

router.post('/', contactLimiter, requireCsrf, async (req, res, next) => {
  try {
    const { name, email, phone, message, recaptchaToken } = req.body;
    if (!name || !email || !phone || !phone.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }
    if (!(await verifyRecaptcha(recaptchaToken, 'contact'))) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    await prisma.contactMessage.create({ data: { name, email, phone: phone.trim(), message: message.trim() } });

    // Fire-and-forget, like the equivalent RFQ notification in
    // quotes.routes.js — the message is already saved, so a down/misconfigured
    // SMTP server shouldn't turn an already-successful submission into a 500
    // that makes the visitor retry and create a duplicate row.
    sendMail({
      to: process.env.STORE_CONTACT_EMAIL || 'support@noyontelecom.com',
      subject: `New contact message from ${name}`,
      text: `From: ${name} <${email}>, ${phone}\n\n${message}`,
    }).catch(() => {});

    // Confirms receipt so the visitor isn't left wondering whether their
    // message actually went through — previously only the admin was ever
    // emailed about a contact submission.
    sendMail({
      to: email,
      subject: "We've received your message — Noyon Telecom",
      text: `Hi ${name},\n\nThanks for reaching out to Noyon Telecom. We've received your message and will get back to you soon:\n\n"${message}"\n\nIf this is urgent, call or WhatsApp us at +880 1560-047377.\n\n— Noyon Telecom`,
    }).catch(() => {});

    res.status(201).json({});
  } catch (err) {
    next(err);
  }
});

export default router;
