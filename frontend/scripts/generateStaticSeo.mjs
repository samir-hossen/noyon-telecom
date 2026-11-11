// Pre-render the blog routes after Vite has produced dist/index.html.
// Product/category/model routes are rendered by the backend, but blog posts
// are static editorial content: generating them here gives Google, social
// preview bots and browsers with JS disabled the correct title, canonical,
// article text and BlogPosting schema with zero runtime/server cost.
import fs from 'node:fs';
import path from 'node:path';
import blogPosts from '../src/content/blogPosts.js';

const SITE_URL = 'https://noyontelecom.com';
const DIST = path.resolve('dist');
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function setMeta(html, attr, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = `<meta ${attr}="${name}" content="${escapeHtml(content)}" />`;
  const matcher = new RegExp(`<meta\\s+${attr}="${escapedName}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  return matcher.test(html) ? html.replace(matcher, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function buildHead(base, { title, description, canonical, type = 'article', jsonLd = [] }) {
  let html = base.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:type', type);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/i, '');
  const extra = [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    ...jsonLd.map((data, index) => `<script type="application/ld+json" id="static-blog-jsonld-${index}">${escapeJsonForHtml(data)}</script>`),
  ].join('\n    ');
  return html.replace('</head>', `    ${extra}\n  </head>`);
}

function blockHtml(block) {
  if (block.type === 'h2') return `<h2>${escapeHtml(block.text)}</h2>`;
  if (block.type === 'ul') return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  return `<p>${escapeHtml(block.text)}</p>`;
}

function breadcrumbLd(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'গাইড ও টিপস', item: `${SITE_URL}/blog/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}/` },
    ],
  };
}

function articleLd(post) {
  const url = `${SITE_URL}/blog/${post.slug}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.metaDescription,
    inLanguage: 'bn-BD',
    datePublished: post.publishedDate,
    dateModified: post.updatedDate || post.publishedDate,
    author: { '@id': `${SITE_URL}/#store` },
    publisher: { '@id': `${SITE_URL}/#store` },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(post.relatedCategories?.length ? { about: post.relatedCategories.map((name) => ({ '@type': 'Thing', name })) } : {}),
  };
}

function articleBody(post) {
  const related = (post.relatedSlugs || []).map((slug) => blogPosts.find((candidate) => candidate.slug === slug)).filter(Boolean);
  return `<main class="container" style="padding-bottom:60px">
    <nav class="breadcrumb-trail" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <a href="/blog/">গাইড ও টিপস</a> <span>/</span> <span aria-current="page">${escapeHtml(post.title)}</span></nav>
    <header class="page-header"><span class="eyebrow">গাইড ও টিপস</span><h1 class="page-title">${escapeHtml(post.title)}</h1><time datetime="${escapeHtml(post.publishedDate)}">${escapeHtml(post.publishedDate)}</time></header>
    <article class="form-panel wide" style="max-width:760px">${post.content.map(blockHtml).join('\n')}</article>
    ${related.length ? `<aside class="form-panel wide" style="max-width:760px;margin-top:20px"><h2>আরও পড়ুন</h2><ul>${related.map((item) => `<li><a href="/blog/${escapeHtml(item.slug)}/">${escapeHtml(item.title)}</a></li>`).join('')}</ul></aside>` : ''}
    <p style="max-width:760px;margin-top:20px"><a href="/shop">মোবাইল পার্টস ক্যাটালগ দেখুন</a> · <a href="/blog/">সব গাইড পড়ুন</a></p>
  </main>`;
}

function writeRoute(route, html) {
  const target = path.join(DIST, route.replace(/^\//, ''), 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

for (const post of blogPosts) {
  const canonical = `${SITE_URL}/blog/${post.slug}/`;
  let html = buildHead(shell, {
    title: post.title,
    description: post.metaDescription,
    canonical,
    jsonLd: [articleLd(post), breadcrumbLd(post)],
  });
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${articleBody(post)}</div>`);
  writeRoute(`/blog/${post.slug}`, html);
}

const blogDescription = 'মোবাইল ফোন পার্টস, ডিসপ্লে, চার্জিং লজিক, ব্যাক গ্লাস ও সার্ভিসিং ব্যবসার ব্যবহারিক বাংলা গাইড।';
const blogUrl = `${SITE_URL}/blog/`;
const blogListLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': blogUrl,
  name: 'মোবাইল পার্টস গাইড ও টিপস',
  url: blogUrl,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: blogPosts.map((post, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}/blog/${post.slug}/`, name: post.title })),
  },
};
let blogHtml = buildHead(shell, { title: 'মোবাইল পার্টস গাইড ও টিপস | Noyon Telecom', description: blogDescription, canonical: blogUrl, type: 'website', jsonLd: [blogListLd] });
blogHtml = blogHtml.replace(/<div id="root">\s*<\/div>/, `<div id="root"><main class="container" style="padding-bottom:60px"><header class="page-header"><h1 class="page-title">মোবাইল পার্টস গাইড ও টিপস</h1><p>${escapeHtml(blogDescription)}</p></header><ul class="ssr-product-list">${blogPosts.map((post) => `<li><a href="/blog/${escapeHtml(post.slug)}/">${escapeHtml(post.title)}</a><p>${escapeHtml(post.excerpt)}</p></li>`).join('')}</ul></main></div>`);
writeRoute('/blog', blogHtml);
