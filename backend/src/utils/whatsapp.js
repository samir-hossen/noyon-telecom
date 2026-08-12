// WhatsApp notification for the admin whenever a new order comes in —
// wired for CallMeBot (callmebot.com), a free personal-notification API.
// Deliberately not the official WhatsApp Business Cloud API: that requires
// Meta business verification and template-message approval before it can
// send anything, which can take days/weeks — CallMeBot works the moment
// you have an API key, which takes about a minute to get. It's meant for
// exactly this "notify one phone number" use case, not for messaging
// customers, so this only ever sends to the admin's own WhatsApp.
//
// Setup (one-time, ~1 minute):
//   1. Save +34 613 01 49 37 as a contact on the phone that should receive
//      order alerts (this is CallMeBot's bot number, the same for everyone).
//   2. From that phone, WhatsApp message "I allow callmebot to send me
//      messages" to that number.
//   3. CallMeBot replies with your API key.
//   4. Set WHATSAPP_ADMIN_PHONE (that same phone, in international format,
//      e.g. 8801XXXXXXXXX) and CALLMEBOT_API_KEY in .env.
// Until both are set, sendWhatsApp() just logs to the console (same
// fallback pattern as utils/sms.js and utils/mailer.js) so local dev keeps
// working without an account.

function isConfigured() {
  return Boolean(process.env.WHATSAPP_ADMIN_PHONE && process.env.CALLMEBOT_API_KEY);
}

// Fire-and-forget by convention at the call site (checkout) — a down/
// misconfigured WhatsApp notifier should never block or fail an order.
export async function sendWhatsApp(message) {
  if (!isConfigured()) {
    console.log('\n----- 💬 WhatsApp (CallMeBot not configured, logging instead) -----');
    console.log('Message:', message);
    console.log('---------------------------------------------------------------------\n');
    return { sent: false, reason: 'not_configured' };
  }

  const params = new URLSearchParams({
    phone: process.env.WHATSAPP_ADMIN_PHONE,
    text: message,
    apikey: process.env.CALLMEBOT_API_KEY,
  });

  const res = await fetch(`https://api.callmebot.com/whatsapp.php?${params.toString()}`);
  const body = (await res.text()).trim();

  // CallMeBot replies with plain text, not JSON — a successful send starts
  // with "Message queued". Anything else (expired API key, phone not
  // registered, rate limited) is a documented failure mode worth logging.
  if (!res.ok || !body.toLowerCase().startsWith('message queued')) {
    throw new Error(`WhatsApp notification failed (response: ${body || res.status})`);
  }
  return { sent: true, response: body };
}

// Builds the order-alert message text: who ordered, their contact/address,
// what they ordered, and the total — everything an admin needs to start
// fulfilling the order without opening the Admin panel first.
export function buildOrderWhatsAppMessage(order) {
  const shortOrderId = order.id.slice(-8).toUpperCase();
  const itemLines = order.items.map((i) => `- ${i.name} x${i.qty}`).join('\n');
  const ship = order.shipping || {};
  return [
    `🛒 New order #${shortOrderId}`,
    `Name: ${ship.name || '-'}`,
    `Phone: ${ship.phone || '-'}`,
    `Address: ${ship.address || ''}${ship.city ? `, ${ship.city}` : ''}`,
    `Payment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}`,
    '',
    'Items:',
    itemLines,
    '',
    `Total: ৳${Math.round(order.total).toLocaleString('en-BD')}`,
  ].join('\n');
}
