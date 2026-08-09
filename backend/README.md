# Noyon Telecom — Backend API

Express + PostgreSQL (Prisma) REST API for the Noyon Telecom storefront frontend.
Implements everything the frontend expects: cookie-based auth with CSRF
protection, email verification, password reset, TOTP 2FA, product catalog
with reviews, server-side cart & wishlist, guest + authenticated checkout,
coupons, and an admin dashboard (products/orders/coupons/audit log).

## 1. Prerequisites

- Node.js 20+
- A PostgreSQL database — any of these work fine:
  - Local Postgres (`brew install postgresql` / `apt install postgresql`)
  - A free managed instance: [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)

## 2. Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — a long random string (`openssl rand -hex 32`)
- Leave `SMTP_HOST` empty for local dev — emails print to the console instead
  of actually sending, so you can copy verification/reset links from the terminal.

## 3. Create the database schema

```bash
npx prisma migrate dev --name init
```

This creates all tables (users, products, orders, coupons, etc.) in your database.

## 4. Seed sample data

```bash
npm run seed
```

Creates an admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from
`.env`, defaults to `admin@noyontelecom.com` / `ChangeMe123` — **change this
password after your first login**) and six sample products so the storefront
isn't empty.

## 5. Run it

```bash
npm run dev      # auto-restarts on file changes
# or
npm start
```

The API listens on `http://localhost:4000` by default. The frontend's Vite
dev server already proxies `/api` and `/uploads` there (see
`frontend/vite.config.js`), so running both side by side just works:

```bash
# terminal 1
cd backend && npm run dev
# terminal 2
cd frontend && npm run dev
```

Then open `http://localhost:5173`, sign in at `/admin-login` with the seeded
admin account, and you'll land on `/admin`.

## Security notes

- Sessions are a JWT in an **httpOnly cookie** — unreadable to any client-side
  JS, so an XSS bug can't steal it.
- All mutating requests require a matching **CSRF token** (double-submit
  cookie pattern) — see `src/middleware/csrf.js`.
- Passwords are hashed with **bcrypt** (12 rounds); reset/verification tokens
  are stored as **SHA-256 hashes**, never in plaintext.
- Optional **TOTP 2FA** for admin accounts (`speakeasy` + QR code via `qrcode`).
- **Rate limiting** on all routes, with a tighter limit on `/api/auth/*`.
- **Helmet** for standard security headers; CORS locked to `CORS_ORIGIN`.
- Coupon discounts, order totals, and stock checks are all computed and
  enforced **server-side** — the client never gets to dictate a price.

## What's still missing for a real launch

- **Real email delivery**: configure `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` (e.g.
  via SendGrid, Postmark, Amazon SES) — right now, with no SMTP configured,
  emails just get logged to the console instead of delivered.
- **Cloudinary credentials**: product image uploads use Cloudinary when
  `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` are
  set (see `.env.example`); without them, images fall back to local disk,
  which most hosting platforms wipe on every redeploy.
- **SSLCommerz live credentials**: payment (`backend/src/routes/payment.routes.js`)
  is fully wired to SSLCommerz (bKash/Nagad/Rocket/cards) but runs in sandbox
  mode until real `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASSWORD` and
  `SSLCOMMERZ_IS_LIVE=true` are set.
- **SMS gateway credentials**: order-placed and order-status SMS
  (`backend/src/utils/sms.js`) are wired for BulkSMSBD but need real
  `SMS_API_KEY`/`SMS_SENDER_ID` (see `.env.example`) — without them, the SMS
  text is just logged to the console instead of sent.
- **Courier integration (Pathao/Steadfast/RedX)** — not built yet. Right
  now, marking an order "shipped" in the admin panel doesn't create a
  courier consignment or attach a real tracking ID/link — that's still a
  manual step.
- **Automated tests** — `npm test` runs 48 unit tests (Node's built-in test
  runner, no extra dependency) covering the pricing/discount math, JWT and
  CSRF token handling, and TOTP 2FA verification — the logic where a silent
  bug is most expensive (wrong prices, forged auth). Route-level integration
  tests (hitting the Express app + a real/test database) don't exist yet —
  add those next, e.g. with `supertest` against a disposable test DB, before
  scaling past the current manual QA.
