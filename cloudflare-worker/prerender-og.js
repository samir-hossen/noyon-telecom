// Cloudflare Worker: serves correct Open Graph / Twitter Card meta tags to
// link-preview bots (WhatsApp, Facebook, Twitter/X, LinkedIn, Slack,
// Telegram, Discord...) hitting a product page. See README.md in this
// folder for what problem this solves and step-by-step deploy instructions
// — deploying it requires a Cloudflare account this environment has no
// access to, so it isn't wired into anything automatically. Until deployed,
// this file has zero effect on the live site.
//
// Every request that ISN'T a bot on a /product/:id path is passed straight
// through to the real origin, completely unchanged — this only ever adds a
// response for a case that currently shows nothing useful (a bot that can't
// run the JS that normally sets these tags). Humans and Googlebot (which
// does render JS) see the exact same underlying content either way, so this
// is not cloaking.

const BOT_USER_AGENTS = [
  'facebookexternalhit', 'facebookcatalog', 'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot', 'Slack-ImgProxy',
  'TelegramBot',
  'Discordbot',
  'redditbot',
  'Pinterest',
  'vkShare',
  'SkypeUriPreview',
  'W3C_Validator',
];

function isBotUserAgent(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => lower.includes(bot.toLowerCase()));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Same fallback index.html's static og:image uses — a photo-less product
// shares with the real site logo instead of a broken image URL.
function resolveImageUrl(img, siteUrl) {
  if (!img) return `${siteUrl}/logo-full.png`;
  return img.startsWith('http') ? img : `${siteUrl}${img}`;
}

// Every value here comes straight from the public GET /api/products/:id
// response (the same endpoint the real React page calls) — nothing about a
// specific product is invented.
function buildProductHtml(product, siteUrl) {
  const title = `${product.name} Price in Bangladesh — Noyon Telecom`;
  const priceText = product.price > 0 ? `at ৳${Math.round(product.price).toLocaleString('en-BD')} ` : '';
  const stockText = product.stock > 0 ? 'In stock.' : 'Currently out of stock.';
  const detail = product.desc ? product.desc.slice(0, 90) : `Shop ${product.category} at Noyon Telecom.`;
  const description = `Buy ${product.name} ${priceText}in Bangladesh. ${detail} ${stockText} Order from Noyon Telecom.`;
  const image = resolveImageUrl(product.img, siteUrl);
  const url = `${siteUrl}/product/${product.id}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.desc || undefined,
    image: (Array.isArray(product.images) && product.images.length ? product.images : [product.img]).map((i) => resolveImageUrl(i, siteUrl)),
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    },
    ...(product.reviewCount > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } }
      : {}),
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:site_name" content="Noyon Telecom">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<h1>${escapeHtml(product.name)}</h1>
<p>${escapeHtml(description)}</p>
<a href="${escapeHtml(url)}">View this product on Noyon Telecom</a>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/product\/([^/]+)\/?$/);
    const ua = request.headers.get('User-Agent');

    if (!match || request.method !== 'GET' || !isBotUserAgent(ua)) {
      return fetch(request);
    }

    const SITE_URL = (env.SITE_URL || url.origin).replace(/\/$/, '');
    const API_URL = (env.API_URL || '').replace(/\/$/, '');
    if (!API_URL) return fetch(request); // not configured yet — fail open, origin still serves the normal page

    try {
      const apiRes = await fetch(`${API_URL}/api/products/${encodeURIComponent(match[1])}`, {
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (!apiRes.ok) return fetch(request); // deleted/draft/unknown id — let the origin's real 404 handle it
      const { product } = await apiRes.json();
      if (!product) return fetch(request);

      return new Response(buildProductHtml(product, SITE_URL), {
        headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'public, max-age=300' },
      });
    } catch {
      // Any failure here (API down, bad JSON, etc) must never break the page
      // for a real visitor — fall through to the normal origin response.
      return fetch(request);
    }
  },
};
