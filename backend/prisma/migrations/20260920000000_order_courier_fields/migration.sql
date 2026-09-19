-- Steadfast Courier integration: track the consignment created when an
-- order ships, and the courier's own delivery status (kept separate from
-- Order.status — see schema.prisma).
ALTER TABLE "Order" ADD COLUMN "courierConsignmentId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "courierTrackingCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "courierStatus" TEXT;

CREATE INDEX "Order_courierConsignmentId_idx" ON "Order"("courierConsignmentId");
