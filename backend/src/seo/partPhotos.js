// Representative photo of a part type, for products without their own photo
// (the storefront's public/images/parts/: photos/*.webp on the page,
// og/*.jpg for link previews). Never used in JSON-LD or the Merchant feed —
// those only get a product's real photos.
const PHOTOS = new Set(['display', 'back-glass', 'camera', 'charging-port', 'sim-tray', 'speaker', 'flex', 'frame', 'logic-board']);

// The part word a product's name ends with decides the photo (same table as
// the storefront's PartTile.jsx); the category is only the fallback.
const PHOTO_BY_PART = [
  ['motherboard flex cable', 'flex'], ['charging flex cable', 'charging-port'], ['flex cable', 'flex'],
  ['back glass', 'back-glass'], ['back camera', 'camera'], ['front camera', 'front-camera'],
  ['charging port', 'charging-port'], ['sim tray', 'sim-tray'], ['loudspeaker', 'speaker'], ['ear speaker', 'ear-speaker'],
  ['middle frame', 'frame'], ['logic board', 'logic-board'], ['display', 'display'],
];

export function partPhotoSlug(category, name = '') {
  const lower = String(name || '').trim().toLowerCase();
  const byName = PHOTO_BY_PART.find(([word]) => lower.endsWith(` ${word}`));
  if (byName) return byName[1];
  const slug = String(category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return PHOTOS.has(slug) ? slug : 'default';
}

export const partPhotoPath = (category, name) => `/images/parts/photos/${partPhotoSlug(category, name)}.webp`;
export const partPreviewPath = (category, name) => `/images/parts/og/${partPhotoSlug(category, name)}.jpg`;
