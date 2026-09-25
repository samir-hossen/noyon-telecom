import prisma from '../prismaClient.js';
import { verifyAuthToken, COOKIE_NAME } from '../utils/jwt.js';
import { withEffectiveRole, isPermanentAdmin } from '../utils/adminAccess.js';

async function loadUserFromRequest(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  // A temporary admin whose time is up is loaded as a customer, so every
  // role check downstream (requireAdmin, order access, draft products, the
  // frontend's /auth/me) loses admin rights at once, even mid-session.
  return user && withEffectiveRole(user);
}

export async function optionalAuth(req, res, next) {
  req.user = await loadUserFromRequest(req);
  next();
}

export async function requireAuth(req, res, next) {
  const user = await loadUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'You must be authenticated to do that' });
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Managing admin accounts (adding, extending, removing) is reserved for
// permanent admins, so a temporary admin can't grant themselves a lasting
// account or lock the owner out. Use after requireAdmin.
export function requirePermanentAdmin(req, res, next) {
  if (!isPermanentAdmin(req.user)) {
    return res.status(403).json({ error: 'Only a permanent admin can manage admin accounts.' });
  }
  next();
}

// Strips the fields we never want to send to the client.
export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    adminExpiresAt: user.role === 'admin' ? user.adminExpiresAt ?? null : null,
    adminAccessExpired: Boolean(user.adminAccessExpired),
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    twoFAEnabled: user.twoFAEnabled,
    businessName: user.businessName ?? null,
    phone: user.phone ?? null,
    address: user.address ?? null,
    dealerStatus: user.dealerStatus ?? null,
    dealerDiscountPercent: user.dealerDiscountPercent ?? 0,
    tradeLicenseUrl: user.tradeLicenseUrl ?? null,
    dealerVerifiedAt: user.dealerVerifiedAt ?? null,
  };
}
