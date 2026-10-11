-- Model hub pages (/model/<slug>) + indexes for a catalog of ~18,000 products.
-- (prisma migrate dev also generated DROP INDEX statements for the
-- hand-made search/category indexes — removed on purpose, see
-- 20261011074217_hidden_draft_price.)

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "modelSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Product_modelSlugs_idx" ON "Product" USING GIN ("modelSlugs");

-- CreateIndex
CREATE INDEX "Product_readyToSell_createdAt_idx" ON "Product"("readyToSell", "createdAt");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
