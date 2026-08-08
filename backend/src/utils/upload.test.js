import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { upload, storeUploadedFile, UPLOAD_DIR } from './upload.js';
import { errorHandler } from '../middleware/errorHandler.js';

// These tests exercise the actual exported `upload` middleware (the same
// object every route in the app uses — admin single/multi image upload,
// customer review-image upload, dealer trade-license upload) end-to-end
// over real HTTP, wired to the app's real errorHandler.js. This is what
// changed in the multer 1.x -> 2.x security upgrade: whether a malformed
// or oversized request reaches errorHandler.js as a normal 400 response,
// or crashes the process as an uncaught exception (CVE-2025-47944 /
// CVE-2025-7338). Auth/CSRF/role checks are each route's own concern and
// are exercised separately in each route's existing tests — these tests
// verify the shared multer layer beneath all four routes.

// Minimal test apps mirroring each real route's multer wiring exactly
// (fieldname, .single vs .array, maxCount) — see admin.routes.js,
// products.routes.js, and dealer.routes.js for the production routes this
// mirrors.
function buildApp(handler) {
  const app = express();
  app.post('/single', upload.single('image'), handler);
  app.post('/array4', upload.array('images', 4), handler); // matches /reviews/upload-images
  app.post('/array8', upload.array('images', 8), handler); // matches /admin/upload-multiple
  app.use(errorHandler);
  return app;
}

const okHandler = (req, res) => {
  if (req.file) return res.json({ ok: true, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
  if (req.files) return res.json({ ok: true, count: req.files.length });
  res.status(400).json({ error: 'No file uploaded' });
};

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // valid PNG magic bytes
function pngBuffer(sizeBytes = 1024) {
  return Buffer.concat([PNG_HEADER, Buffer.alloc(Math.max(0, sizeBytes - PNG_HEADER.length), 1)]);
}

// Clean up anything actually written to disk during these tests (no
// Cloudinary env vars are set in the test environment, so `upload` falls
// back to real diskStorage under UPLOAD_DIR — same as local dev without
// Cloudinary configured).
function cleanupUploadDir() {
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (f !== '.gitkeep') fs.unlinkSync(path.join(UPLOAD_DIR, f));
  }
}
test.after(cleanupUploadDir);

test('upload middleware — happy paths', async (t) => {
  const app = buildApp(okHandler);

  await t.test('admin single-image upload (mirrors POST /api/admin/upload)', async () => {
    const res = await request(app).post('/single').attach('image', pngBuffer(2048), { filename: 'photo.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.mimetype, 'image/png');
    assert.equal(res.body.size, 2048);
  });

  await t.test('customer review-image upload, multiple files (mirrors POST /api/products/reviews/upload-images)', async () => {
    const res = await request(app)
      .post('/array4')
      .attach('images', pngBuffer(1024), { filename: 'a.png', contentType: 'image/png' })
      .attach('images', pngBuffer(1024), { filename: 'b.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 2);
  });

  await t.test('admin multi-image upload accepts webp (mirrors POST /api/admin/upload-multiple)', async () => {
    const res = await request(app).post('/array8').attach('images', pngBuffer(512), { filename: 'c.webp', contentType: 'image/webp' });
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 1);
  });

  await t.test('dealer trade-license upload (mirrors POST /api/dealer/trade-license, same upload.single config)', async () => {
    const res = await request(app).post('/single').attach('image', pngBuffer(1024), { filename: 'license.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});

test('upload middleware — file-type validation still works', async (t) => {
  const app = buildApp(okHandler);

  // Note: fileFilter() in upload.js rejects with a plain `new Error(...)`,
  // not a `multer.MulterError` — so it doesn't hit errorHandler.js's
  // `err.name === 'MulterError'` branch and falls through to a generic 500
  // ("Something went wrong..."), not a 400 with the specific message. This
  // is pre-existing behavior, unchanged by the multer 1.x -> 2.x upgrade —
  // confirmed identical against multer 1.x directly. Out of scope to
  // change here (not required for multer compatibility); these tests
  // document the actual, unchanged behavior rather than assert a
  // different one.
  await t.test('rejects a disallowed MIME type — still rejected (500, unchanged pre-existing app behavior), not a crash', async () => {
    const res = await request(app)
      .post('/single')
      .attach('image', Buffer.from('#!/bin/sh\necho hi'), { filename: 'script.sh', contentType: 'application/x-sh' });
    assert.equal(res.status, 500);
  });

  await t.test('rejects a PDF disguised with an image filename by real content-type — still rejected, not a crash', async () => {
    const res = await request(app)
      .post('/single')
      .attach('image', Buffer.from('%PDF-1.4 fake'), { filename: 'notreally.png', contentType: 'application/pdf' });
    assert.equal(res.status, 500);
  });
});

test('upload middleware — file-size limit still enforced (5MB)', async (t) => {
  const app = buildApp(okHandler);

  await t.test('an oversized file is rejected with LIMIT_FILE_SIZE as a normal 400, not a crash', async () => {
    const oversized = pngBuffer(5 * 1024 * 1024 + 1);
    const res = await request(app).post('/single').attach('image', oversized, { filename: 'huge.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /file too large/i);
  });

  await t.test('a file safely under the limit still succeeds', async () => {
    const underLimit = pngBuffer(5 * 1024 * 1024 - 1024); // comfortably under 5MB, avoids busboy's exact-boundary edge behavior
    const res = await request(app).post('/single').attach('image', underLimit, { filename: 'exact.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
  });
});

test('upload middleware — file count limits still enforced', async (t) => {
  const app = buildApp(okHandler);

  await t.test('exceeding the per-route maxCount (4 for review images) is rejected gracefully', async () => {
    let req = request(app).post('/array4');
    for (let i = 0; i < 5; i++) {
      req = req.attach('images', pngBuffer(100), { filename: `img${i}.png`, contentType: 'image/png' });
    }
    const res = await req;
    assert.equal(res.status, 400);
    assert.match(res.body.error, /unexpected field/i);
  });
});

test('upload middleware — malformed/malicious requests do not crash the server (the CVEs this upgrade fixes)', async (t) => {
  const app = buildApp(okHandler);

  await t.test('a request with a broken multipart boundary is rejected with an error response, not an uncaught exception', async () => {
    // Deliberately malformed multipart body: declares a boundary in the
    // Content-Type header that never actually appears in the body. This is
    // the exact shape of request that crashed the process on multer
    // versions before 2.0.2 (CVE-2025-7338 / CVE-2025-47944).
    const res = await request(app)
      .post('/single')
      .set('Content-Type', 'multipart/form-data; boundary=----doesNotMatchBody')
      .send('------actualBoundary\r\nnot a valid multipart body at all\r\n------actualBoundary--');
    // The important assertion is simply that the server responded at all
    // (any 4xx/5xx) instead of the connection dying / process crashing.
    assert.ok(res.status >= 400 && res.status < 600, `expected an error response, got status ${res.status}`);
  });

  await t.test('server is still alive and serving normal requests after the malformed request above', async () => {
    const res = await request(app).post('/single').attach('image', pngBuffer(1024), { filename: 'ok.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
  });

  await t.test('deeply nested bracket-notation field names are rejected (CVE-2026-5079 hardening via fieldNestingDepth: 0)', async () => {
    const res = await request(app)
      .post('/single')
      .field('a[b][c][d]', 'nested value')
      .attach('image', pngBuffer(100), { filename: 'ok.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
  });
});

test('upload middleware — memory-storage buffer contract (what the Cloudinary upload path relies on)', async (t) => {
  await t.test('req.file.buffer is a real Buffer under memoryStorage, same contract storeUploadedFile() expects', async () => {
    // storeUploadedFile() branches on CLOUDINARY_ENABLED and, when true,
    // streams `file.buffer` straight to Cloudinary (see upload.js). No
    // Cloudinary credentials exist in this test environment, so this
    // verifies the underlying multer contract directly instead: with
    // multer.memoryStorage(), `file.buffer` must be a Buffer containing
    // the full upload — unchanged from 1.x per multer's own docs, and the
    // exact assumption storeUploadedFile()'s Cloudinary branch depends on.
    const multer = (await import('multer')).default;
    const memApp = express();
    const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
    memApp.post('/mem', memUpload.single('image'), (req, res) => {
      res.json({ isBuffer: Buffer.isBuffer(req.file.buffer), length: req.file.buffer.length });
    });
    const body = pngBuffer(777);
    const res = await request(memApp).post('/mem').attach('image', body, { filename: 'x.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.equal(res.body.isBuffer, true);
    assert.equal(res.body.length, 777);
  });
});

test('storeUploadedFile — local disk fallback path (Cloudinary not configured in this test env)', async (t) => {
  await t.test('resolves to a /uploads/<filename> URL and the file actually exists on disk', async () => {
    const app = buildApp(async (req, res, next) => {
      try {
        const url = await storeUploadedFile(req.file);
        res.json({ url });
      } catch (err) {
        next(err);
      }
    });
    const res = await request(app).post('/single').attach('image', pngBuffer(500), { filename: 'stored.png', contentType: 'image/png' });
    assert.equal(res.status, 200);
    assert.match(res.body.url, /^\/uploads\/.+\.png$/);
    const diskPath = path.join(UPLOAD_DIR, path.basename(res.body.url));
    assert.equal(fs.existsSync(diskPath), true);
  });
});
