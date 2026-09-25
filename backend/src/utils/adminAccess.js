// Temporary admin access. An admin account with `adminExpiresAt` set is a
// temporary admin: once that moment passes, the account is treated as a
// plain customer everywhere (API permission checks, /auth/me, the navbar's
// Admin link) without touching the stored role, so a permanent admin can
// see the expired account in Admin > Security and give it more time or
// remove it. `adminExpiresAt = null` is a normal, permanent admin.

// Upper bound for a single grant — this is meant for short, supervised
// sessions (a helper fixing prices for 20 minutes), not a substitute for a
// real account.
export const MAX_TEMP_ADMIN_MINUTES = 7 * 24 * 60;

export function isAdminAccessExpired(user, now = new Date()) {
  return Boolean(user && user.role === 'admin' && user.adminExpiresAt && new Date(user.adminExpiresAt) <= now);
}

export function isPermanentAdmin(user) {
  return Boolean(user && user.role === 'admin' && !user.adminExpiresAt);
}

// The user as every permission check should see them: an expired temporary
// admin comes back with role 'customer' (plus a flag so the admin login page
// can say why), everyone else unchanged.
export function withEffectiveRole(user, now = new Date()) {
  if (!isAdminAccessExpired(user, now)) return user;
  return { ...user, role: 'customer', adminAccessExpired: true };
}

// Parses the "how long" field from the Add admin / Extend forms.
// Returns null for a permanent admin, a Date for a temporary one, or
// undefined when the value is invalid.
export function expiryFromMinutes(value, now = new Date()) {
  if (value === null || value === undefined || value === '') return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TEMP_ADMIN_MINUTES) return undefined;
  return new Date(now.getTime() + minutes * 60 * 1000);
}
