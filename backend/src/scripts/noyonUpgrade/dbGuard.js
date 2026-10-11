// Safety checks shared by the noyonUpgrade scripts.

export function databaseHost(url = process.env.DATABASE_URL || '') {
  const m = url.match(/^[a-z+]+:\/\/(?:[^@/]*@)?([^:/?]+)/i);
  return m ? m[1].toLowerCase() : '';
}

export function isLocalDatabase(url) {
  return ['localhost', '127.0.0.1', '::1'].includes(databaseHost(url));
}

// For tools that only make sense on a local test copy (e.g. loading a
// snapshot into an empty database).
export function assertLocalDatabase() {
  if (!isLocalDatabase()) {
    throw new Error(`Refusing to run: DATABASE_URL points at "${databaseHost() || 'nothing'}", not localhost.`);
  }
}
