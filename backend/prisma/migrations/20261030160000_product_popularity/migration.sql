ALTER TABLE "Product" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Product_viewCount_readyToSell_createdAt_idx" ON "Product"("viewCount", "readyToSell", "createdAt");
CREATE TABLE "ProductView" (
  "productId" TEXT NOT NULL,
  "visitorKey" TEXT NOT NULL,
  "day" DATE NOT NULL,
  CONSTRAINT "ProductView_pkey" PRIMARY KEY ("productId", "visitorKey", "day"),
  CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProductView_day_idx" ON "ProductView"("day");
