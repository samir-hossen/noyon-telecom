-- Hidden draft price (owner's policy, Oct 2026): customers see a price only
-- once priceStatus = 'published'. Every existing product starts as 'draft',
-- so all current prices are hidden after this deploy until the owner
-- publishes them from the admin panel.
--
-- NOTE: `prisma migrate dev` also generated DROP INDEX statements for
-- idx_product_search_trgm and idx_product_categories_gin (they're created by
-- hand-written migrations, so Prisma doesn't know about them). Those drops
-- were removed on purpose — search and category filtering depend on them.

-- CreateEnum
CREATE TYPE "PriceStatus" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "draftPrice" DOUBLE PRECISION,
ADD COLUMN     "priceNote" TEXT,
ADD COLUMN     "priceStatus" "PriceStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "referencePrice" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Product_priceStatus_idx" ON "Product"("priceStatus");
