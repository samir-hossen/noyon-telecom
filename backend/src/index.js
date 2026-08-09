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
