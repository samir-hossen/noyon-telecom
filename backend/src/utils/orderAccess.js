// Single source of truth for "can this requester see this order's
// details?" — used by both GET /orders/:id (orders.routes.js) and the
// SSLCommerz payment-init route (payment.routes.js), which previously each
// had their own slightly-different inline copy of this same check. An
// admin can always view any order. A logged-in user can view their own
// orders. A guest (no account) must provide the exact email the order was
// placed under — the same "prove you know something only the real
// customer would know" model used everywhere a guest needs order access in
// this app, since a guest has no session cookie to authenticate with.
//
// Email matching is case-insensitive: email addresses are conventionally
// treated case-insensitively for matching purposes (this isn't a secret
// being checked, just an identity match), and being case-SENSITIVE here
// would only ever incorrectly block a legitimate guest who typed
// "Name@Example.com" instead of "name@example.com" — it buys no real
// security since guestEmail was never meant to function as a password.
export function canViewOrder(order, user, providedEmail) {
  if (!order) return false;
  if (user?.role === 'admin') return true;
  if (order.userId) return Boolean(user) && user.id === order.userId;
  const email = (providedEmail || '').toString().trim().toLowerCase();
  return Boolean(order.guestEmail) && email === order.guestEmail.toLowerCase();
}
