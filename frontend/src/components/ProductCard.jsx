import { Link, useNavigate } from 'react-router-dom';
import { productImg } from '../api';
import { formatPrice } from '../utils/currency';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { useLanguage } from '../context/LanguageContext';
import { productUrl } from '../utils/slug';
import { trackWhatsappClick } from '../ecommerce.js';
import { hasPublicPrice, priceRequestLink, stockRequestLink, quoteRequestPath } from '../utils/whatsapp';
import { hasQualityOptions, priceRange } from '../utils/quality';
import PartTile from './PartTile.jsx';

export default function ProductCard({ product, onAdd }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isApprovedDealer = user?.role === 'dealer' && user?.dealerStatus === 'approved';
  // Backend returns `retailPrice` (MRP) alongside a viewer-aware `price` —
  // for approved dealers that's their wholesale rate, which is lower than
  // retail. Show it as savings so dealers see their pricing edge on every
  // card, not just after clicking into a product.
  const dealerSaving = isApprovedDealer && product.retailPrice && product.retailPrice > product.price;
  const onSale = !dealerSaving && product.compareAt && product.compareAt > product.price;
  const outOfStock = product.stock === 0;
  // The API sends price: null until the owner publishes a price (hidden
  // draft price policy). Such a card never shows "৳0" or "Sold out" and has
  // no add-to-cart: it offers "দাম জানতে WhatsApp করুন" + "কোটেশন চান".
  const priceUnavailable = !hasPublicPrice(product);
  const unorderable = outOfStock || priceUnavailable;
  // Sold in several grades (High Quality / Original …): the card shows the
  // range and opens the product page to pick one.
  const graded = !priceUnavailable && hasQualityOptions(product);
  const range = graded ? priceRange(product) : null;
  const { ids, toggle } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const saved = ids?.has(product.id);
  // A card that can't be added to the cart (no price yet, or sold out)
  // sends the shopper straight to a WhatsApp chat about this exact part,
  // with the owner's pre-filled message.
  const whatsappHref = priceUnavailable ? priceRequestLink(product) : outOfStock ? stockRequestLink(product) : null;

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast(t('card.signInToSave'), 'error');
      navigate('/login');
      return;
    }
    try {
      const nowSaved = await toggle(product.id, product);
      showToast(nowSaved ? t('card.savedToWishlist') : t('card.removedFromWishlist'), 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <div className="card">
      <Link to={productUrl(product)}>
        <div className="card-img">
          {/* Stock 0 means "ask us" (stock isn't tracked for most of the
              catalog), so no "Sold out" tag — the WhatsApp button asks. */}
          {priceUnavailable || outOfStock ? null : dealerSaving ? (
            <span className="card-tag" style={{ background: 'var(--ink)' }}>{t('product.dealerPrice')}</span>
          ) : (
            onSale && <span className="card-tag">{t('card.sale')}</span>
          )}
          <button
            className={`wishlist-heart ${saved ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label={saved ? t('card.removeFromWishlist') : t('card.addToWishlist')}
          >
            {saved ? '♥' : '♡'}
          </button>
          {product.img ? (
            <img src={productImg(product, 400)} alt={product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
          ) : (
            <PartTile product={product} />
          )}
        </div>
      </Link>
      <div className="card-body">
        <span className="card-cat">{product.category}</span>
        <Link to={productUrl(product)}>
          <h3 className="card-name">{product.name}</h3>
        </Link>
        {product.reviewCount > 0 && (
          <div className="card-rating">★ {product.rating} <span>({product.reviewCount})</span></div>
        )}
        {!priceUnavailable && (
          <div className="card-price">
            {range ? (
              <span className="now">{formatPrice(range.min)} – {formatPrice(range.max)}</span>
            ) : (
              <>
                <span className="now">{formatPrice(product.price)}</span>
                {onSale && <span className="was">{formatPrice(product.compareAt)}</span>}
                {dealerSaving && <span className="was">{formatPrice(product.retailPrice)}</span>}
              </>
            )}
          </div>
        )}
        {graded ? (
          <Link className="card-cta" to={productUrl(product)}>{t('card.viewQualities')}</Link>
        ) : unorderable ? (
          <a
            className={`card-cta card-cta-whatsapp${priceUnavailable ? ' card-cta-push' : ''}`}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsappClick('product_card')}
            aria-label={`${priceUnavailable ? t('card.askPrice') : t('card.askStock')} — WhatsApp`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" /></svg>
            {priceUnavailable ? t('card.askPrice') : t('card.askStock')}
          </a>
        ) : (
          <button className="card-cta" onClick={() => onAdd(product.id)}>
            {t('product.addToCart')}
          </button>
        )}
        {priceUnavailable && (
          <Link className="card-quote-link" to={quoteRequestPath(product)}>{t('product.requestQuote')}</Link>
        )}
      </div>
    </div>
  );
}
