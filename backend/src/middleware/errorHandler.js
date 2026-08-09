import { reportServerError } from '../utils/errorTracking.js';

// Catches anything that reached `next(err)` from a route. Kept generic on
// purpose — leaking stack traces or raw DB errors to the client is an
// information-disclosure risk, so only a safe message goes out.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Logs to console either way; also reports to Sentry when SENTRY_DSN is
  // set (see utils/errorTracking.js) — no-op otherwise.
  reportServerError(err, { path: req.path, method: req.method });

  if (err.code === 'P2025') return res.status(404).json({ error: 'Resource not found' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'That value is already in use' });
  // Foreign-key constraint violation — e.g. deleting a product that's still
  // referenced by existing order line items. Individual routes can catch
  // this earlier for a more specific message (see admin.routes.js product
  // delete); this is the fallback so no delete anywhere in the app ever
  // surfaces a silent/generic 500 for what's actually a "still in use" case.
  if (err.code === 'P2003') return res.status(409).json({ error: 'This item can\u2019t be deleted because it\u2019s still referenced by other records.' });
  // Serializable-transaction write conflict (see the checkout transaction
  // in orders.routes.js) — the request lost a genuine race against another
  // concurrent, conflicting request. Not a bug, just Postgres correctly
  // refusing to let both through; safe and correct for the client to retry.
  if (err.code === 'P2034') return res.status(409).json({ error: 'This request conflicted with another one. Please try again.' });
  if (err.name === 'MulterError') return res.status(400).json({ error: err.message });

  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
}
