# Noyon Telecom — Production Deployment & Operations Runbook

This document covers everything needed to take this codebase live, and how to run it
safely afterward. Items marked **[ACTION REQUIRED]** are things only you (or your
hosting provider) can do — they involve real infrastructure, accounts, or credentials
this codebase can't provision on its own.

---

## 1. Environment Variables

`backend/.env.example` is the source of truth — every variable is documented inline
with what it does and what happens if it's left blank. Before launch:

- [ ] **[ACTION REQUIRED]** Generate a real `JWT_SECRET` — never reuse the example value.
      `openssl rand -hex 32`
- [ ] **[ACTION REQUIRED]** Set `NODE_ENV=production`. This alone changes real behavior:
      cookies become `secure` + `sameSite=none` (required for cross-origin cookies over
      HTTPS) — see `backend/src/middleware/csrf.js` and `utils/jwt.js`.
- [ ] Set `CORS_ORIGIN`, `SITE_URL`, `FRONTEND_URL`, `API_URL` to your real production
      domains (not localhost).
- [ ] Confirm product prices in the database are real BDT amounts, not placeholder
      values — flagged directly in `frontend/src/utils/currency.js`.

## 2. Database Migrations

- [ ] **[ACTION REQUIRED]** Provision a managed Postgres instance (Neon, Supabase,
      RDS, or your host's managed Postgres — avoid self-managed Postgres unless you
      have someone who can patch/monitor it).
- [ ] Run `npx prisma migrate deploy` against production — **not** `migrate dev`,
      which is for local development only and can prompt for destructive resets.
      This now includes `prisma/migrations/20260802000000_product_search_trgm_index`,
      which speeds up product search (`name`/`desc`/`sku`/`brand` `contains` matching)
      from a full table scan to an index scan — needed once the catalog grows past a
      few thousand SKUs, harmless at any size. It deliberately does **not** use
      `CREATE INDEX CONCURRENTLY` (that was tried and removed — it can't run inside
      the transaction Prisma wraps each migration in, and broke a live `prisma
      migrate deploy` against Neon). The plain `CREATE INDEX` it uses instead briefly
      locks the `Product` table during the build — harmless run as part of initial
      setup before the store has real traffic, which is the only time `migrate
      deploy` runs this file. All four migrations (this one, the initial schema, the
      `published` flag, and the categories GIN index) apply cleanly via a single
      `prisma migrate deploy` — no manual `psql` step is required for any of them.
- [ ] **Connection pooling**, if your `DATABASE_URL` points at a provider with a low
      total connection cap (Neon's and Supabase's free/low tiers commonly cap total
      connections well below what a busy Node app plus a few admin sessions can use):
      add `?connection_limit=N` to `DATABASE_URL` (Prisma's own pooling knob), or use
      your provider's pooled connection string (e.g. Neon's "pooled" endpoint,
      Supabase's PgBouncer port) instead of the direct one. This backend already
      shares a single `PrismaClient` instance app-wide (see `src/prismaClient.js`) —
      that part needs no change; this step is purely about matching Prisma's pool
      size to what your specific provider actually allows. Not needed for local dev
      or a self-managed Postgres instance without a connection cap.

## 3. Backup Strategy — **[ACTION REQUIRED, infra-level]**

This app has an admin-panel JSON export/import (Admin → Backup & Restore) — that's a
convenience snapshot for admins, **not** a substitute for real database backups. Set up:

- [ ] Automated daily Postgres backups (most managed Postgres providers — Neon,
      Supabase, RDS — offer this as a checkbox in their dashboard; enable it).
- [ ] Point-in-time recovery (PITR) if your provider supports it — lets you restore to
      any minute in the last N days, not just the last nightly snapshot.
- [ ] Test a real restore at least once before launch. A backup you've never restored
      from is a hope, not a plan.

## 4. Disaster Recovery Plan — **[ACTION REQUIRED, decision-level]**

Document (and share with whoever else has admin access):
- Who has database credentials and how to reach them off-hours.
- Recovery Time Objective (how long can the site be down?) and Recovery Point
  Objective (how much data loss, worst case, is acceptable — this is set by your
  backup frequency above).
- Where Cloudinary-hosted product images live independently of your database (they
  survive a DB restore since they're not stored in Postgres).

## 5. Logging

Current state: structured where it matters (audit log table in Postgres for admin
actions — see `AuditLog` model), plain `console.error`/`console.log` elsewhere. This is
fine as-is: virtually every hosting platform (Railway, Render, Fly, Heroku) captures
stdout/stderr automatically and makes it searchable. Nothing to add unless you later
want log aggregation across multiple servers, which isn't a today problem.

## 6. Monitoring & Error Tracking — **[ACTION REQUIRED — just needs your account/DSN]**

Sentry wiring is now in place on both sides (`backend/src/utils/errorTracking.js` +
`frontend/src/analytics.js`), including backend `uncaughtException`/`unhandledRejection`
capture — it's inactive purely because no DSN is set. Before launch, pick one:
- **Uptime**: a free tier of UptimeRobot or Better Uptime pinging `GET /health` every
  few minutes, alerting you by SMS/email/Slack.
- **Error tracking**: create a free Sentry account, run `npm install @sentry/node` in
  `backend/`, and set `SENTRY_DSN` in `backend/.env` (and `VITE_SENTRY_DSN` in
  `frontend/.env` for the browser side) — no code changes needed, both sides start
  reporting automatically.

## 7. Cloudinary Configuration — **[ACTION REQUIRED]**

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` before
launch. Without these, product images save to local disk, which most hosting
platforms wipe on every redeploy — you'd lose every product photo the next time you
ship a code change. (`backend/src/utils/upload.js` already has the Cloudinary
integration built and ready — it's inactive purely because these three vars are blank.)

## 8. Email Configuration — **[ACTION REQUIRED]**

Set `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`. Without these, verification and
password-reset emails are only logged to the server console, not actually sent —
fine for local dev, breaks real account verification in production. Any standard
transactional provider (SES, Postmark, Resend, SendGrid) works with `mailer.js` as-is.

## 9. Payment Gateway Configuration — **[ACTION REQUIRED]**

- [ ] Register a live SSLCommerz store (the current sandbox credentials, if any, only
      simulate payments).
- [ ] Set `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_IS_LIVE=true`.
- [ ] Register your production IPN URL (`https://yourdomain.com/api/payment/sslcommerz/ipn`)
      in the SSLCommerz merchant dashboard — this is the server-to-server callback that's
      the actual source of truth for "did the money arrive" (see `payment.routes.js`).
- [ ] Run one real low-value transaction end-to-end before opening to customers.

## 10. Production Security Headers

Already handled by `helmet()` in `backend/src/app.js` — this includes HSTS,
`X-Content-Type-Options`, `X-Frame-Options`, and a default CSP, out of the box, with
no extra configuration needed. CORS is origin-allowlisted, not wide open. Nothing to
add here.

## 11. SSL / HTTPS — **[ACTION REQUIRED, infra-level]**

Terminate TLS at your hosting platform or reverse proxy (Railway/Render/Vercel/Fly all
do this automatically for you on their own domains and custom domains alike; if
self-hosting behind Nginx, use Let's Encrypt via Certbot). The app itself doesn't
terminate TLS — `app.set('trust proxy', 1)` is already set so it correctly reads the
real client IP and protocol from your proxy's headers.

## 12. Deployment Process — **[ACTION REQUIRED, decision-level]**

CI is now set up: `.github/workflows/ci.yml` runs both test suites (backend + frontend)
and a production frontend build on every push/PR to `main`, against a real Postgres
service container — so a broken commit gets caught before anyone deploys it by hand.
Deployment itself is still a decision only you can make:
1. Push to a `main` branch — CI above runs automatically.
2. Add a deploy step to the workflow (or your host's own Git integration) that runs
   `npx prisma migrate deploy` against your real database, then deploys backend +
   frontend.
3. Pick and set up a host: Railway/Render are the simplest for this stack (Node
   backend + static frontend + managed Postgres, minimal config). This wasn't set up
   automatically since it requires an account and a decision on which platform.

## 13. Rollback Plan

- Keep deploys as discrete, tagged releases (git tags or your platform's built-in
  deploy history) so you can redeploy the previous version in one click/command.
- Database migrations should stay additive/backward-compatible where possible
  (add columns as nullable, don't drop columns in the same release that stops using
  them) so a code rollback doesn't get stranded on an incompatible schema.

---

## Post-Launch Monitoring Checklist

- [ ] `/health` endpoint responding (wire into your uptime monitor)
- [ ] First real order completes successfully (both COD and online payment)
- [ ] First dealer registration → admin approval flow completes
- [ ] Low-stock email alert actually arrives (trigger one manually by dropping a
      test product's stock below its threshold)
- [ ] Error tracking is receiving events (trigger one deliberately, confirm it shows up)

## Maintenance Recommendations — Next 12 Months

- **Quarterly**: review the admin audit log for anything unexpected; rotate `JWT_SECRET`
  if you ever suspect it's been exposed (this invalidates all sessions, so plan for it).
- **When the catalog crosses ~5,000 products**: add the trigram search index (Section 2).
- **When you have real order volume**: revisit the 14-day analytics window and top-5
  products query — both already query-efficient, but worth confirming query plans
  (`EXPLAIN ANALYZE`) are still using indexes as data grows.
- **Ongoing**: keep `npm audit` clean on both frontend and backend; Prisma, Express, and
  the auth-related packages (`jsonwebtoken`, `bcryptjs`, `speakeasy`) are the ones worth
  updating promptly when security patches land.
