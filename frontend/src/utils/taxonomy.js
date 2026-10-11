// Mirrors backend/src/routes/products.routes.js's ALL_CATEGORIES/ALL_BRANDS
// exactly — kept in sync by hand, same as blogPosts.js's BLOG_SLUGS mirror in
// sitemap.routes.js, since the frontend and backend are separate deployable
// packages with no shared import between them. Used to resolve a URL slug
// (e.g. "charging-port") back to the real, correctly-cased name the
// backend's `category`/`brand` filter actually expects.
import { slugify } from './slug.js';

export const ALL_CATEGORIES = [
  'Display', 'OLED', 'LCD', 'Touch', 'Upper Glass', 'Battery', 'Back Glass', 'Housing', 'Frame',
  'Camera', 'Charging Port', 'Speaker', 'Microphone', 'Flex', 'Logic Board',
  'Motherboard', 'IC', 'CPU', 'Buttons', 'SIM Tray', 'Fingerprint', 'Face ID',
  'Repair Tools', 'Accessories',
];

export const ALL_BRANDS = [
  'Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola',
  'Sony', 'Huawei', 'Honor', 'Nothing', 'iQOO', 'POCO', 'Infinix', 'Tecno', 'Nokia', 'Walton', 'Symphony',
  'Itel', 'HTC', 'Asus', 'BlackBerry', 'LG',
];

// Brands shown in the menus, home strip and part finder — the ones the
// catalog actually has products for, most-asked first.
export const MENU_BRANDS = [
  'Samsung', 'Xiaomi', 'Vivo', 'Oppo', 'Realme', 'Infinix', 'Tecno', 'Itel', 'Apple', 'Huawei', 'Honor',
  'OnePlus', 'Motorola', 'Nokia', 'Google Pixel', 'Sony', 'Asus', 'HTC', 'Nothing', 'BlackBerry', 'LG',
];

// Mirrors backend/src/config/catalog.js: categories switched off store-wide
// (owner's decision, Oct 2026: the battery section is OFF). They're left out
// of every menu, list and filter, and /category/<slug> redirects to /shop.
// Remove a name here (and in the backend) to switch it back on.
export const DISABLED_CATEGORIES = ['Battery'];

export function isDisabledCategory(name) {
  return DISABLED_CATEGORIES.some((c) => c.toLowerCase() === String(name || '').trim().toLowerCase());
}

export const ACTIVE_CATEGORIES = ALL_CATEGORIES.filter((c) => !isDisabledCategory(c));

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
