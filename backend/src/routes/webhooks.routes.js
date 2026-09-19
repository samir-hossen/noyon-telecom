import { Router } from 'express';
import prisma from '../prismaClient.js';
import { notifyOrderStatus } from './admin.routes.js';

const router = Router();

// Steadfast pushes a delivery-status update to this URL every time a
// parcel's status changes (configure it once in the Steadfast merchant
// panel > API Docs > "Notification URL", pointed at this backend's own
// public URL — NOT the storefront's domain, since only this backend serves
// this route: https://<your-backend-domain>/api/webhooks/steadfast?token=...).
//
// Steadfast doesn't sign these requests, so `token` is this app's own
// shared secret (STEADFAST_WEBHOOK_SECRET) appended to the URL you give
// them — without it, anyone who found/guessed a consignment id (a small
// sequential integer) could POST a fake "delivered" and silently flip a
// real order's status.
router.post('/steadfast', async (req, res) => {
  try {
    if (!process.env.STEADFAST_WEBHOOK_SECRET || req.query.token !== process.env.STEADFAST_WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Invalid or missing webhook token' });
    }

    const consignmentId = Number(req.body.consignment_id);
    const deliveryStatus = req.body.delivery_status || req.body.status;
    if (!consignmentId || !deliveryStatus) return res.status(400).json({ error: 'consignment_id and delivery_status are required' });

    const order = await prisma.order.findFirst({
      where: { courierConsignmentId: consignmentId },
      include: { items: true, user: { select: { email: true } } },
    });
    // Ack 200 either way — an order that isn't found here isn't something
    // Steadfast can fix by retrying, and most couriers retry non-2xx
    // responses, which would otherwise hammer this endpoint forever.
    if (!order) return res.status(200).json({ received: true });

    const data = { courierStatus: deliveryStatus };
    // Only "delivered" promotes the order's own status — every other
    // Steadfast status (in_review, pending, cancelled_approval_pending,
    // etc.) is courier-internal detail the admin can see via courierStatus
    // without this app guessing how it maps onto OrderStatus. Guarded to
    // fire only from 'shipped' so a stray/replayed webhook can't resurrect
    // an order an admin already separately cancelled or already delivered.
    const promotesToDelivered = deliveryStatus === 'delivered' && order.status === 'shipped';
    if (promotesToDelivered) data.status = 'delivered';

    const updated = await prisma.order.update({ where: { id: order.id }, data, include: { items: true, user: { select: { email: true } } } });
    if (promotesToDelivered) notifyOrderStatus(updated);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Steadfast webhook error:', err.message);
    res.status(200).json({ received: true }); // still ack — see note above
  }
});

export default router;
