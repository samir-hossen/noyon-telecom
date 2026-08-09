// Optional, lazy-loaded server-side error tracking — mirrors the pattern
// already used on the frontend (see frontend/src/analytics.js). No-op
// unless SENTRY_DSN is set, so a deployment that never configures Sentry
// pays zero cost and needs zero extra dependency at runtime.
//
// Before this file existed, only the frontend had Sentry wired up
// (VITE_SENTRY_DSN) — a backend crash at 3am had nowhere to report to
// except stdout, which nobody is watching in real time. This closes that
// gap: set SENTRY_DSN in backend/.env and every error that reaches
// errorHandler.js (plus any uncaught exception/rejection) gets reported.
//
// Requires `npm install @sentry/node` (added to package.json) before
// SENTRY_DSN is set — left out of the default install path otherwise,
// same reasoning as the frontend: don't make every deployment carry an
// error-tracking SDK it isn't using.

let sentryModule = null;

export async function initErrorTracking() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || sentryModule) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.2,
    });
    sentryModule = Sentry;

    // Catch anything that isn't routed through Express's error handler at
    // all — a crash in a setInterval, an unhandled promise outside a
    // request/response cycle, etc. These would otherwise just crash the
    // process (or get silently swallowed) with nothing recorded anywhere.
    process.on('uncaughtException', (err) => reportServerError(err, { source: 'uncaughtException' }));
    process.on('unhandledRejection', (reason) => reportServerError(reason, { source: 'unhandledRejection' }));
  } catch (err) {
    // Missing @sentry/node (not installed) or a bad DSN shouldn't crash
    // the whole server on boot — log it once and keep running without
    // error tracking, same as if SENTRY_DSN had never been set.
    console.error('Failed to initialize error tracking:', err.message);
  }
}

export function reportServerError(error, context = {}) {
  console.error(error);
  if (sentryModule) {
    sentryModule.captureException(error, { extra: context });
  }
}
