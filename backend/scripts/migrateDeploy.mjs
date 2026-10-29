/**
 * Production-safe Prisma migration runner.
 * Uses a direct Neon connection for migrations, allows idle Neon computes to
 * wake up, and retries only a transient database reachability error (P1001).
 * Never resets schemas, seeds data, or modifies migration SQL.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const RETRY_DELAYS_MS = [3000, 7000, 15000, 25000];

export function getMigrationUrl(env = process.env) {
  const connectionString = env.DIRECT_URL || env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL (or DIRECT_URL / DATABASE_URL_UNPOOLED).');

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('The database connection URL is invalid. Verify the URL in Render Environment.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Expected a PostgreSQL connection URL.');
  }

  // Neon uses *-pooler for application traffic. Prisma migrations need a
  // direct connection. Derive it only for Neon when no direct URL was supplied.
  if (!env.DIRECT_URL && !env.DATABASE_URL_UNPOOLED &&
      url.hostname.endsWith('.neon.tech')) {
    url.hostname = url.hostname.replace(/-pooler(?=\.)/, '');
  }

  if (url.hostname.endsWith('.neon.tech')) {
    if (!url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'require');
    if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '20');
  }
  return url.toString();
}

function runMigration(env) {
  return new Promise((done, reject) => {
    // npm install runs before this command in Render's build phase.
    const prismaCLI = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
    const child = spawn(process.execPath, [prismaCLI, 'migrate', 'deploy'], {
      env, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', chunk => {
        const string = chunk.toString();
        output = (output + string).slice(-20000);
        (stream === child.stdout ? process.stdout : process.stderr).write(chunk);
      });
    }
    child.on('error', reject);
    child.on('close', code => done({ code, output }));
  });
}

export async function main(env = process.env) {
  const migrationUrl = getMigrationUrl(env);
  const url = new URL(migrationUrl);
  console.log(`Prisma migration target: ${url.hostname} (credentials hidden)`);
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const { code, output } = await runMigration({ ...env, DATABASE_URL: migrationUrl });
    if (code === 0) return;
    if (!/\bP1001\b/.test(output) || attempt === RETRY_DELAYS_MS.length) {
      throw new Error(`Prisma migration failed with exit code ${code}; see logs above.`);
    }
    const wait = RETRY_DELAYS_MS[attempt];
    console.warn(`Neon connection unavailable (P1001). Retrying migration in ${wait / 1000}s (${attempt + 2}/${RETRY_DELAYS_MS.length + 1})...`);
    await new Promise(r => setTimeout(r, wait));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
