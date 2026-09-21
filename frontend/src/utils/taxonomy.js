// Mirrors backend/src/routes/products.routes.js's ALL_CATEGORIES/ALL_BRANDS
// exactly — kept in sync by hand, same as blogPosts.js's BLOG_SLUGS mirror in
// sitemap.routes.js, since the frontend and backend are separate deployable
// packages with no shared import between them. Used to resolve a URL slug
// (e.g. "charging-port") back to the real, correctly-cased name the
// backend's `category`/`brand` filter actually expects.
import { slugify } from './slug.js';

export const ALL_CATEGORIES = [
  'Display', 'OLED', 'LCD', 'Touch', 'Battery', 'Back Glass', 'Housing', 'Frame',
  'Camera', 'Charging Port', 'Speaker', 'Microphone', 'Flex', 'Logic Board',
  'Motherboard', 'IC', 'CPU', 'Buttons', 'SIM Tray', 'Fingerprint', 'Face ID',
  'Repair Tools', 'Accessories',
];

export const ALL_BRANDS = [
  'Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola',
  'Sony', 'Huawei', 'Honor', 'Nothing', 'iQOO', 'POCO', 'Infinix', 'Tecno', 'Nokia', 'Walton', 'Symphony',
];

export function categoryUrl(name) {
  return `/category/${slugify(name)}`;
}

export function brandUrl(name) {
  return `/brand/${slugify(name)}`;
}

export function brandCategoryUrl(brandName, categoryName) {
  return `/brand/${slugify(brandName)}/${slugify(categoryName)}`;
}

export function categoryFromSlug(slug) {
  return ALL_CATEGORIES.find((c) => slugify(c) === slug) || null;
}

export function brandFromSlug(slug) {
  return ALL_BRANDS.find((b) => slugify(b) === slug) || null;
}
