// Bangladeshi SMS gateway integration for order notifications (order
// placed, shipped, delivered, etc.). Wired for BulkSMSBD (bulksmsbd.net) —
// a plain HTTP GET API, no HMAC signing, which makes it one of the fastest
// BD gateways to get running. If you use a different provider (Alpha SMS,
// SSL Wireless, Elitbuzz, Reve Systems, etc.), THIS is the one file to
// change — every call site elsewhere just calls sendSms(phone, message)
// and doesn't know or care which gateway is behind it.
//
// Setup: sign up at https://bulksmsbd.net, get your API key + an approved
// sender ID from their dashboard, then set SMS_API_KEY and SMS_SENDER_ID in
// .env. Until both are set, sendSms() just logs to the console (same
// fallback pattern as utils/mailer.js) so local dev keeps working without
// an account.

const SMS_API_URL = process.env.SMS_API_URL || 'http://bulksmsbd.net/api/smsapi';

function isConfigured() {
  return Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER_ID);
}

// Normalizes a Bangladeshi mobile number to the 8801XXXXXXXXX format almost
// every local gateway expects (country code, no leading zero, no '+', no
// spaces/dashes). Accepts the common ways a customer might type it in a
// shipping form: 01XXXXXXXXX, 1XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX,
// or with spaces/dashes in any of those.
export function normalizeBdPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length === 13) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return null; // doesn't match any known BD mobile shape — don't guess further, let the caller decide
}

// Fire-and-forget by convention at the call sites (checkout confirmation,
// order status updates) — a down SMS gateway should never block or fail an
// order update. Callers still get a rejected promise on real failures so
// they can log it; they just shouldn't await it inline before responding.
export async function sendSms(rawPhone, message) {
  const phone = normalizeBdPhone(rawPhone);

  if (!isConfigured() || !phone) {
    console.log('\n----- 📱 SMS (gateway not configured, logging instead) -----');
    console.log('To:', phone || rawPhone || '(no phone on file)');
    console.log('Message:', message);
    console.log('-------------------------------------------------------------\n');
    return { sent: false, reason: isConfigured() ? 'invalid_phone' : 'not_configured' };
  }

  const params = new URLSearchParams({
    api_key: process.env.SMS_API_KEY,
    type: 'text',
    number: phone,
    senderid: process.env.SMS_SENDER_ID,
    message,
  });

  const res = await fetch(`${SMS_API_URL}?${params.toString()}`);
  const body = (await res.text()).trim();

  // BulkSMSBD's API replies with a bare numeric response code as plain
  // text, not JSON — 202 means "submitted successfully". Any other code is
  // a documented error (bad API key, insufficient balance, invalid sender
  // ID, etc.) — see https://bulksmsbd.net/api-documentation for the list.
  if (!res.ok || !body.startsWith('202')) {
    throw new Error(`SMS gateway rejected the message (response: ${body || res.status})`);
  }
  return { sent: true, response: body };
}
