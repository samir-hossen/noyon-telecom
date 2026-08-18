# Product-page link previews for WhatsApp/Facebook (optional)

## The problem this fixes

The storefront is a client-rendered React SPA (Vite) on static hosting
(Render static site) — there's no server that can render per-product HTML.
Googlebot renders JavaScript fine, so search indexing isn't affected. But
link-preview bots (WhatsApp, Facebook, Twitter/X, Slack, Telegram...) fetch
the raw HTML and never run JS. Right now, sharing a product link on
WhatsApp — core to how this store takes orders — shows the generic
site-wide logo and description from `index.html`, not that product's own
photo, name, and price.

`prerender-og.js` fixes this for exactly that case: a Cloudflare Worker that
recognizes known bot user-agents on `/product/:id` and serves a small,
real HTML page with that product's actual `og:title` / `og:description` /
`og:image`, pulled live from the same public `GET /api/products/:id` your
React page already calls. Every other request — real visitors, any other
path, any other user-agent — passes straight through to the origin,
completely unchanged. Nothing is invented; humans and bots see the same
underlying content, so this isn't cloaking.

**This has not been deployed.** It needs a Cloudflare account, which this
environment has no access to. Until you deploy it, it has zero effect —
the file just sits here.

**Prerequisite you don't have yet: a real custom domain you own** (e.g.
`noyontelecom.com`), not `noyon-telecom-web.onrender.com`. A Cloudflare
Worker Route attaches to a *zone* (a domain) added to your own Cloudflare
account — and you can only add a domain you actually own/control the
registration for. `onrender.com` is Render's domain; you can't add someone
else's domain to your Cloudflare account, so this can't be wired up against
the current onrender.com URL at all. Buy/point a real domain first (this is
the same domain move mentioned in the earlier SEO report — do it once, and
it unblocks both a nicer URL and this fix).

## Deploy it (free tier), once you have a custom domain

1. **Get your domain onto Cloudflare.** Sign up at cloudflare.com, add your
   domain (e.g. `noyontelecom.com`), and follow its prompt to point that
   domain's nameservers at Cloudflare's. This also means Cloudflare, not
   your registrar, now controls DNS for the domain — you'll re-create
   whatever DNS record currently points the domain at Render (a CNAME to
   your Render static site) inside Cloudflare's DNS tab. Nameserver changes
   can take a few hours to propagate — do this before a launch, not during
   one.

2. **Create the Worker.**
   - Dashboard → Workers & Pages → Create → Create Worker.
   - Open the online editor ("Quick Edit") and paste in the full contents
     of `prerender-og.js`, replacing the default template. Save/Deploy.
   - (If you prefer the CLI: `npm install -g wrangler`, `wrangler init`,
     copy this file in as `src/index.js`, `wrangler deploy`.)

3. **Set two environment variables** (Worker → Settings → Variables):
   - `SITE_URL` = your custom domain, e.g. `https://noyontelecom.com` —
     same value you'll set for the backend's `SITE_URL` and the frontend's
     `VITE_SITE_URL` once the domain is live (see `backend/.env.example`)
   - `API_URL` = `https://noyon-telecom-api.onrender.com` (the backend stays
     on its onrender.com URL — only the storefront-facing domain moves)

4. **Route it to your domain**, scoped to just product pages so nothing
   else is affected: Worker → Settings → Triggers → Add Route →
   `yourdomain.com/product/*`, zone = your domain.

5. **Verify.** From any machine:
   ```
   curl -A "facebookexternalhit/1.1" https://yourdomain.com/product/<a-real-product-id>
   ```
   The response `<title>` and `og:image` should be that specific product's,
   not the generic homepage ones. A plain browser visit to the same URL
   should look completely unchanged.

6. If Facebook/WhatsApp cached a stale preview from before this was live,
   use [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/)
   to force a re-scrape of a URL — WhatsApp reads from the same cache.

## What this deliberately does NOT do

- Doesn't touch Googlebot — it already renders the JS-set tags correctly,
  so it doesn't need this (though including `Googlebot`/`Bingbot` in the
  bot list is a one-line change if you ever want faster/more reliable
  indexing on top of what already works).
- Doesn't touch any path other than `/product/:id` — the homepage/category
  pages already have adequate static OG tags in `index.html` that don't
  depend on JS running first.
- Doesn't cache anything Cloudflare-side beyond the standard 5-minute TTL
  already used by the sitemap/feed endpoints, so a price/photo change shows
  up in previews within minutes, not hours.
