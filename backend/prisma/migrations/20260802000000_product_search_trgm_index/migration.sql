-- Speeds up product search (name/desc/sku/brand `contains` matching in
-- products.routes.js) from a full table scan to an index scan once the
-- catalog grows past a few thousand SKUs. IF NOT EXISTS makes this
-- migration safe to re-run.
--
-- Previously this was only documented in DEPLOYMENT.md as a manual,
-- run-it-yourself step. It's promoted to a real migration file here so it
-- ships with `npx prisma migrate deploy` like every other schema change,
-- instead of being a step someone has to remember to do by hand later.
--
-- Not using CONCURRENTLY: Prisma wraps each migration in a transaction,
-- and CONCURRENTLY can't run inside one (confirmed against a live Neon
-- deploy — `prisma migrate deploy` failed with "CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction block" until this was removed). A plain
-- CREATE INDEX briefly locks the table during the build, which only
-- matters on a table that already has heavy write traffic — harmless here
-- since this runs as part of initial setup before the store has real
-- traffic. If you ever need to add a similar index to an already-live,
-- high-traffic table later, run CONCURRENTLY by hand via `psql` instead of
-- through a migration.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_product_search_trgm
  ON "Product" USING gin (
    name gin_trgm_ops,
    "desc" gin_trgm_ops,
    sku gin_trgm_ops,
    brand gin_trgm_ops
  );
