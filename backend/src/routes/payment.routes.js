import express, { Router } from 'express';
import prisma from '../prismaClient.js';
import { optionalAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { initSslcommerzPayment, validateSslcommerzPayment } from '../utils/sslcommerz.js';
import { sendMetaPurchaseEvent } from '../utils/metaCapi.js';

const router = Router();

const API_BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Only order owners (or the guest who just placed it, matched by email) can
// start a payment session for it — prevents someone paying for/probing
// arbitrary order IDs.
async function loadPayableOrder(req, res) {
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId }, include: { items: true } });
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return null;
  }
  const isOwner = req.user && order.userId === req.user.id;
  const isGuestMatch = !order.userId && order.guestEmail && req.body?.email === order.guestEmail;
  if (!isOwner && !isGuestMatch) {
    res.status(403).json({ error: 'You do not have access to this order' });
    return null;
  }
  if (order.status !== 'processing') {
    res.status(400).json({ error: 'This order has already been paid or is no longer payable.' });
    return null;
  }
  return order;
}

router.post('/sslcommerz/init/:orderId', optionalAuth, requireCsrf, async (req, res, next) => {
  try {
    const order = await loadPayableOrder(req, res);
    if (!order) return;

    const url = await initSslcommerzPayment({
      order,
      urls: {
        success: `${API_BASE}/api/payment/sslcommerz/success`,
        fail: `${API_BASE}/api/payment/sslcommerz/fail`,
        cancel: `${API_BASE}/api/payment/sslcommerz/cancel`,
        ipn: `${API_BASE}/api/payment/sslcommerz/ipn`,
      },
    });

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// SSLCommerz posts these four as application/x-www-form-urlencoded, which
// requires its own parser (app.js only parses JSON globally).
const formParser = express.urlencoded({ extended: true });
router.use('/sslcommerz/success', formParser);
router.use('/sslcommerz/fail', formParser);
router.use('/sslcommerz/cancel', formParser);
router.use('/sslcommerz/ipn', formParser);

// A validated val_id only proves *some* real payment happened — it does not
// by itself prove it was for THIS order and THIS amount. Without this check,
// a val_id from any successful (even trivially small) payment could be
// replayed with a different tran_id in the POST body to mark an unrelated,
// higher-value order as paid. Always bind the validated amount/currency back
// to the order we're about to mark paid.
function paymentMatchesOrder(validationData, order) {
  if (!order || order.status === 'paid') return false;
  if (String(validationData.tran_id) !== String(order.id)) return false;
  const paidAmount = Number(validationData.amount ?? validationData.currency_amount);
  if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - order.total) > 0.5) return false;
  if (validationData.currency_type && validationData.currency_type !== 'BDT') return false;
  return true;
}

router.post('/sslcommerz/success', async (req, res) => {
  const { tran_id: orderId, val_id: valId } = req.body;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    const { ok, data } = await validateSslcommerzPayment(valId);
    if (ok && paymentMatchesOrder(data, order)) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid', transactionId: orderId, gatewayValId: valId },
      });
    }
  } catch {
    // Fall through to redirect regardless — the IPN callback below is the
    // authoritative confirmation path and will retry the validation.
  }
  res.redirect(`${FRONTEND_URL}/order-confirmation/${orderId}`);
});

router.post('/sslcommerz/fail', async (req, res) => {
  res.redirect(`${FRONTEND_URL}/order-confirmation/${req.body.tran_id}?payment=failed`);
});

router.post('/sslcommerz/cancel', async (req, res) => {
  res.redirect(`${FRONTEND_URL}/order-confirmation/${req.body.tran_id}?payment=cancelled`);
});

// Server-to-server callback — this is the source of truth for "did the
// money actually arrive", since it doesn't depend on the customer's browser
// successfully following the success_url redirect.
router.post('/sslcommerz/ipn', async (req, res) => {
  try {
    const { tran_id: orderId, val_id: valId } = req.body;
    if (!orderId || !valId) return res.status(400).end();

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    const { ok, data } = await validateSslcommerzPayment(valId);
    if (ok && paymentMatchesOrder(data, order)) {
      const { count } = await prisma.order.updateMany({
        where: { id: orderId, status: { not: 'paid' } },
        data: { status: 'paid', transactionId: orderId, gatewayValId: valId },
      });
      // Only fire once, on the transition into "paid" — updateMany's count
      // is 0 if the IPN retries and the order was already marked paid.
      if (count > 0) {
        sendMetaPurchaseEvent({ order, req }).catch(() => {});
      }
    }
    res.status(200).end();
  } catch {
    res.status(200).end(); // Ack anyway; SSLCommerz retries on non-200s.
  }
});

export default router;
