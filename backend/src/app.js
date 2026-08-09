import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { UPLOAD_DIR } from './utils/upload.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/products.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import orderRoutes from './routes/orders.routes.js';
import couponRoutes from './routes/coupons.routes.js';
import adminRoutes from './routes/admin.routes.js';
import contactRoutes from './routes/contact.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import sitemapRoutes from './routes/sitemap.routes.js';
import feedRoutes from './routes/feed.routes.js';
import quoteRoutes from './routes/quotes.routes.js';
import dealerRoutes from './routes/dealer.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Compresses JSON API responses (gzip/br per the client's Accept-Encoding).
// Placed early so it applies to every route's response. Uses compression's
// default filter, which already skips image/* content-types (via the
// `compressible` mime list) — Cloudinary-hosted images never touch this
// server at all, and locally-stored /uploads images are correctly left
// uncompressed rather than double-compressed. No streaming/file-download
// endpoints exist in this app to interfere with (admin exports return
// JSON; the .xlsx bulk import/export UI works client-side — see
// admin.routes.js).
app.use(compression());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser tools (curl, health checks) that send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// A 5,000-row bulk product import (see /api/admin/products/import) can
// legitimately exceed the site-wide 2mb JSON body cap below once rows carry
// real description text — that would fail as a confusing 413 before ever
// reaching the route's own "5000 rows max" validation. Express dedupes
// repeated body-parser middleware on the same request (it sets req._body
// after the first successful parse), so mounting a higher limit on just
// this path first, ahead of the general 2mb one, safely overrides it here
// without loosening the limit anywhere else.
app.use('/api/admin/products/import', express.json({ limit: '15mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));

// Generous global limit as a backstop; auth endpoints get a tighter one below
// since they're the most attractive target for brute-forcing.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// Checkout and payment-init are the other classic brute-force/abuse target
// (card testing via repeated SSLCommerz inits, coupon-code guessing, or
// just scripted order spam) — previously covered only by the generous
// global 600/15min limit, which is far too loose to actually stop that.
// Kept looser than authLimiter since a real shopper can plausibly retry a
// failed payment or fix a validation error several times in a row.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts. Please wait a few minutes and try again.' },
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
// Only /checkout itself needs the tighter limiter — /orders/mine and
// /orders/:id (order lookup) are normal read traffic and stay on the
// generous global limit above.
app.use('/api/orders/checkout', checkoutLimiter);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payment/sslcommerz/init', checkoutLimiter);
app.use('/api/payment', paymentRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/dealer', dealerRoutes);
app.use('/api/newsletter', newsletterRoutes);
// Sitemap/feed are also exposed under /api since that's this backend's only
// public prefix; see sitemap.routes.js and robots.txt for how these get
// surfaced at the storefront's actual root domain in production.
app.use('/api', sitemapRoutes);
app.use('/api', feedRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

export default app;
