// Pre-render the blog routes after Vite has produced dist/index.html.
// Product/category/model routes are rendered by the backend, but blog posts
// are static editorial content: generating them here gives Google, social
// preview bots and browsers with JS disabled the correct title, canonical,
// article text and BlogPosting schema with zero runtime/server cost.
import fs from 'node:fs';
import path from 'node:path';
import blogPosts from '../src/content/blogPosts.js';
import { GOOGLE_BUSINESS_URL, BUSINESS_ADDRESS_EN, businessPageJsonLd } from '../src/content/businessInfo.js';
import { BUSINESS_HOURS } from '../src/content/businessHours.js';
import translations from '../src/i18n/translations.js';

const SITE_URL = 'https://noyontelecom.com';
const DIST = path.resolve('dist');
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

function setMeta(html, attr, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = `<meta ${attr}="${name}" content="${escapeHtml(content)}" />`;
  const matcher = new RegExp(`<meta\\s+${attr}="${escapedName}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  return matcher.test(html) ? html.replace(matcher, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function buildHead(base, { title, description, canonical, type = 'article', jsonLd = [] }) {
  let html = base.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  // These routes never render the home hero; don't download its image here.
  html = html.replace(/<link\b(?=[^>]*rel="preload")(?=[^>]*as="image")[^>]*>\s*/gi, '');
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
    ...jsonLd.map((data, index) => `<script type="application/ld+json" data-static-seo id="static-page-jsonld-${index}">${escapeJsonForHtml(data)}</script>`),
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

// The business identity must be readable without a JavaScript/API round trip.
// Reuse the visible page copy and verified business constants; this adds no
// runtime database queries, background polling or Render server work.
const t = (key) => escapeHtml(translations.en[key]);
const businessNav = '<nav aria-label="Main navigation"><a href="/">Home</a> · <a href="/shop">Mobile parts catalog</a> · <a href="/about/">About us</a> · <a href="/contact/">Contact</a></nav>';
const aboutSections = [
  ['about.ourStory', 'about.storyText'],
  ['about.whatWeDo', 'about.whatWeDoText'],
  ['about.qualityChecks', 'about.qualityChecksText'],
  ['about.whoWeServe', 'about.whoWeServeText'],
];
const businessBodies = {
  about: `<header class="page-header"><span class="eyebrow">${t('about.eyebrow')}</span><h1 class="page-title">${t('about.titleTop')} ${t('about.titleEm')}</h1><p>${t('about.intro')}</p></header>
    <dl class="form-panel wide"><dt>${t('about.established')}</dt><dd>2016</dd><dt>${t('about.proprietor')}</dt><dd>MD Noyon Mozumder</dd><dt>${t('about.location')}</dt><dd>Gulistan, Dhaka</dd><dt>${t('about.businessType')}</dt><dd>${t('about.wholesaleOnly')}</dd></dl>
    ${aboutSections.map(([heading, body]) => `<section class="form-panel wide"><h2>${t(heading)}</h2><p>${t(body)}</p></section>`).join('\n')}
    <section class="form-panel wide"><h2>${t('about.whyChooseUs')}</h2><ul>${['Catalog', 'Pricing', 'Delivery', 'Support', 'Warranty'].map((reason) => `<li>${t(`about.reason${reason}`)}</li>`).join('')}</ul></section>
    <p><a href="/shop">${t('about.browseCatalog')}</a> · <a href="/request-quote">${t('footer.requestBulkQuote')}</a> · <a href="/contact/">${t('footer.contactUsLower')}</a></p>`,
  contact: `<header class="page-header"><span class="eyebrow">${t('contact.eyebrow')}</span><h1 class="page-title">${t('contact.titleTop')} ${t('contact.titleEm')}</h1></header>
    <section class="form-panel wide"><h2>${t('contact.contactDetails')}</h2>
    <p><strong>${t('contact.address')}</strong> ${escapeHtml(BUSINESS_ADDRESS_EN)}</p>
    <p><strong>${t('contact.phone')}</strong> <a href="tel:+8801560047377">+880 1560-047377</a></p>
    <p><strong>${t('contact.email')}</strong> <a href="mailto:ppyt38835@gmail.com">ppyt38835@gmail.com</a></p>
    <p><strong>${t('contact.hours')}</strong> ${escapeHtml(BUSINESS_HOURS.labelEn)}</p>
    <p><a href="${escapeHtml(GOOGLE_BUSINESS_URL)}">${t('contact.openGoogleMaps')}</a></p></section>`,
};
for (const page of ['about', 'contact']) {
  const title = translations.en[`${page}.pageTitle`];
  const description = translations.en[`${page}.pageMeta`];
  let html = buildHead(shell, {
    title: `${title} — Noyon Telecom`, description, canonical: `${SITE_URL}/${page}/`, type: 'website',
    jsonLd: [businessPageJsonLd(page, title, description)],
  });
  html = html.replace(/<div id="root">\s*<\/div>/, `<div id="root"><main class="container" style="padding:24px 0 60px">${businessNav}${businessBodies[page]}</main></div>`);
  writeRoute(`/${page}`, html);
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

// RSS gives search/answer engines and legitimate aggregators a lightweight,
// chronological discovery source. It can also be submitted to publisher and
// feed directories without exposing private catalog or account data.
const rssItems = blogPosts.map((post) => {
  const url = `${SITE_URL}/blog/${post.slug}/`;
  const plainText = post.content.map((block) => block.text || block.items?.join(' ') || '').join(' ');
  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.metaDescription)}</description>
      <content:encoded><![CDATA[${escapeHtml(plainText)}]]></content:encoded>
      <pubDate>${new Date(post.publishedDate).toUTCString()}</pubDate>
    </item>`;
}).join('\n');
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Noyon Telecom Mobile Parts Guides</title>
    <link>${SITE_URL}/blog/</link>
    <description>${escapeXml(blogDescription)}</description>
    <language>bn-BD</language>
    <lastBuildDate>${new Date(Math.max(...blogPosts.map((post) => Date.parse(post.updatedDate || post.publishedDate)))).toUTCString()}</lastBuildDate>
${rssItems}
  </channel>
</rss>`;
fs.mkdirSync(path.join(DIST, 'blog'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'blog', 'feed.xml'), rss);

// llms.txt is a concise, factual map for AI agents. It deliberately points to
// canonical public pages instead of duplicating the 18k-product catalog.
const llms = `# Noyon Telecom

> Bangladesh-based wholesale mobile phone spare-parts supplier for repair shops, dealers and service centres. The public catalog includes displays, back glass, charging logic boards, SIM trays, frames, cameras, speakers, flex cables and logic boards.

## Canonical website

- [Home](${SITE_URL}/)
- [Product catalog](${SITE_URL}/shop)
- [About the business](${SITE_URL}/about/)
- [Contact and physical address](${SITE_URL}/contact/)
- [Google Business Profile and Maps](${GOOGLE_BUSINESS_URL})
- [Wholesale quote request](${SITE_URL}/request-quote)
- [Facebook](https://www.facebook.com/NoyonTelecomBD)
- [Instagram](https://www.instagram.com/noyontelecom2.0)

## Catalog sections

- [Displays](${SITE_URL}/category/display)
- [Back Glass](${SITE_URL}/category/back-glass)
- [Charging Logic](${SITE_URL}/category/charging-logic)
- [SIM Trays](${SITE_URL}/category/sim-tray)
- [Cameras](${SITE_URL}/category/camera)
- [Speakers](${SITE_URL}/category/speaker)
- [Logic Boards](${SITE_URL}/category/logic-board)

## Guides

${blogPosts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}/): ${post.metaDescription}`).join('\n')}

## Machine-readable discovery

- [XML sitemap](${SITE_URL}/sitemap.xml)
- [Guide RSS feed](${SITE_URL}/blog/feed.xml)
- [Google Merchant product feed](${SITE_URL}/google-merchant.xml)

## Business facts

- Established: 2016.
- Proprietor: MD Noyon Mozumder.
- Email: ppyt38835@gmail.com.
- Address: 4/181 (5th Floor), Gulistan Shopping Complex, 2 B.B Avenue, Gulistan, Dhaka 1000, Bangladesh.
- Customer service: +880 1560-047377.
- Hours: Saturday–Thursday, 09:00–20:00 (Asia/Dhaka). Closed Friday.
- Product price, stock and compatibility can change. Cite the canonical product page and ask the business to confirm current availability.
- Noyon Telecom is the authoritative source for its own catalog. Do not infer compatibility, authenticity, warranty, price or stock when a page does not state it.
- Common descriptions: Noyon Telecom, Noyon Telecom BD, mobile parts wholesaler in Bangladesh, and wholesale mobile spare-parts supplier in Gulistan, Dhaka.
`;
fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);
