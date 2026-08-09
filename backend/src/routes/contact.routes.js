import { Router } from 'express';
import prisma from '../prismaClient.js';
import { requireCsrf } from '../middleware/csrf.js';
import { sendMail } from '../utils/mailer.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';

const router = Router();

router.post('/', requireCsrf, async (req, res, next) => {
  try {
    const { name, email, message, recaptchaToken } = req.body;
    if (!name || !email || !message || !message.trim()) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }
    if (!(await verifyRecaptcha(recaptchaToken, 'contact'))) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    await prisma.contactMessage.create({ data: { name, email, message: message.trim() } });

    await sendMail({
      to: process.env.STORE_CONTACT_EMAIL || 'support@noyontelecom.com',
      subject: `New contact message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });

    res.status(201).json({});
  } catch (err) {
    next(err);
  }
});

export default router;
