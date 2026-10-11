import { slugify } from '../utils/slug';

// Shown instead of a photo until the owner adds one: a clean tile with the
// part's icon, the brand, the model and the part — not "photo coming soon"
// on thousands of products. Real photos (the owner's own, or supplier photos
// they're allowed to use) replace it as soon as they're uploaded.
const PART_LABELS = [
  'Motherboard Flex Cable', 'Charging Flex Cable', 'Display Upper Glass', 'Upper Glass', 'Back Glass', 'Back Camera',
  'Front Camera', 'Camera Glass', 'Charging Port', 'SIM Tray', 'Loudspeaker', 'Ear Speaker', 'Flex Cable',
  'Middle Frame', 'Logic Board', 'Display',
];
const ICONS = new Set(['display', 'upper-glass', 'back-glass', 'camera', 'charging-port', 'sim-tray', 'speaker', 'flex', 'frame', 'logic-board']);
// Parts that look different from the rest of their category.
const ICON_BY_PART = { 'Front Camera': 'front-camera', 'Camera Glass': 'camera-glass', 'Ear Speaker': 'ear-speaker' };

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
  const icon = ICON_BY_PART[part] || (ICONS.has(slug) ? slug : 'default');
  return (
    <div className={`part-tile${large ? ' part-tile-lg' : ''}`} role="img" aria-label={product?.name}>
      <span className="part-tile-icon" style={{ backgroundImage: `url(/images/parts/${icon}.svg)` }} aria-hidden="true" />
      {brand && <span className="part-tile-brand">{brand}</span>}
      <span className="part-tile-model">{model}</span>
      <span className="part-tile-part">{part}</span>
    </div>
  );
}
