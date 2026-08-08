import 'dotenv/config';
import { initErrorTracking } from './utils/errorTracking.js';

// Initialized before importing app.js so uncaughtException/unhandledRejection
// listeners (registered inside initErrorTracking) are in place before any
// route code runs. No-op if SENTRY_DSN isn't set.
await initErrorTracking();

const { default: app } = await import('./app.js');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Noyon Telecom API listening on http://localhost:${PORT}`);
});
