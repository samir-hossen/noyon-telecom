// Thin wrapper around the SSLCommerz Session API. SSLCommerz is a payment
// aggregator, not a single method — once a customer is redirected to their
// GatewayPageURL they can pay with bKash, Nagad, Rocket, Visa/Mastercard,
// or local net banking, and SSLCommerz settles it to our merchant account.
//
// Sandbox docs: https://developer.sslcommerz.com/doc/v4/
// No SDK needed — it's plain REST, and Node 20 has a global fetch.

const IS_LIVE = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const BASE_URL = IS_LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';

export function isSslcommerzConfigured() {
  return !!(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
}

function assertConfigured() {
  if (!isSslcommerzConfigured()) {
    throw new Error(
      'Online payment is not configured yet. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in backend/.env ' +
        '(get free sandbox credentials at https://developer.sslcommerz.com/registration/).'
    );
  }
}

// Starts a payment session for an order and returns the URL to redirect the
// customer to. `urls` are the three redirect targets SSLCommerz posts back
// to (success/fail/cancel) plus the server-to-server IPN endpoint.
export async function initSslcommerzPayment({ order, urls }) {
  assertConfigured();

  const body = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    total_amount: String(order.total),
    currency: 'BDT',
    tran_id: order.id,
    success_url: urls.success,
    fail_url: urls.fail,
    cancel_url: urls.cancel,
    ipn_url: urls.ipn,
    shipping_method: 'Courier',
    product_name: order.items.map((i) => i.name).join(', ').slice(0, 250),
    product_category: 'Mobile Phone Parts & Accessories',
    product_profile: 'general',
    cus_name: order.shipping.name,
    cus_email: order.shipping.email,
    cus_add1: order.shipping.address,
    cus_city: order.shipping.city,
    cus_country: 'Bangladesh',
    cus_phone: order.shipping.phone,
    ship_name: order.shipping.name,
    ship_add1: order.shipping.address,
    ship_city: order.shipping.city,
    ship_country: 'Bangladesh',
  });

  const res = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();

  if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
    throw new Error(data.failedreason || 'Could not start the payment session. Please try again.');
  }

  return data.GatewayPageURL;
}

// SSLCommerz's success/IPN callbacks include a val_id that MUST be
// re-validated server-to-server before trusting the payment — never trust
// the redirect/POST body alone, since it's client-observable.
export async function validateSslcommerzPayment(valId) {
  assertConfigured();

  const params = new URLSearchParams({
    val_id: valId,
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    format: 'json',
  });

  const res = await fetch(`${BASE_URL}/validator/api/validationserverAPI.php?${params.toString()}`);
  const data = await res.json();

  const ok = data.status === 'VALID' || data.status === 'VALIDATED';
  return { ok, data };
}
