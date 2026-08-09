-- Adds optional per-coupon usage limits and expiry. All three columns are
-- nullable with no default constraint beyond NULL, so every existing coupon
-- keeps behaving exactly as it did before this migration (unlimited uses,
-- never expires) until an admin explicitly sets a value — purely additive,
-- no existing behavior changes.
--
-- Previously a coupon code had no usage limit of any kind once created: the
-- same customer could apply it to every order they ever placed, and if the
-- code leaked/got shared beyond its intended audience there was no cap on
-- total redemptions either — only a manual active-flag kill switch, with no
-- graceful usage-based or time-based expiry.
ALTER TABLE "Coupon" ADD COLUMN "usageLimit" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN "usageLimitPerCustomer" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN "expiresAt" TIMESTAMP(3);
