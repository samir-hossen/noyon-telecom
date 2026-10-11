// Security headers of the storefront (the Render static site — see the
// `headers` list in ../../../render.yaml). The server-rendered catalog pages
// (routes/seo.routes.js) are served on the storefront's domain through
// Render rewrite rules, so they must send the storefront's headers, not the
// API's stricter helmet() defaults (which would block Cloudinary images and
// the API calls the React app makes). Keep in sync with render.yaml.
export const STOREFRONT_CSP =
  "default-src 'self'; script-src 'self' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net https://analytics.tiktok.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://noyon-telecom-api.onrender.com https://www.google-analytics.com https://*.google-analytics.com https://googleads.g.doubleclick.net https://www.facebook.com https://analytics.tiktok.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://challenges.cloudflare.com; frame-src https://www.google.com https://recaptcha.google.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests";

export const STOREFRONT_HEADERS = {
  'Content-Security-Policy': STOREFRONT_CSP,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
