import { slugify } from './slug';
import { MODEL_PHOTOS } from '../content/modelPhotos';

// The photo a product shows until the owner uploads its own: a real photo of
// that exact phone model's part where we have one (public/images/models/,
// e.g. each iPhone's back), otherwise a real photo of the part type
// (public/images/parts/photos/). All credited on /photo-credits.
export const PART_LABELS = [
  'Motherboard Flex Cable', 'Charging Flex Cable', 'Display Upper Glass', 'Upper Glass', 'Back Glass', 'Back Camera',
  'Front Camera', 'Camera Glass', 'Charging Port', 'SIM Tray', 'Loudspeaker', 'Ear Speaker', 'Flex Cable',
  'Middle Frame', 'Logic Board', 'Display',
];
const PHOTOS = new Set(['display', 'back-glass', 'camera', 'charging-port', 'sim-tray', 'speaker', 'flex', 'frame', 'logic-board']);
// The photo for the part word a product's name ends with, so every product
// shows its own kind of part; the category is only the fallback.
const PHOTO_BY_PART = {
  Display: 'display', 'Back Glass': 'back-glass', 'Back Camera': 'camera', 'Front Camera': 'front-camera',
  'Charging Port': 'charging-port', 'Charging Flex Cable': 'charging-port', 'SIM Tray': 'sim-tray',
  Loudspeaker: 'speaker', 'Ear Speaker': 'ear-speaker', 'Motherboard Flex Cable': 'flex', 'Flex Cable': 'flex',
  'Middle Frame': 'frame', 'Logic Board': 'logic-board',
};

// "Samsung Galaxy A15 Display" (brand Samsung) -> { brand, model: "Galaxy A15", part: "Display" }
export function splitProductName(product) {
  const name = String(product?.name || '').trim();
  const brand = String(product?.brand || '').trim();
  let model = brand && name.toLowerCase().startsWith(`${brand.toLowerCase()} `) ? name.slice(brand.length + 1) : name;
  const part = PART_LABELS.find((l) => model.toLowerCase().endsWith(` ${l.toLowerCase()}`));
  if (part) model = model.slice(0, model.length - part.length - 1);
  return { brand, model: model || name, part: part || product?.category || '' };
}

export function placeholderPhoto(product, { small = true } = {}) {
  const size = small ? '-sm' : '';
  const model = MODEL_PHOTOS[product?.slug];
  if (model) return `/images/models/${model}-back${size}.webp`;
  const { part } = splitProductName(product);
  const slug = slugify(product?.category || '');
  return `/images/parts/photos/${PHOTO_BY_PART[part] || (PHOTOS.has(slug) ? slug : 'default')}${size}.webp`;
}
