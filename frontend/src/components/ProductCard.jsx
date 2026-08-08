import { Link, useNavigate } from 'react-router-dom';
import { resolveImg } from '../api';
import { formatPrice } from '../utils/currency';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FALLBACK_IMG } from '../utils/fallbackImage';

export default function ProductCard({ product, onAdd }) {
  const { user } = useAuth();
  const isApprovedDealer = user?.role === 'dealer' && user?.dealerStatus === 'approved';
  // Backend returns `retailPrice` (MRP) alongside a viewer-aware `price` —
  // for approved dealers that's their wholesale rate, which is lower than
  // retail. Show it as savings so dealers see their pricing edge on every
  // card, not just after clicking into a product.
  const dealerSaving = isApprovedDealer && product.retailPrice && product.retailPrice > product.price;
  const onSale = !dealerSaving && product.compareAt && product.compareAt > product.price;
  const outOfStock = product.stock === 0;
  // Some catalog rows come through with no price set yet (import in
  // progress, not published for retail, etc). Rather than show a
  // confusing "৳0" and a live "Add to cart" button, treat it like an
  // unavailable item with a clear "contact us" affordance.
  const priceUnavailable = !product.price || product.price <= 0;
  const unorderable = outOfStock || priceUnavailable;
  const { ids, toggle } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const saved = ids?.has(product.id);

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to save items', 'error');
      navigate('/login');
      return;
    }
    const nowSaved = await toggle(product.id, product);
    showToast(nowSaved ? 'Saved to wishlist' : 'Removed from wishlist', 'success');
  }

  return (
    <div className="card">
      <Link to={`/product/${product.id}`}>
        <div className="card-img">
          {outOfStock ? (
            <span className="card-tag" style={{ background: 'var(--muted)' }}>Sold out</span>
          ) : priceUnavailable ? (
            <span className="card-tag" style={{ background: 'var(--muted)' }}>Contact for price</span>
          ) : dealerSaving ? (
            <span className="card-tag" style={{ background: 'var(--ink)' }}>Dealer price</span>
          ) : (
            onSale && <span className="card-tag">Sale</span>
          )}
          <button
            className={`wishlist-heart ${saved ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {saved ? '♥' : '♡'}
          </button>
          <img src={resolveImg(product.img)} alt={product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }} />
        </div>
      </Link>
      <div className="card-body">
        <span className="card-cat">{product.category}</span>
        <Link to={`/product/${product.id}`}>
          <h3 className="card-name">{product.name}</h3>
        </Link>
        {product.reviewCount > 0 && (
          <div className="card-rating">★ {product.rating} <span>({product.reviewCount})</span></div>
        )}
        <div className="card-price">
          {priceUnavailable ? (
            <span className="now" style={{ color: 'var(--muted)', fontSize: '0.94rem' }}>Price on request</span>
          ) : (
            <>
              <span className="now">{formatPrice(product.price)}</span>
              {onSale && <span className="was">{formatPrice(product.compareAt)}</span>}
              {dealerSaving && <span className="was">{formatPrice(product.retailPrice)}</span>}
            </>
          )}
        </div>
        <button className="card-cta" onClick={() => onAdd(product.id)} disabled={unorderable} style={unorderable ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
          {outOfStock ? 'Sold out' : priceUnavailable ? 'Unavailable' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
}
