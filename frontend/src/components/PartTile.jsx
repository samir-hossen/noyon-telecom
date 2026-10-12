import { splitProductName, placeholderPhoto } from '../utils/partPhoto';

// Shown instead of a photo until the owner adds one: a real photo of the part
// (that phone model's own where we have one, see utils/partPhoto.js) with
// the brand, the model and the part, so the tile still says exactly which
// product it is. The owner's own photos replace it as soon as they're uploaded.
export default function PartTile({ product, large = false }) {
  // On a product card the name is printed right under the image, so the
  // card shows just the photo; the product page adds the model under it.
  if (!large) {
    return (
      <div className="part-tile">
        <img className="part-tile-photo" src={placeholderPhoto(product)} alt={product?.name || ''} width="480" height="480" loading="lazy" decoding="async" />
      </div>
    );
  }
  const { brand, model, part } = splitProductName(product);
  return (
    <div className="part-tile part-tile-lg" role="img" aria-label={product?.name}>
      <img className="part-tile-photo" src={placeholderPhoto(product, { small: false })} alt="" width="900" height="900" decoding="async" />
      {brand && <span className="part-tile-brand">{brand}</span>}
      <span className="part-tile-model">{model}</span>
      <span className="part-tile-part">{part}</span>
    </div>
  );
}
