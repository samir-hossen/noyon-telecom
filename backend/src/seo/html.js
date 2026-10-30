// Server-rendered HTML for the catalog pages: the storefront's own built
// index.html (so the React app still loads and takes over), with the page's
// real <title>, meta description, canonical, Open Graph tags and JSON-LD in
// <head>, and readable content (H1, description, product links, FAQ) inside
// <div id="root">. Search engines and link previews get a complete page
// without running JavaScript.
import fs from 'node:fs';
import { createShellCache } from './shellCache.js';
import { WHATSAPP_NUMBER, priceRequestMessage } from './whatsapp.js';
import { absoluteUrl } from './pages.js';
import { partPhotoPath } from './partPhotos.js';

const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const SHELL_TTL_MS = 60 * 1000;

const MINIMAL_SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Noyon Telecom</title>
    <meta name="description" content="" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const getRemoteShell = createShellCache(async () => {
  const res = await fetch(`${SITE_URL}/index.html`, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'noyon-ssr/1.0' } });
  if (!res.ok) throw new Error(`shell HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('<div id="root">')) throw new Error('shell has no #root');
  return html;
}, {
  ttlMs: SHELL_TTL_MS,
  onError: (err) => console.error('SSR: could not load the storefront shell:', err.message),
});

// Refresh the built shell in the background after a minute. Visitors keep
// receiving the last good HTML without waiting for an extra storefront fetch.
export async function getShell() {
  if (process.env.SSR_SHELL_FILE) {
    try {
      return fs.readFileSync(process.env.SSR_SHELL_FILE, 'utf8');
    } catch {
      return MINIMAL_SHELL;
    }
  }
  return (await getRemoteShell()) || MINIMAL_SHELL;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// JSON-LD inside <script>: "<" escaped so text can never close the tag.
function jsonLdTag(block) {
  return `<script type="application/ld+json" id="ld-json-${escapeHtml(block.id)}">${JSON.stringify(block.data).replace(/</g, '\\u003c')}</script>`;
}

function setMeta(html, attr, name, content) {
  const tag = `<meta ${attr}="${name}" content="${escapeHtml(content)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`);
}

function formatTaka(n) {
  return `৳${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
}

function breadcrumbHtml(crumbs) {
  return `<nav class="breadcrumb-trail" aria-label="Breadcrumb">${crumbs
    .map((c, i) => (i === crumbs.length - 1 ? `<span aria-current="page">${escapeHtml(c.name)}</span>` : `<a href="${escapeHtml(c.path)}">${escapeHtml(c.name)}</a>`))
    .join(' <span>/</span> ')}</nav>`;
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n');
}

function faqHtml(faq) {
  if (!faq?.length) return '';
  return `<section class="form-panel wide" style="margin-top:28px"><h2>Frequently asked questions</h2>${faq
    .map((f) => `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`)
    .join('')}</section>`;
}

function productListHtml(products) {
  return `<ul class="ssr-product-list">${products
    .map((p) => `<li><a href="${escapeHtml(p.path)}">${escapeHtml(p.name)}</a>${p.price ? ` — ${formatTaka(p.price)}` : ''}</li>`)
    .join('')}</ul>`;
}

function paginationHtml(model) {
  if (!model.totalPages || model.totalPages <= 1) return '';
  const links = [];
  if (model.page > 1) links.push(`<a rel="prev" href="${escapeHtml(model.page === 2 ? model.basePath : `${model.basePath}?page=${model.page - 1}`)}">← Previous</a>`);
  links.push(`<span>Page ${model.page} of ${model.totalPages}</span>`);
  if (model.page < model.totalPages) links.push(`<a rel="next" href="${escapeHtml(`${model.basePath}?page=${model.page + 1}`)}">Next →</a>`);
  return `<nav class="pagination">${links.join(' ')}</nav>`;
}

function productBody(model) {
  const p = model.product;
  const img = p.images[0] || partPhotoPath(p.category, p.name, p.slug);
  const photoNote = p.images[0] ? '' : '<p class="pd-photo-note">Representative photo — you get the part for your exact model · <a href="/photo-credits">Photo credits</a></p>';
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(priceRequestMessage({ ...p, url: absoluteUrl(model.head.canonical) }))}`;
  const specs = [
    p.sku && `<div><span>SKU</span><strong>${escapeHtml(p.sku)}</strong></div>`,
    p.brand && `<div><span>Brand</span><strong>${escapeHtml(p.brand)}</strong></div>`,
    `<div><span>MOQ</span><strong>${p.moq} ${p.moq === 1 ? 'unit' : 'units'}</strong></div>`,
    p.warranty && `<div><span>Warranty</span><strong>${escapeHtml(p.warranty)}</strong></div>`,
  ].filter(Boolean).join('');
  // Several grades (High Quality / Original …): the range, then each grade's price.
  const grades = p.qualityOptions || [];
  const priceHtml = grades.length > 1
    ? `<span class="now">${formatTaka(grades[0].price)} – ${formatTaka(grades[grades.length - 1].price)}</span>`
    : p.price
      ? `<span class="now">${formatTaka(p.price)}</span>`
      : `<a class="now pd-price-request pd-price-ask" href="${escapeHtml(wa)}">Ask price on WhatsApp</a>`;
  const gradeList = grades.length
    ? `<ul class="pd-grade-list">${grades.map((g) => `<li><span>${escapeHtml(g.label)}</span> <strong>${formatTaka(g.price)}</strong></li>`).join('')}</ul>`
    : '';
  const related = model.related?.length
    ? `<section class="section"><h2>Other parts for ${escapeHtml(model.model?.name || 'this model')}</h2>${productListHtml(model.related)}${model.model ? `<p><a href="${escapeHtml(model.model.path)}">All ${escapeHtml(model.model.name)} parts →</a></p>` : ''}</section>`
    : '';
  return `<div class="container">
${breadcrumbHtml(model.breadcrumb)}
<div class="pd-grid">
<div><div class="pd-img"><img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" width="600" height="600" /></div>${photoNote}</div>
<div>
<p class="pd-cat"><a href="/category/${escapeHtml(p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${escapeHtml(p.category)}</a></p>
<h1 class="pd-title">${escapeHtml(model.h1 || p.name)}</h1>
<div class="pd-price">${priceHtml}</div>
${gradeList}
<div class="pd-action-row"><a class="btn pd-whatsapp-btn" href="${escapeHtml(wa)}">💬 WhatsApp</a> <a class="btn btn-outline" href="/request-quote?productId=${encodeURIComponent(p.id)}&amp;name=${encodeURIComponent(p.name)}">📋 Request Quote</a></div>
<div class="pd-specs">${specs}</div>
</div>
</div>
<section class="pd-details"><h2>Description</h2>
<div class="pd-desc">${paragraphs(p.desc)}</div>
${p.compatibleModels.length ? `<div class="pd-compat"><span class="pd-compat-label">Compatibility</span> ${escapeHtml(p.compatibleModels.join(', '))}</div>` : ''}
</section>
${related}
</div>`;
}

function listingBody(model) {
  const links = [];
  if (model.kind === 'category' && model.brands?.length) {
    links.push(`<section><h2>${escapeHtml(model.h1.replace(/ Wholesale.*$/, ''))} by brand</h2><ul class="ssr-link-list">${model.brands.map((b) => `<li><a href="${escapeHtml(b.path)}">${escapeHtml(b.name)}</a></li>`).join('')}</ul></section>`);
  }
  if (model.kind === 'brand' && model.categories?.length) {
    links.push(`<section><h2>Parts by type</h2><ul class="ssr-link-list">${model.categories.map((c) => `<li><a href="${escapeHtml(c.path)}">${escapeHtml(c.name)} (${c.count})</a></li>`).join('')}</ul></section>`);
  }
  if (model.models?.length) {
    links.push(`<section><h2>Parts by phone model</h2><ul class="ssr-link-list">${model.models.map((m) => `<li><a href="${escapeHtml(m.path)}">${escapeHtml(m.name)}</a></li>`).join('')}</ul></section>`);
  }
  return `<div class="container">
${breadcrumbHtml(model.breadcrumb)}
<div class="page-header"><h1 class="page-title">${escapeHtml(model.h1)}</h1>${model.intro ? `<p>${escapeHtml(model.intro)}</p>` : ''}</div>
${productListHtml(model.products || [])}
${paginationHtml(model)}
${links.join('\n')}
${faqHtml(model.faq)}
</div>`;
}

function notFoundBody() {
  return `<div class="container"><div class="empty-state"><h1>Page not found</h1><p>This page does not exist. <a href="/shop">Browse all parts</a>.</p></div></div>`;
}

export function renderPage(shell, model) {
  const { head } = model;
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(head.title)}</title>`);
  html = setMeta(html, 'name', 'description', head.description);
  html = setMeta(html, 'property', 'og:title', head.title);
  html = setMeta(html, 'property', 'og:description', head.description);
  html = setMeta(html, 'property', 'og:type', head.ogType || 'website');
  html = setMeta(html, 'name', 'twitter:title', head.title);
  html = setMeta(html, 'name', 'twitter:description', head.description);
  if (head.image) {
    html = setMeta(html, 'property', 'og:image', head.image);
    html = setMeta(html, 'name', 'twitter:image', head.image);
  }
  const extra = [];
  if (head.canonical) {
    extra.push(`<link rel="canonical" href="${escapeHtml(absoluteUrl(head.canonical))}" />`);
    extra.push(`<meta property="og:url" content="${escapeHtml(absoluteUrl(head.canonical))}" />`);
  }
  if (head.robots) extra.push(`<meta name="robots" content="${escapeHtml(head.robots)}" />`);
  for (const block of model.jsonLd || []) extra.push(jsonLdTag(block));
  html = html.replace(/<meta name="robots" content="[^"]*" \/>\n?/i, ''); // the page's own robots tag (if any) replaces the default
  html = html.replace('</head>', () => `    ${extra.join('\n    ')}\n  </head>`);
  const body = model.kind === 'product' ? productBody(model) : model.kind === 'not-found' ? notFoundBody() : listingBody(model);
  return html.replace(/<div id="root">\s*<\/div>/, () => `<div id="root">${body}</div>`);
}
