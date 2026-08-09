// Minimal analytics + error-tracking wiring. Both are entirely optional
// and no-op unless you set the corresponding env var.
//
// - Analytics: set VITE_GA_ID to a GA4 measurement id (e.g. "G-XXXXXXX")
//   in frontend/.env to start collecting pageviews + events.
// - Error tracking: set VITE_SENTRY_DSN in frontend/.env to a real Sentry
//   DSN (from sentry.io -> Project Settings -> Client Keys) and every
//   reportError() call site (ErrorBoundary, window.onerror,
//   unhandledrejection) automatically starts reporting there too. Leave it
//   unset and errors just go to the console + GA4, as before.
//
// @sentry/react (~25-30KB gzipped) is loaded on demand, not imported at
// the top level — most deployments won't set VITE_SENTRY_DSN right away,
// and there's no reason to make every visitor download an error-tracking
// SDK that's doing nothing.

let gaLoaded = false;
let sentryModule = null; // set once loaded, so reportError can use it synchronously

export async function initErrorTracking() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || sentryModule) return;
  const Sentry = await import('@sentry/react');
  sentryModule = Sentry;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.2,
  });
}

export function initAnalytics() {
  const gaId = import.meta.env.VITE_GA_ID;
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  // Either id alone is enough to load gtag.js — GA4-only, Ads-only, and
  // both-together setups are all valid.
  if ((!gaId && !adsId) || gaLoaded) return;
  gaLoaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId || adsId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  if (gaId) window.gtag('config', gaId, { send_page_view: false }); // we send pageviews manually below (SPA routing)
  // Loading the Ads id too (not just GA4) is what actually lets Google Ads
  // read conversions — GA4-only setups never get the conversion attributed
  // back to a specific campaign/ad in the Ads dashboard.
  if (adsId) window.gtag('config', adsId);
}

// Fires a Google Ads conversion, separate from the GA4 purchase event above.
// Get the conversion label from Google Ads -> Goals -> Conversions -> your
// "Purchase" action -> "See tag setup" -> the part after "AW-XXXXXXX/" in
// the send_to value. Set it as VITE_GOOGLE_ADS_CONVERSION_LABEL. No-op if
// either the Ads id or the label is missing.
export function trackGoogleAdsConversion({ value, transactionId }) {
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  const label = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL;
  if (!window.gtag || !adsId || !label) return;
  window.gtag('event', 'conversion', {
    send_to: `${adsId}/${label}`,
    value,
    currency: 'BDT',
    transaction_id: transactionId,
  });
}

// Call this from a route-change effect (see hooks/usePageTitle.js) so SPA
// navigations register as pageviews — GA4's automatic pageview only fires
// once, on the initial full page load.
export function trackPageview(path, title) {
  if (!window.gtag) return;
  window.gtag('event', 'page_view', { page_path: path, page_title: title });
}

export function trackEvent(name, params = {}) {
  if (!window.gtag) return;
  window.gtag('event', name, params);
}

// Central place to report caught/uncaught errors. See the file header for
// how to upgrade this to Sentry (or any other tracker) later.
export function reportError(error, context = {}) {
  console.error('Reported error:', error, context);
  if (window.gtag) {
    window.gtag('event', 'exception', { description: String(error?.message || error), fatal: !!context.fatal });
  }
  if (sentryModule) {
    sentryModule.captureException(error instanceof Error ? error : new Error(String(error)), { extra: context });
  }
}

export function initGlobalErrorTracking() {
  window.addEventListener('error', (event) => reportError(event.error || event.message, { source: 'window.onerror' }));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, { source: 'unhandledrejection' }));
}
