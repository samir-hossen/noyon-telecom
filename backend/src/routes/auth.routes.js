import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient.js';
import { signAuthToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { requireAuth, publicUser } from '../middleware/auth.js';
import { requireCsrf, issueCsrfToken } from '../middleware/csrf.js';
import { generateRawToken, hashToken } from '../utils/tokens.js';
import { sendMail } from '../utils/mailer.js';
import { verifyToken as verifyTotp } from '../utils/totp.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 6;

function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= PASSWORD_MIN;
}

router.get('/csrf', (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  res.json({ csrfToken });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/register', requireCsrf, async (req, res, next) => {
  try {
    const { name, email, password, recaptchaToken, accountType, businessName, phone, address } = req.body;
    if (!name || !EMAIL_RE.test(email || '') || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Please fill in all fields correctly. Password needs at least 6 characters.' });
    }
    const isDealer = accountType === 'dealer';
    if (isDealer && (!businessName || !phone)) {
      return res.status(400).json({ error: 'Please provide your business name and phone number for a dealer account.' });
    }
    if (!(await verifyRecaptcha(recaptchaToken, 'register'))) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: isDealer ? 'dealer' : 'customer',
        businessName: isDealer ? businessName : null,
        phone: isDealer ? phone : phone || null,
        address: isDealer ? address || null : null,
        // New dealer accounts start pending until an admin approves them —
        // they can browse and use the site as a regular customer meanwhile,
        // but only see dealer pricing once approved.
        dealerStatus: isDealer ? 'pending' : null,
      },
    });

    await issueVerificationEmail(user);

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', requireCsrf, async (req, res, next) => {
  try {
    const { email, password, recaptchaToken } = req.body;
    if (!EMAIL_RE.test(email || '') || !password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    if (!(await verifyRecaptcha(recaptchaToken, 'login'))) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.twoFAEnabled) {
      const pending = await prisma.pendingAuth.create({
        data: { userId: user.id, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
      return res.json({ twoFARequired: true, pendingId: pending.id });
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/2fa/verify', requireCsrf, async (req, res, next) => {
  try {
    const { pendingId, code } = req.body;
    if (!pendingId || !code) return res.status(400).json({ error: 'Missing verification code' });

    const pending = await prisma.pendingAuth.findUnique({ where: { id: pendingId }, include: { user: true } });
    if (!pending || pending.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This login attempt has expired. Please sign in again.' });
    }

    const user = pending.user;
    if (!user.twoFAEnabled || !verifyTotp(user.twoFASecret, code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.pendingAuth.delete({ where: { id: pendingId } });

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireCsrf, (req, res) => {
  clearAuthCookie(res);
  res.json({});
});

// Always responds the same way whether or not the email exists, so this
// endpoint can never be used to enumerate registered accounts.
router.post('/forgot-password', requireCsrf, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (EMAIL_RE.test(email || '')) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user) {
        const raw = generateRawToken();
        await prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        });
        const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${raw}`;
        await sendMail({
          to: user.email,
          subject: 'Reset your Noyon Telecom password',
          text: `Reset your password: ${link}\nThis link expires in 30 minutes.`,
        });
      }
    }
    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', requireCsrf, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash, used: false } });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email', requireCsrf, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing verification token' });

    const tokenHash = hashToken(token);
    const record = await prisma.emailVerificationToken.findFirst({ where: { tokenHash, used: false } });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired. Request a new one from your account.' });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    res.json({});
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', requireAuth, requireCsrf, async (req, res, next) => {
  try {
    if (req.user.emailVerified) return res.json({});
    await issueVerificationEmail(req.user);
    res.json({});
  } catch (err) {
    next(err);
  }
});

async function issueVerificationEmail(user) {
  const raw = generateRawToken();
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${raw}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your Noyon Telecom email',
    text: `Welcome to Noyon Telecom! Verify your email: ${link}`,
  });
}

export default router;
