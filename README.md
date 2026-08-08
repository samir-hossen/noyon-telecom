# Noyon Telecom — Wholesale Mobile Phone Spare Parts

A React (Vite) storefront for wholesale mobile phone spare parts (displays, batteries, back glass, charging ports, and more), with cart, wishlist, guest + authenticated checkout, dealer accounts, order tracking, and an admin dashboard.

## Project structure

```
website/
├── frontend/          # React + Vite storefront
│   ├── src/
│   │   ├── components/  # Navbar, Footer, ProductCard, HeroCarousel, etc.
│   │   ├── context/      # Auth, Cart, Wishlist, Toast (React Context providers)
│   │   ├── hooks/        # usePageMeta (titles + SEO meta tags)
│   │   ├── pages/        # One file per route
│   │   ├── api.js        # Fetch wrapper: base URL, CSRF handling, image URL resolver
│   │   └── main.jsx       # App entry point
│   └── public/            # Static assets (favicon, manifest, robots.txt, sitemap.xml)
└── backend/            # Express + PostgreSQL (Prisma) REST API — see backend/README.md
```

## Prerequisites

- Node.js 20+
- A PostgreSQL database for the backend (see `backend/README.md`)

## Quick start (both frontend and backend)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # set DATABASE_URL, JWT_SECRET
npx prisma migrate dev --name init
npm run seed                 # creates an admin user + sample products
npm run dev                  # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173, proxies /api to :4000
```

Full backend setup, environment variables, and security notes are in
`backend/README.md`.

## Local development

```bash
cd frontend
npm install
cp .env.example .env     # fill in VITE_API_URL / VITE_RECAPTCHA_SITE_KEY if needed
npm run dev               # starts Vite on http://localhost:5173
```

In local dev, Vite proxies `/api` and `/uploads` to `http://localhost:4000`
(configured in `vite.config.js`), so make sure your backend is running on
that port — or update the proxy target.

## Production build

```bash
npm run build     # outputs static files to frontend/dist
npm run preview   # locally preview the production build
```

When deploying the frontend separately from the backend (e.g. frontend on
Vercel/Netlify, backend on Render/Railway), set `VITE_API_URL` to your
backend's full URL as a build-time environment variable.

## Backend

The frontend expects a REST API with routes under `/api`, including:
- `/api/auth/*` — login, register, 2FA, password reset, email verification (cookie-based sessions + CSRF)
- `/api/products` — listing, filtering, search, categories
- `/api/products/:id/reviews` — product reviews
- `/api/orders`, `/api/orders/mine`, `/api/orders/:id` — order placement & history
- `/api/admin/*` — product/order/coupon management (admin-only)

This backend isn't part of this snapshot. If you have it in another
directory or repo, drop it in as `website/backend/` to match the CI workflow.

## Key features already implemented

- Route-based code splitting (`React.lazy`) for fast first load
- httpOnly-cookie auth with CSRF protection (see `src/api.js`)
- Guest checkout + authenticated checkout
- Email verification, password reset, 2FA
- Wishlist, cart, coupon-ready checkout
- Product reviews (submit + display, tied to verified purchasers' star ratings)
- Real online payment via **SSLCommerz** — bKash, Nagad, Rocket, cards, and net banking, plus Cash on Delivery (see `backend/src/routes/payment.routes.js` and `backend/src/utils/sslcommerz.js`)
- Admin dashboard (products, orders, coupons)
- SEO basics: `robots.txt`, `sitemap.xml`, per-page `<title>` + meta description + Open Graph/Twitter tags (`usePageMeta` hook)
- Global error boundary (`src/components/ErrorBoundary.jsx`) + a lightweight, dependency-free error/analytics hook (`src/analytics.js`)
- Google Analytics 4 wiring (set `VITE_GA_ID`) with SPA-aware pageview tracking
- Skip-to-content link + focus-visible styles for keyboard/screen-reader users
- Frontend unit tests (Vitest + Testing Library), run in CI alongside the backend tests
- Skeleton loading states on Home, Shop, Product Detail, Orders, and Order Confirmation

## Setting up online payment (SSLCommerz)

1. Register for a free sandbox account at https://developer.sslcommerz.com/registration/
2. Copy the sandbox `Store ID` and `Store Password` into `backend/.env` as `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD`
3. Set `API_URL` in `backend/.env` to a publicly reachable URL for your backend (SSLCommerz calls it directly — use a tool like `ngrok http 4000` for local testing, since it can't reach `localhost`)
4. Test a checkout with the "bKash, Nagad, Rocket or card" option — SSLCommerz's sandbox gives you dummy bKash/card credentials to complete a test payment
5. When going live, apply for a live merchant account, set `SSLCOMMERZ_IS_LIVE=true`, and swap in your live credentials

Prices are displayed in BDT (`৳`) everywhere via the shared `formatPrice()` helper (`src/utils/currency.js`), matching what SSLCommerz actually settles (`currency: 'BDT'` in `backend/src/utils/sslcommerz.js`). If you add a new page or component that shows a price, import `formatPrice` from `../utils/currency` rather than hand-formatting the number, so this stays consistent.

## Setting up ad tracking (Meta Pixel, Google Analytics 4 + Ads, TikTok Pixel)

Every layer needed to run paid Meta/Google/TikTok ads and see real conversions
is already wired up — you only need to add IDs/tokens, nothing to code.

**1. Browser-side (frontend/.env):**
```
VITE_GA_ID=G-XXXXXXX                       # GA4 measurement id
VITE_GOOGLE_ADS_ID=AW-XXXXXXXXX            # Google Ads conversion id
VITE_GOOGLE_ADS_CONVERSION_LABEL=abc123    # from Google Ads > Goals > Conversions
VITE_META_PIXEL_ID=1234567890              # Meta Events Manager > your Pixel
VITE_TIKTOK_PIXEL_ID=ABCDEFG               # TikTok Ads Manager > Assets > Events
```
This alone gets you pageviews, `view_item`, `add_to_cart`, `begin_checkout`,
`purchase`, `search`, and lead events (WhatsApp order/quote clicks, contact
form) firing to GA4, Meta, TikTok, and a Google Ads conversion on purchase.
Verify with the **Meta Pixel Helper** browser extension and GA4's
DebugView before spending real ad budget.

**2. Server-side Meta Conversions API (backend/.env) — strongly recommended:**
```
META_PIXEL_ID=1234567890                   # same id as VITE_META_PIXEL_ID
META_CAPI_ACCESS_TOKEN=...                 # Events Manager > Conversions API > Generate access token
META_CAPI_TEST_EVENT_CODE=TEST12345        # optional, remove once verified working
```
iOS 14.5+ App Tracking Transparency, Safari ITP, and ad blockers routinely
drop the browser Pixel's `Purchase` event — Meta's own guidance is that this
is the single highest-leverage fix for ad performance, since Meta can't
optimize delivery toward conversions it never sees. With this set, a
`Purchase` event is sent server-to-server from `backend/src/utils/metaCapi.js`
the moment a Cash-on-Delivery order is placed, or the moment an online
payment is confirmed via the SSLCommerz IPN callback — deduplicated against
the matching browser Pixel event automatically (same `order.id` used as the
Meta `event_id` on both sides).

**3. Business/ad-account setup (outside this codebase, one-time):**
- Verify your domain in Meta Business Manager (Business Settings > Brand Safety > Domains)
- Submit your product feed (`/api/google-merchant.xml` — see `backend/src/routes/feed.routes.js`) to Google Merchant Center for Shopping ads, and the same feed to Meta Commerce Manager for a Facebook/Instagram Shop + Dynamic Ads catalog
- Set `SITE_URL` in `backend/.env` to your real domain before submitting — the feed builds absolute URLs from it

## Running tests

```bash
cd backend && npm test      # Node's built-in test runner
cd frontend && npm test     # Vitest
```

## Suggested next steps for production readiness

- Upgrade error tracking from the built-in `reportError` hook to a full service (e.g. Sentry): `npm install @sentry/react`, call `Sentry.init()`, then swap the body of `reportError` in `src/analytics.js` — every call site is already wired up
- Serve product images via a CDN or an image-optimization service (WebP/AVIF, responsive `srcset`)
- Set real production values in `index.html` (canonical URL, `og:image`) and `public/sitemap.xml` / `robots.txt` once you have a real domain
- Expand frontend test coverage beyond the two starter tests (checkout flow, cart math, auth forms are good next targets)
