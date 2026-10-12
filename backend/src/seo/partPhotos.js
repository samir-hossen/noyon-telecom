// Representative photo of a part type, for products without their own photo
// (the storefront's public/images/parts/: photos/*.webp on the page,
// og/*.jpg for link previews). Never used in JSON-LD or the Merchant feed —
// those only get a product's real photos.
const PHOTOS = new Set(['display', 'back-glass', 'camera', 'charging-port', 'sim-tray', 'speaker', 'flex', 'frame', 'logic-board']);

export function partPhotoSlug(category, name = '') {
  if (/\bfront camera$/i.test(name)) return 'front-camera';
  if (/\bear speaker$/i.test(name)) return 'ear-speaker';
  const slug = String(category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return PHOTOS.has(slug) ? slug : 'default';
}

export const partPhotoPath = (category, name) => `/images/parts/photos/${partPhotoSlug(category, name)}.webp`;
export const partPreviewPath = (category, name) => `/images/parts/og/${partPhotoSlug(category, name)}.jpg`;
