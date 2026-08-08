import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'token';

// Converts a jsonwebtoken-style "expiresIn" value (e.g. "7d", "12h", 3600)
// into milliseconds for the cookie's maxAge, so the cookie never outlives
// (or expires well before) the JWT it stores. Falls back to 7 days if the
// value can't be parsed.
export function expiresInToMs(expiresIn) {
  const DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;
  if (!expiresIn) return DEFAULT_MS;
  if (typeof expiresIn === 'number') return expiresIn * 1000;
  const match = /^(\d+)\s*(ms|s|m|h|d|w|y)?$/i.exec(String(expiresIn).trim());
  if (!match) return DEFAULT_MS;
  const value = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const unitMs = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, y: 31536000000 };
  return value * (unitMs[unit] ?? 1000);
}
const AUTH_COOKIE_MAX_AGE = expiresInToMs(process.env.JWT_EXPIRES_IN || '7d');

export function signAuthToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

const isProd = () => process.env.NODE_ENV === 'production';

// httpOnly means client-side JS (and therefore an XSS bug) can never read
// this cookie — the browser just sends it automatically on same-site requests.
export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    path: '/',
  });
}

export { COOKIE_NAME };
