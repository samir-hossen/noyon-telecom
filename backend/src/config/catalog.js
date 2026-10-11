// Store taxonomy, in one place. Mirrored by hand in
// frontend/src/utils/taxonomy.js (separate deployable packages, no shared
// import) — keep the two in sync.

// Wholesale mobile phone spare-parts categories. Kept as a flat list; the
// storefront mega-menu groups these visually.
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

// Categories switched off store-wide (owner's decisions: the battery section
// is OFF, Oct 2026; "we don't sell glass" — Upper Glass OFF, 12 Oct 2026). Products in them are hidden from every
// customer-facing page, list, feed and sitemap, can't be created or edited
// into them, and /category/<slug> redirects to /shop. Remove a name here
// (and in the frontend mirror) to switch a category back on.
export const DISABLED_CATEGORIES = ['Battery', 'Upper Glass'];

const disabledLower = new Set(DISABLED_CATEGORIES.map((c) => c.toLowerCase()));

export function isDisabledCategory(name) {
  return disabledLower.has(String(name || '').trim().toLowerCase());
}

// The first switched-off category in a product's category list, or null.
export function findDisabledCategory(categories) {
  return (Array.isArray(categories) ? categories : [categories]).find(isDisabledCategory) || null;
}

export const ACTIVE_CATEGORIES = ALL_CATEGORIES.filter((c) => !isDisabledCategory(c));

// Prisma `where` fragment that keeps switched-off categories out of every
// storefront query (`categories` is a JSON array column).
export function notInDisabledCategories() {
  return DISABLED_CATEGORIES.map((c) => ({ NOT: { categories: { array_contains: c } } }));
}

const BANGLA_NAMES = { Battery: 'ব্যাটারি', 'Upper Glass': 'আপার গ্লাস' };

// Bangla admin error (the admin panel shows it as-is).
export function disabledCategoryError(name) {
  const bn = BANGLA_NAMES[name] || name;
  return `${bn} সেকশন এখন বন্ধ — ${bn} ক্যাটাগরিতে প্রোডাক্ট যোগ বা এডিট করা যাবে না। (The ${name} category is switched off.)`;
}

// Lower-cased list for raw SQL (`lower(c) = ANY(...)`).
export const DISABLED_CATEGORIES_LOWER = [...disabledLower];

// Part types the shop doesn't sell inside a category it does sell (owner,
// 12 Oct 2026: "we don't sell glass" — camera glass, under Camera). The
// import doesn't add them and switches existing ones off.
export const DISABLED_PART_LABELS = ['Camera Glass'];

export function isDisabledPartName(name) {
  const n = String(name || '').trim().toLowerCase();
  return DISABLED_PART_LABELS.some((l) => n.endsWith(` ${l.toLowerCase()}`));
}
