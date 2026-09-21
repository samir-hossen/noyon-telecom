-- AlterTable
ALTER TABLE "Product" ADD COLUMN "readyToSell" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_readyToSell_idx" ON "Product"("readyToSell");
