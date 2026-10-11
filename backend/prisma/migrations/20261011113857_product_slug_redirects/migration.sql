-- Old product URLs keep working after a slug change: /product/<old slug>
-- 301-redirects to the product's current slug.
-- (prisma migrate dev also generated DROP INDEX statements for the
-- hand-made search/category indexes — removed on purpose, see
-- 20261011074217_hidden_draft_price.)

-- CreateTable
CREATE TABLE "ProductSlugRedirect" (
    "slug" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSlugRedirect_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "ProductSlugRedirect_productId_idx" ON "ProductSlugRedirect"("productId");

-- AddForeignKey
ALTER TABLE "ProductSlugRedirect" ADD CONSTRAINT "ProductSlugRedirect_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
