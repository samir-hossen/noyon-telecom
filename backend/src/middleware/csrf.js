import crypto from 'crypto';

const CSRF_COOKIE = 'csrf_token';
const isProd = () => process.env.NODE_ENV === 'production';

// Double-submit cookie CSRF protection:
// - The cookie is readable by JS (not httpOnly) so the frontend can only
//   forge a matching header if it's running on our own origin — a
//   cross-site page has no way to read the cookie's value to copy it.
// - GET /auth/csrf also returns the value in the JSON body for convenience,
//   but the cookie is the actual source of truth checked on the server.
export function issueCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProd(),
      sameSite: isProd() ? 'none' : 'lax',
      path: '/',
    });
  }
  return token;
}

export function requireCsrf(req, res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}

export { CSRF_COOKIE };
