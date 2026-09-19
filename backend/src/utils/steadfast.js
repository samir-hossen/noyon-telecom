// Thin wrapper around the Steadfast Courier merchant API — creates a
// consignment (parcel) for an order and looks up its delivery status.
// Same "optional, inactive until configured" pattern as sslcommerz.js.
//
// Docs live behind a merchant-panel login (portal.steadfast.com.bd > API
// Docs), not a public URL — the endpoints/field names below match
// Steadfast's widely-documented v1 API. Before relying on this in
// production, open your own merchant panel's API Docs page once and
// confirm the request/response shape still matches, then ship one real
// low-value order through it end-to-end (same caution as the SSLCommerz
// setup in DEPLOYMENT.md).

const BASE_URL = 'https://portal.steadfast.com.bd/api/v1';

export function isSteadfastConfigured() {
  return !!(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY);
}

function assertConfigured() {
  if (!isSteadfastConfigured()) {
    throw new Error(
      'Steadfast courier is not configured. Set STEADFAST_API_KEY and STEADFAST_SECRET_KEY in backend/.env ' +
        '(Steadfast merchant panel > API Docs / API Config page).'
    );
  }
}

function headers() {
  return {
    'Api-Key': process.env.STEADFAST_API_KEY,
    'Secret-Key': process.env.STEADFAST_SECRET_KEY,
    'Content-Type': 'application/json',
  };
}

// Creates a parcel/consignment for an order. `invoice` should be a value
// that's unique per order (this app passes the order id) — Steadfast
// rejects a duplicate invoice rather than silently creating a second
// consignment for the same order.
export async function createConsignment({ invoice, recipientName, recipientPhone, recipientAddress, codAmount, note }) {
  assertConfigured();
  const res = await fetch(`${BASE_URL}/create_order`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      invoice,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
      cod_amount: codAmount,
      note: note || '',
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || Number(data.status) !== 200 || !data.consignment) {
    throw new Error(`Steadfast create_order failed: ${data?.message || `HTTP ${res.status}`}`);
  }
  return data.consignment; // { consignment_id, tracking_code, status, ... }
}

export async function getStatusByConsignmentId(consignmentId) {
  assertConfigured();
  const res = await fetch(`${BASE_URL}/status_by_cid/${consignmentId}`, { headers: headers() });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`Steadfast status lookup failed: HTTP ${res.status}`);
  return data.delivery_status;
}

export async function getBalance() {
  assertConfigured();
  const res = await fetch(`${BASE_URL}/get_balance`, { headers: headers() });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`Steadfast balance lookup failed: HTTP ${res.status}`);
  return data.current_balance;
}
