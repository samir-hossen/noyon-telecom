-- Admin-editable key/value store. First use: the flat delivery fee, which
-- used to be a hardcoded constant in orders.routes.js requiring a code
-- deploy to change.
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
