-- Adds the draft/hidden flag used to keep not-yet-priced bulk-imported
-- products (e.g. a compatibility list imported before final prices are
-- set) out of the storefront until an admin publishes them.
-- DEFAULT true means every existing product stays visible immediately —
-- this is purely additive, no existing behavior changes.
ALTER TABLE "Product" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Product_published_idx" ON "Product"("published");
