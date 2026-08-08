import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import compression from 'compression';
import http from 'node:http';
import zlib from 'node:zlib';

// Mirrors the exact compression wiring in app.js — verified directly here
// rather than importing app.js itself, since app.js pulls in prismaClient.js
// (needs a live Prisma engine, unavailable in this sandbox — see the
// upload.test.js tests for the same constraint/pattern).
//
// Uses Node's raw http client (not supertest/superagent) for the byte-size
// assertions specifically, because superagent transparently auto-gunzips
// gzip responses before handing back `res.body`/`res.text` — which would
// silently make a compressed and uncompressed response look identical in
// a test, masking the exact thing being verified here.

function buildApp() {
  const app = express();
  app.use(compression());
  app.get('/big-json', (req, res) => {
    // A large, highly-repetitive JSON payload — representative of a
    // product-listing response and easily compressible, so a real size
    // reduction is observable.
    const products = Array.from({ length: 200 }, (_, i) => ({
      id: `p${i}`,
      name: 'Samsung Galaxy A54 OLED Display Assembly',
      desc: 'Wholesale replacement OLED display, tested and warrantied, compatible with multiple Samsung models.',
      category: 'Display',
      price: 1200,
    }));
    res.json({ products });
  });
  app.get('/image.png', (req, res) => {
    // A real PNG magic-byte buffer, served with an image content-type —
    // compression's default filter should leave this alone.
    res.set('Content-Type', 'image/png');
    res.send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(2000).fill(1)]));
  });
  return app;
}

// Makes a raw HTTP request and resolves with the response headers plus the
// exact bytes received on the wire (no decompression, no interpretation).
function rawGet(server, path, acceptEncoding) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'GET', headers: acceptEncoding ? { 'Accept-Encoding': acceptEncoding } : {} },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('backend response compression', async (t) => {
  const app = buildApp();
  const server = app.listen(0);
  t.after(() => server.close());

  await t.test('a JSON API response is gzip-compressed when the client accepts it', async () => {
    const res = await rawGet(server, '/big-json', 'gzip');
    assert.equal(res.headers['content-encoding'], 'gzip');
  });

  await t.test('compressed JSON response is meaningfully smaller than the uncompressed body, and gunzips back to the exact same JSON', async () => {
    const uncompressed = await rawGet(server, '/big-json', 'identity');
    const compressed = await rawGet(server, '/big-json', 'gzip');
    assert.equal(compressed.headers['content-encoding'], 'gzip');
    assert.ok(
      compressed.body.length < uncompressed.body.length * 0.5,
      `expected >50% reduction, got ${compressed.body.length}/${uncompressed.body.length}`
    );
    const roundTripped = JSON.parse(zlib.gunzipSync(compressed.body).toString());
    const original = JSON.parse(uncompressed.body.toString());
    assert.deepEqual(roundTripped, original);
  });

  await t.test('no client Accept-Encoding support means no compression is applied', async () => {
    const res = await rawGet(server, '/big-json', 'identity');
    assert.equal(res.headers['content-encoding'], undefined);
  });

  await t.test('an image response is not double-compressed (compression\'s default filter skips image/* content-types)', async () => {
    const res = await rawGet(server, '/image.png', 'gzip');
    assert.equal(res.headers['content-encoding'], undefined);
  });
});
