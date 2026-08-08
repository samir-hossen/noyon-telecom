import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Cloudinary is optional. If CLOUDINARY_* env vars are set, uploaded
// product images are stored on Cloudinary's CDN (fast, optimized,
// survives redeploys). If not set, images fall back to the local
// `uploads/` folder — fine for local dev, but note that on most hosting
// platforms (Railway, Render, Heroku, etc.) local disk storage is wiped
// on every redeploy, so set CLOUDINARY_* before going live.
const CLOUDINARY_ENABLED = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) return cb(new Error('Only PNG, JPEG, or WebP images are allowed'));
  cb(null, true);
}

// When Cloudinary is enabled, keep the file in memory (we stream the
// buffer straight to Cloudinary, never touching local disk). Otherwise
// fall back to the old disk storage behavior.
const storage = CLOUDINARY_ENABLED
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    });

export const upload = multer({
  storage,
  fileFilter,
  // fileSize/files: unchanged from before the multer 1.x -> 2.x upgrade.
  // fieldNestingDepth is new in 2.x — explicitly recommended by multer's
  // own security docs as a defense-in-depth measure against
  // CVE-2026-5079 (a DoS via deeply-nested `a[b][c]`-style field names in
  // multipart form data). Every caller of `upload` in this codebase only
  // ever sends plain file fields (`image`/`images`, see frontend/src/api.js
  // upload()/uploadMultiple()) — no bracket-notation fields are ever
  // legitimately needed here, so 0 is the correct, non-breaking value.
  limits: { fileSize: 5 * 1024 * 1024, files: 8, fieldNestingDepth: 0 },
});

// Given a multer file object, returns the public URL to store on the
// product (a full Cloudinary CDN URL, or a local /uploads/... path).
// Cloudinary uploads also get automatic format/quality optimization
// (f_auto,q_auto) so product photos load fast without any manual resizing.
export function storeUploadedFile(file) {
  if (!CLOUDINARY_ENABLED) {
    return Promise.resolve(`/uploads/${file.filename}`);
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'noyontelecom-products', resource_type: 'image', transformation: [{ fetch_format: 'auto', quality: 'auto' }] },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(file.buffer);
  });
}

export { UPLOAD_DIR, CLOUDINARY_ENABLED };

// Deletes a previously-stored image (given its stored URL) from wherever
// it actually lives — Cloudinary or local disk. Used when a product's
// images are replaced or the product is deleted, so storage doesn't
// silently fill up with orphaned files over time. Failures are logged but
// never thrown — a missing/already-deleted image shouldn't break the
// product update/delete request itself.
export async function deleteStoredImage(url) {
  if (!url) return;
  try {
    if (CLOUDINARY_ENABLED && url.includes('res.cloudinary.com')) {
      const match = url.match(/\/noyontelecom-products\/([^./]+)\./);
      if (match) await cloudinary.uploader.destroy(`noyontelecom-products/${match[1]}`);
    } else if (url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOAD_DIR, path.basename(url));
      await fs.promises.unlink(filePath).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to delete stored image:', url, err.message);
  }
}
