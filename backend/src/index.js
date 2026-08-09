import 'dotenv/config';
import { initErrorTracking } from './utils/errorTracking.js';

// Initialized before importing app.js so uncaughtException/unhandledRejection
// listeners (registered inside initErrorTracking) are in place before any
// route code runs. No-op if SENTRY_DSN isn't set.
await initErrorTracking();

// Fail fast and loud on a missing JWT_SECRET, rather than starting up
// looking perfectly healthy (homepage loads, health check passes) and only
// failing — with a much less obvious "secretOrPrivateKey must have a
// value" error — the moment someone actually tries to log in or register.
// jsonwebtoken doesn't validate this until the first sign()/verify() call,
// so without this check a forgotten env var during deployment would
// surface as a confusing 500 on the login page instead of a clear failure
// right here at boot.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. See backend/.env.example — sessions cannot be issued or verified without it.');
  process.exit(1);
}

const { default: app } = await import('./app.js');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Noyon Telecom API listening on http://localhost:${PORT}`);
});

// One-off data fix, run at boot rather than via a separate Shell/job command
// (Render's free tier has no Shell access) — clears the old hotlinked
// Unsplash placeholder image, which now 404s, from any product still using
// it. Self-limiting: matches zero rows once already applied, so it's safe
// to leave running on every future boot too.
import('./fixBrokenPlaceholderImages.js')
  .then(({ fixBrokenPlaceholderImages }) => fixBrokenPlaceholderImages())
  .then((fixed) => {
    if (fixed > 0) console.log(`Boot: cleared broken Unsplash placeholder from ${fixed} product(s).`);
  })
  .catch((err) => console.error('Boot: fixBrokenPlaceholderImages failed (non-fatal):', err.message));
