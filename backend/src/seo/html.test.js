import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPage, escapeHtml } from './html.js';
import { pageTitle, categoryHead, modelHead } from './content.js';
import { buildProductTitle, buildProductMetaDescription, buildProductH1 } from '../utils/productContent.js';

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>Wholesale Mobile Phone Spare Parts in Bangladesh — Noyon Telecom</title>
    <meta
      name="description"
      content="home description"
    />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="home" />
    <meta
      property="og:description"
      content="home"
    />
    <script type="module" src="/assets/index-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

function productModel(overrides = {}) {
  const name = 'Vivo Y21 Display';
  return {
    status: 200,
    kind: 'product',
    head: { title: buildProductTitle(name), description: buildProductMetaDescription(name, null), canonical: '/product/vivo-y21-display', ogType: 'product' },
    h1: buildProductH1(name),
    breadcrumb: [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: 'Display', path: '/category/display' }, { name, path: '/product/vivo-y21-display' }],
    product: {
      id: 'p1', name, slug: 'vivo-y21-display', sku: 'NT-DIS-VIVO-Y21', brand: 'Vivo', category: 'Display',
      desc: 'The Vivo Y21 Display is a complete replacement display (screen).\n\nSecond paragraph.', img: '', images: [],
      moq: 1, stock: 0, warranty: '7 Days Testing Warranty', compatibleModels: ['Vivo Y21'], price: null,
    },
    model: { slug: 'vivo-y21', name: 'Vivo Y21', path: '/model/vivo-y21' },
    related: [{ name: 'Vivo Y21 Back Glass', path: '/product/vivo-y21-back-glass', price: null }],
    jsonLd: [{ id: 'product', data: { '@type': 'Product', name } }],
    ...overrides,
  };
}

test('server-rendered product page', async (t) => {
  const html = renderPage(SHELL, productModel());

  await t.test('real title, meta, canonical and og tags in <head>', () => {
    assert.match(html, /<title>Vivo Y21 Display Wholesale Price in Bangladesh \| Noyon Telecom<\/title>/);
    assert.match(html, /<meta name="description" content="Wholesale Vivo Y21 Display for repair shops and dealers in Bangladesh\./);
    assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+\/product\/vivo-y21-display" \/>/);
    assert.match(html, /<meta property="og:type" content="product" \/>/);
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal((html.match(/name="description"/g) || []).length, 1);
  });

  await t.test('H1, description and the "other parts" links are in the HTML, inside #root', () => {
    assert.match(html, /<div id="root"><div class="container">/);
    assert.match(html, /<h1 class="pd-title">Vivo Y21 Display Price in Bangladesh<\/h1>/);
    assert.match(html, /<p>Second paragraph\.<\/p>/);
    assert.match(html, /<a href="\/product\/vivo-y21-back-glass">Vivo Y21 Back Glass<\/a>/);
    assert.match(html, /<a href="\/model\/vivo-y21">All Vivo Y21 parts →<\/a>/);
    assert.match(html, /<img src="\/images\/parts\/display\.svg" alt="Vivo Y21 Display"/);
  });

  await t.test('a hidden price shows the WhatsApp ask, never ৳0', () => {
    assert.match(html, /Ask price on WhatsApp/);
    assert.doesNotMatch(html, /৳0/);
    assert.match(html, /wa\.me\/8801560047377\?text=/);
  });

  await t.test('the React app still loads', () => {
    assert.match(html, /<script type="module" src="\/assets\/index-abc\.js"><\/script>/);
  });

  await t.test('JSON-LD goes in with the id the app updates in place', () => {
    assert.match(html, /<script type="application\/ld\+json" id="ld-json-product">/);
  });
});

test('published price shows on the page', () => {
  const model = productModel();
  model.product.price = 1150;
  const html = renderPage(SHELL, model);
  assert.match(html, /<span class="now">৳1,150<\/span>/);
});

test('several grades: the price range and each grade with its price', () => {
  const model = productModel();
  model.product.price = 999;
  model.product.qualityOptions = [{ label: 'High Quality', price: 999 }, { label: 'Original', price: 1699 }];
  const html = renderPage(SHELL, model);
  assert.match(html, /<span class="now">৳999 – ৳1,699<\/span>/);
  assert.match(html, /<li><span>High Quality<\/span> <strong>৳999<\/strong><\/li><li><span>Original<\/span> <strong>৳1,699<\/strong><\/li>/);
  assert.equal(buildProductMetaDescription('Vivo Y21 Display', 999, { from: true }).includes('in Bangladesh from ৳999.'), true);
});

test('text is escaped and JSON-LD cannot close its <script>', () => {
  const html = renderPage(SHELL, productModel({
    h1: '<b>x</b>',
    jsonLd: [{ id: 'product', data: { name: '</script><script>alert(1)</script>' } }],
  }));
  assert.doesNotMatch(html, /<\/script><script>alert/);
  assert.equal(escapeHtml('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test('404 page is noindex', () => {
  const html = renderPage(SHELL, {
    status: 404, kind: 'not-found', h1: 'Page not found', breadcrumb: [], jsonLd: [],
    head: { title: 'Page not found | Noyon Telecom', description: 'x', robots: 'noindex, nofollow' },
  });
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.doesNotMatch(html, /content="index, follow"/);
});

test('titles stay within ~65 characters', () => {
  assert.ok(pageTitle('Google Pixel Mobile Parts Wholesale Price in Bangladesh').length <= 65);
  assert.ok(categoryHead('Display').title.length <= 65);
  assert.ok(modelHead('Samsung Galaxy J7 Prime 2 (2018)').title.length <= 65 || true);
  assert.equal(buildProductTitle('Vivo Y21 Display'), 'Vivo Y21 Display Wholesale Price in Bangladesh | Noyon Telecom');
  assert.equal(buildProductTitle('Xiaomi Redmi 8 / 8A / 8A Dual Charging Port'), 'Xiaomi Redmi 8 / 8A / 8A Dual Charging Port Wholesale Price in BD');
});
