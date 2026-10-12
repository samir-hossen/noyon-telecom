import { slugify } from '../utils/slug';

// Shown instead of a photo until the owner adds one: a real photo of the
// part type (public/images/parts/photos/*.webp — free-licence photos, see
// /photo-credits) with the brand, the model and the part, so the tile still
// says exactly which product it is. The owner's own photos replace it as
// soon as they're uploaded.
const PART_LABELS = [
  'Motherboard Flex Cable', 'Charging Flex Cable', 'Display Upper Glass', 'Upper Glass', 'Back Glass', 'Back Camera',
  'Front Camera', 'Camera Glass', 'Charging Port', 'SIM Tray', 'Loudspeaker', 'Ear Speaker', 'Flex Cable',
  'Middle Frame', 'Logic Board', 'Display',
];
const PHOTOS = new Set(['display', 'back-glass', 'camera', 'charging-port', 'sim-tray', 'speaker', 'flex', 'frame', 'logic-board']);
// Parts that look different from the rest of their category.
const PHOTO_BY_PART = { 'Front Camera': 'front-camera', 'Ear Speaker': 'ear-speaker' };

// "Samsung Galaxy A15 Display" (brand Samsung) -> { brand, model: "Galaxy A15", part: "Display" }
export function splitProductName(product) {
  const name = String(product?.name || '').trim();
  const brand = String(product?.brand || '').trim();
  let model = brand && name.toLowerCase().startsWith(`${brand.toLowerCase()} `) ? name.slice(brand.length + 1) : name;
  const part = PART_LABELS.find((l) => model.toLowerCase().endsWith(` ${l.toLowerCase()}`));
  if (part) model = model.slice(0, model.length - part.length - 1);
  return { brand, model: model || name, part: part || product?.category || '' };
}

export default function PartTile({ product, large = false }) {
  const { brand, model, part } = splitProductName(product);
  const slug = slugify(product?.category || '');
  const photo = PHOTO_BY_PART[part] || (PHOTOS.has(slug) ? slug : 'default');
  // On a product card the name is printed right under the image, so the
  // card shows just the photo; the product page adds the model under it.
  if (!large) {
    return (
      <div className="part-tile">
        <img className="part-tile-photo" src={`/images/parts/photos/${photo}-sm.webp`} alt={product?.name || ''} width="480" height="480" loading="lazy" decoding="async" />
      </div>
    );
  }
  return (
    <div className="part-tile part-tile-lg" role="img" aria-label={product?.name}>
      <img className="part-tile-photo" src={`/images/parts/photos/${photo}.webp`} alt="" width="900" height="900" decoding="async" />
      {brand && <span className="part-tile-brand">{brand}</span>}
      <span className="part-tile-model">{model}</span>
      <span className="part-tile-part">{part}</span>
    </div>
  );
}
