-- Quality options (owner, 11 Oct 2026): one product, several grades with
-- their own price. Written by hand: `prisma migrate dev` would also drop the
-- hand-made idx_product_search_trgm / idx_product_categories_gin indexes.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "qualityOptions" JSONB NOT NULL DEFAULT '[]';
