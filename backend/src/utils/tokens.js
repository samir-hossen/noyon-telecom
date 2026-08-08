import crypto from 'crypto';

// We only ever store the *hash* of these tokens in the DB — if the database
// ever leaked, the raw tokens (the only thing usable to verify/reset) still
// wouldn't be recoverable from it.
export function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
