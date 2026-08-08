// Single source of truth for how money is displayed across the site.
// SSLCommerz (backend/src/utils/sslcommerz.js) settles payments in BDT, so
// the frontend must show the same currency the customer is actually
// charged — otherwise "$19.99" on the product page becoming "৳19.99" at
// checkout would look like a bug (or a bait-and-switch).
//
// Note: this only changes the *symbol/formatting*, not the underlying
// numbers in the database/seed data. If your product prices were entered
// as USD amounts, update them to real BDT amounts (in the admin panel or
// the Prisma seed) before going live — swapping the symbol alone doesn't
// convert the currency.
export function formatPrice(amount) {
  const n = Number(amount) || 0;
  return `৳${Math.round(n).toLocaleString('en-BD')}`;
}
