// Builds the "page model" for every public catalog URL — product, category,
// brand, brand + category and model hub pages: title, meta description,
// canonical, H1, intro, FAQ, breadcrumb, the products to list and the JSON-LD.
// Used by the server-rendered HTML (routes/seo.routes.js → seo/html.js) and,
// as JSON, by the storefront (GET /api/seo/page), so both show the same text.
import prisma from '../prismaClient.js';
import { ALL_CATEGORIES, ALL_BRANDS, isDisabledCategory, findDisabledCategory, DISABLED_CATEGORIES_LOWER } from '../config/catalog.js';
import { slugify, productPath } from '../utils/slug.js';
import { buildProductWhere, buildProductOrderBy, storefrontWhere } from '../utils/productQuery.js';
import { isPricePublished } from '../utils/serialize.js';
import { buildProductTitle, buildProductMetaDescription, buildProductH1, PART_TYPES } from '../utils/productContent.js';
import { normalizeQualityOptions } from '../utils/qualityOptions.js';
import { modelSlugsFor } from '../utils/modelSlugs.js';
import { getOrSet } from '../utils/cache.js';
import * as content from './content.js';
import { partPreviewPath } from './partPhotos.js';

export const PAGE_SIZE = 24;
const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const PART_LABELS = Object.values(PART_TYPES).map((p) => p.label).sort((a, b) => b.length - a.length);

export function absoluteUrl(path) {
  return `${SITE_URL}${path}`;
}

export function categoryFromSlug(slug) {
  return ALL_CATEGORIES.find((c) => slugify(c) === slug) || null;
}

export function brandFromSlug(slug) {
  return ALL_BRANDS.find((b) => slugify(b) === slug) || null;
}

function realImages(p) {
  const list = Array.isArray(p.images) && p.images.length ? p.images : [p.img];
  return list.filter((src) => src && !src.startsWith('/images/placeholders/') && !src.startsWith('/images/parts/')).map((src) => (src.startsWith('http') ? src : absoluteUrl(src)));
}

function firstParagraph(text) {
  return String(text || '').split(/\n\s*\n/)[0].trim();
}

// Title + meta for one product — also sent to the storefront with the
// product (GET /api/products/:id), so the page head matches either way.
export function productSeo(p) {
  const publicPrice = isPricePublished(p) ? p.price : null;
  const grades = publicPrice ? normalizeQualityOptions(p.qualityOptions) : [];
  return {
    title: buildProductTitle(p.name),
    description: buildProductMetaDescription(p.name, grades[0]?.price ?? publicPrice, { from: grades.length > 1 }),
    h1: buildProductH1(p.name),
  };
}

function partLabelOf(p) {
  return PART_LABELS.find((l) => p.name.endsWith(` ${l}`)) || p.category;
}

// A short public view of a product for lists and links.
function listItem(p) {
  return {
    name: p.name,
    path: productPath(p),
    category: p.category,
    img: p.img || '',
    price: isPricePublished(p) ? p.price : null,
    part: partLabelOf(p),
  };
}

const LIST_SELECT = { id: true, slug: true, name: true, category: true, img: true, price: true, priceStatus: true };

function breadcrumbLd(crumbs) {
  return {
    id: 'breadcrumb',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
    },
  };
}

function faqLd(faq) {
  return {
    id: 'faq',
    data: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  };
}

function collectionLd(name, path, items) {
  return {
    id: 'collection',
    data: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      url: absoluteUrl(path),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: items.slice(0, 24).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(p.path) })),
      },
    },
  };
}

function notFound() {
  return {
    status: 404,
    kind: 'not-found',
    head: { title: 'Page not found | Noyon Telecom', description: 'This page does not exist. Browse all wholesale mobile phone spare parts at Noyon Telecom.', robots: 'noindex, nofollow' },
    h1: 'Page not found',
    breadcrumb: [{ name: 'Home', path: '/' }],
    jsonLd: [],
  };
}

function pageNumber(page) {
  return Math.max(1, parseInt(page, 10) || 1);
}

function withPage(path, page) {
  return page > 1 ? `${path}?page=${page}` : path;
}

// ---------- product ----------
async function productPage(slug) {
  let row = await prisma.product.findFirst({ where: { OR: [{ id: slug }, { slug }] } });
  if (!row) {
    const redirect = await prisma.productSlugRedirect.findUnique({ where: { slug }, include: { product: true } });
    if (redirect?.product?.published && !findDisabledCategory(redirect.product.categories)) {
      return { status: 301, location: productPath(redirect.product) };
    }
    return notFound();
  }
  if (!row.published || findDisabledCategory(row.categories)) return notFound();
  if (row.slug && slug !== row.slug) return { status: 301, location: productPath(row) };

  const { h1, ...seo } = productSeo(row);
  const path = productPath(row);
  const published = isPricePublished(row);
  const grades = published ? normalizeQualityOptions(row.qualityOptions) : [];
  const modelSlug = (row.modelSlugs || [])[0] || null;
  const modelName = modelSlug ? (row.compatibleModels || []).find((m) => modelSlugsFor([m])[0] === modelSlug) || null : null;
  const relatedRows = modelSlug
    ? await prisma.product.findMany({
      where: storefrontWhere({ modelSlugs: { hasSome: row.modelSlugs }, id: { not: row.id } }),
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 24,
      select: LIST_SELECT,
    })
    : [];
  const images = realImages(row);
  // Home › Samsung › Samsung Display › Galaxy A15 Display — links the
  // brand and brand+part pages (Shop › Display when the brand isn't listed).
  const brandName = row.brand ? brandFromSlug(slugify(row.brand)) : null;
  const crumbs = brandName
    ? [
      { name: 'Home', path: '/' },
      { name: brandName, path: `/brand/${slugify(brandName)}` },
      { name: `${brandName} ${row.category}`, path: `/brand/${slugify(brandName)}/${slugify(row.category)}` },
      { name: row.name, path },
    ]
    : [
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
      { name: row.category, path: `/category/${slugify(row.category)}` },
      { name: row.name, path },
    ];
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: row.name,
    description: firstParagraph(row.desc) || row.name,
    sku: row.sku || undefined,
    mpn: row.sku || undefined,
    brand: row.brand ? { '@type': 'Brand', name: row.brand } : undefined,
    category: `Mobile Phone Parts > ${row.category}`,
    ...(images.length ? { image: images } : {}),
    // Only a price the owner has published — never a draft, never ৳0.
    // Several grades: one AggregateOffer from the cheapest to the dearest.
    ...(published
      ? {
        offers: {
          ...(grades.length > 1
            ? { '@type': 'AggregateOffer', lowPrice: grades[0].price, highPrice: grades[grades.length - 1].price, offerCount: grades.length }
            : { '@type': 'Offer', price: grades[0]?.price ?? row.price }),
          url: absoluteUrl(path),
          priceCurrency: 'BDT',
          // Stock 0 means "ask us" (not tracked), never sold out — so no availability claim then.
          ...(row.stock > 0 ? { availability: 'https://schema.org/InStock' } : {}),
          itemCondition: 'https://schema.org/NewCondition',
          eligibleQuantity: { '@type': 'QuantitativeValue', minValue: row.moq || 1 },
          seller: { '@type': 'Organization', name: 'Noyon Telecom' },
        },
      }
      : {}),
    ...(row.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: row.rating, reviewCount: row.reviewCount } } : {}),
  };
  return {
    status: 200,
    kind: 'product',
    // Link previews (WhatsApp, Facebook) show the part-type photo until the product has its own.
    head: { ...seo, canonical: path, ogType: 'product', image: images[0] || absoluteUrl(partPreviewPath(row.category, row.name, row.slug)) },
    h1,
    breadcrumb: crumbs,
    product: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      brand: row.brand,
      category: row.category,
      desc: row.desc,
      img: row.img || '',
      images,
      moq: row.moq || 1,
      stock: row.stock,
      warranty: row.warranty,
      compatibleModels: row.compatibleModels || [],
      price: published ? row.price : null,
      qualityOptions: grades,
    },
    model: modelSlug && modelName ? { slug: modelSlug, name: modelName, path: `/model/${modelSlug}` } : null,
    related: relatedRows.map(listItem),
    // Product markup only with a published price: Google treats a Product
    // without offers/reviews as an invalid item (thousands of Search Console
    // errors); the price-on-WhatsApp pages keep their breadcrumb.
    jsonLd: [published ? { id: 'product', data: productLd } : null, breadcrumbLd(crumbs)].filter(Boolean),
  };
}

// ---------- listing helpers ----------
async function listProducts(where, page) {
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: buildProductOrderBy('popular'), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: LIST_SELECT }),
    prisma.product.count({ where }),
  ]);
  return { products: rows.map(listItem), total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

async function brandsInCategory(category) {
  const rows = await prisma.$queryRaw`
    SELECT brand, count(*)::int AS n FROM "Product"
    WHERE published = true AND brand IS NOT NULL AND categories @> ${JSON.stringify([category])}::jsonb
    GROUP BY brand ORDER BY n DESC`;
  return rows.map((r) => r.brand);
}

async function categoriesForBrand(brand) {
  const rows = await prisma.$queryRaw`
    SELECT cat AS name, count(*)::int AS count
    FROM "Product", jsonb_array_elements_text(categories) cat
    WHERE published = true AND brand = ${brand}
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(categories) c WHERE lower(c) = ANY(${DISABLED_CATEGORIES_LOWER}))
    GROUP BY cat ORDER BY count DESC`;
  return rows.filter((r) => ALL_CATEGORIES.includes(r.name) && !isDisabledCategory(r.name));
}

// Model hubs for one brand (optionally one category): slug, name, parts count.
async function modelsForBrand(brand, category = null) {
  const rows = category
    ? await prisma.$queryRaw`
      SELECT "modelSlugs", "compatibleModels" FROM "Product"
      WHERE published = true AND brand = ${brand} AND categories @> ${JSON.stringify([category])}::jsonb`
    : await prisma.$queryRaw`
      SELECT "modelSlugs", "compatibleModels" FROM "Product"
      WHERE published = true AND brand = ${brand}`;
  const bySlug = new Map();
  for (const r of rows) {
    for (const name of r.compatibleModels || []) {
      const slug = modelSlugsFor([name])[0];
      if (!slug || !(r.modelSlugs || []).includes(slug)) continue;
      const e = bySlug.get(slug) || { slug, name, count: 0 };
      e.count += 1;
      bySlug.set(slug, e);
    }
  }
  return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en', { numeric: true }));
}

// ---------- category ----------
async function categoryPage(slug, page) {
  const category = categoryFromSlug(slug);
  if (!category) return notFound();
  if (isDisabledCategory(category)) return { status: 301, location: '/shop' };
  const path = `/category/${slug}`;
  const where = buildProductWhere({ category, status: 'published', storefront: true });
  const [list, brands] = await Promise.all([listProducts(where, page), getOrSet(`seo:brands-in:${category}`, 300, () => brandsInCategory(category))]);
  if (list.total === 0 || page > list.totalPages) return notFound();
  const head = content.categoryHead(category, page);
  const faq = content.categoryFaq(category, brands);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: category, path }];
  return {
    status: 200,
    kind: 'category',
    head: { title: head.title, description: head.description, canonical: withPage(path, page) },
    h1: head.h1,
    intro: content.categoryIntro(category),
    faq,
    breadcrumb: crumbs,
    brands: brands.map((b) => ({ name: b, path: `/brand/${slugify(b)}/${slug}` })),
    ...list,
    page,
    basePath: path,
    jsonLd: [breadcrumbLd(crumbs), collectionLd(head.h1, path, list.products), faqLd(faq)],
  };
}

// ---------- brand ----------
async function brandPage(brandSlug, page) {
  const brand = brandFromSlug(brandSlug);
  if (!brand) return notFound();
  const path = `/brand/${brandSlug}`;
  const where = buildProductWhere({ brand, status: 'published', storefront: true });
  const [list, categories, models] = await Promise.all([
    listProducts(where, page),
    getOrSet(`seo:cats-for:${brand}`, 300, () => categoriesForBrand(brand)),
    getOrSet(`seo:models-for:${brand}`, 300, () => modelsForBrand(brand)),
  ]);
  if (list.total === 0 || page > list.totalPages) return notFound();
  const head = content.brandHead(brand, categories, page);
  const faq = content.brandFaq(brand, categories);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: brand, path }];
  return {
    status: 200,
    kind: 'brand',
    head: { title: head.title, description: head.description, canonical: withPage(path, page) },
    h1: head.h1,
    intro: content.brandIntro(brand, categories, models.length),
    faq,
    breadcrumb: crumbs,
    categories: categories.map((c) => ({ ...c, path: `/brand/${brandSlug}/${slugify(c.name)}` })),
    models: models.slice(0, 120).map((m) => ({ ...m, path: `/model/${m.slug}` })),
    ...list,
    page,
    basePath: path,
    jsonLd: [breadcrumbLd(crumbs), collectionLd(head.h1, path, list.products), faqLd(faq)],
  };
}

// ---------- brand + category ----------
async function brandCategoryPage(brandSlug, categorySlug, page) {
  const brand = brandFromSlug(brandSlug);
  const category = categoryFromSlug(categorySlug);
  if (!brand || !category) return notFound();
  if (isDisabledCategory(category)) return { status: 301, location: `/brand/${brandSlug}` };
  const path = `/brand/${brandSlug}/${categorySlug}`;
  const where = buildProductWhere({ brand, category, status: 'published', storefront: true });
  const [list, models] = await Promise.all([listProducts(where, page), getOrSet(`seo:models-for:${brand}:${category}`, 300, () => modelsForBrand(brand, category))]);
  if (list.total === 0 || page > list.totalPages) return notFound();
  const head = content.brandCategoryHead(brand, category, list.total, page);
  const faq = content.categoryFaq(category, [brand]);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: brand, path: `/brand/${brandSlug}` }, { name: `${brand} ${category}`, path }];
  return {
    status: 200,
    kind: 'brand-category',
    head: { title: head.title, description: head.description, canonical: withPage(path, page) },
    h1: head.h1,
    intro: content.brandCategoryIntro(brand, category, list.total, models.slice(0, 4).map((m) => m.name)),
    faq,
    breadcrumb: crumbs,
    models: models.slice(0, 120).map((m) => ({ ...m, path: `/model/${m.slug}` })),
    ...list,
    page,
    basePath: path,
    jsonLd: [breadcrumbLd(crumbs), collectionLd(head.h1, path, list.products), faqLd(faq)],
  };
}

// ---------- model hub ----------
async function modelPage(slug) {
  const rows = await prisma.product.findMany({
    where: storefrontWhere({ modelSlugs: { has: slug } }),
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: 200,
    select: { ...LIST_SELECT, brand: true, compatibleModels: true },
  });
  if (rows.length === 0) return notFound();
  const names = new Map();
  const brands = new Map();
  for (const r of rows) {
    for (const m of r.compatibleModels || []) if (modelSlugsFor([m])[0] === slug) names.set(m, (names.get(m) || 0) + 1);
    if (r.brand) brands.set(r.brand, (brands.get(r.brand) || 0) + 1);
  }
  const name = [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || slug;
  const brand = [...brands.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const items = rows.map(listItem);
  const parts = [...new Set(items.map((p) => p.part))];
  const path = `/model/${slug}`;
  const head = content.modelHead(name, parts);
  const faq = content.modelFaq(name, parts);
  const crumbs = [{ name: 'Home', path: '/' }, ...(brand ? [{ name: brand, path: `/brand/${slugify(brand)}` }] : []), { name, path }];
  return {
    status: 200,
    kind: 'model',
    head: { title: head.title, description: head.description, canonical: path },
    h1: head.h1,
    intro: content.modelIntro(name, parts),
    faq,
    breadcrumb: crumbs,
    model: { slug, name, brand, path },
    products: items,
    total: items.length,
    totalPages: 1,
    page: 1,
    basePath: path,
    jsonLd: [breadcrumbLd(crumbs), collectionLd(head.h1, path, items), faqLd(faq)],
  };
}

// Route a public path ("/category/display", "/product/vivo-y21-display")
// to its page model. Cached briefly; admin product edits clear the cache.
export async function resolvePage(pathname, { page } = {}) {
  const p = pageNumber(page);
  const parts = String(pathname || '').replace(/\/+$/, '').split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  const key = `seo:page:${parts.join('/')}:${p}`;
  return getOrSet(key, 300, async () => {
    const [kind, a, b] = parts;
    if (kind === 'product' && a && !b) return productPage(a);
    if (kind === 'category' && a && !b) return categoryPage(a, p);
    if (kind === 'brand' && a && !b) return brandPage(a, p);
    if (kind === 'brand' && a && b) return brandCategoryPage(a, b, p);
    if (kind === 'model' && a && !b) return modelPage(a);
    return notFound();
  });
}
