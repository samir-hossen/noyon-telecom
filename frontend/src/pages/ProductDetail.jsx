import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';
import { trackViewItem, trackRequestQuote } from '../ecommerce.js';

const RECENTLY_VIEWED_KEY = 'nt-recently-viewed';
const RECENTLY_VIEWED_MAX = 8;

function readRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecentlyViewed(id) {
  try {
    const list = readRecentlyViewed().filter((x) => x !== id);
    list.unshift(id);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list.slice(0, RECENTLY_VIEWED_MAX)));
  } catch {
    // localStorage unavailable — recently-viewed just won't persist, harmless.
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewPhotos, setReviewPhotos] = useState([]); // File objects staged for upload
  const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState([]); // matching object URLs
  const [lightboxImg, setLightboxImg] = useState(null);
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState('1'); // lets someone type a quantity directly, e.g. 10 or 20
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const { addToCart } = useCart();
  const { ids, toggle } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    let current = true;
    setAdded(false);
    setProduct(null);
    setLoadError('');
    setQty(1);
    setActiveImg(0);
    window.scrollTo(0, 0);
    // Previously had no .catch — a failed fetch (dropped connection, product
    // just deleted, backend hiccup) left the page stuck on the skeleton
    // loader forever with no way out. Now it surfaces a real error instead.
    // The `current` guard stops an earlier, slower request (e.g. clicking
    // through two related products quickly) from overwriting the page with
    // stale data if it resolves after the latest request already has.
    api.get(`/products/${id}`)
      .then((d) => { if (current) setProduct(d.product); })
      .catch((err) => { if (current) setLoadError(err.message); });
    return () => { current = false; };
  }, [id]);

  // Object URLs (used for the "add photos" preview thumbnails) are only
  // valid for this tab's lifetime. A ref (rather than depending on
  // reviewPhotoPreviews directly) means this only revokes on unmount —
  // depending on the array itself would fire on every add/remove and
  // revoke URLs for photos still meant to be visible.
  const reviewPhotoPreviewsRef = useRef(reviewPhotoPreviews);
  reviewPhotoPreviewsRef.current = reviewPhotoPreviews;
  useEffect(() => {
    return () => reviewPhotoPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setQtyText(String(qty));
  }, [qty]);

  useEffect(() => {
    if (!product) return;
    // Clamp to stock too, not just MOQ — the +/- buttons and the qty input
    // both already do this (lines below); without it here, a product whose
    // stock has dropped below its own MOQ (e.g. moq 10, stock 5) loads with
    // an unorderable default qty and a still-enabled Add to Cart button.
    setQty(Math.max(1, Math.min(product.stock, product.moq || 1)));
    pushRecentlyViewed(product.id);
    trackViewItem(product);
    // Only need ~4 related items, not the whole category — this used to
    // request limit=200 (the endpoint's max) just to throw away all but 4
    // rows client-side. At 10k+ products a category can easily hold
    // hundreds of rows, so that was needlessly shipping and discarding a
    // couple hundred full product records on every product-detail view.
    api.get(`/products?category=${encodeURIComponent(product.category)}&limit=8`).then((d) => {
      setRelated(d.products.filter((p) => p.id !== product.id).slice(0, 4));
    });
    api.get(`/products/${product.id}/reviews`).then((d) => setReviews(d.reviews));

    const viewedIds = readRecentlyViewed().filter((x) => x !== product.id);
    if (viewedIds.length > 0) {
      Promise.all(viewedIds.slice(0, 4).map((vid) => api.get(`/products/${vid}`).then((d) => d.product).catch(() => null)))
        .then((list) => setRecentlyViewed(list.filter(Boolean)));
    } else {
      setRecentlyViewed([]);
    }
  }, [product]);

  usePageMeta(
    product?.name,
    product ? `${product.name} — ${product.desc ? product.desc.slice(0, 140) : t('pd.metaFallback', null, { category: product.category })}` : undefined,
    // Only pass a real image URL — resolveImg() falls back to an inline SVG
    // data: URI when a product has no photo yet (see utils/fallbackImage.js),
    // which is exactly right for an <img> tag but wrong here: Facebook/
    // WhatsApp/Twitter link previews fetch og:image over HTTP(S) and can't
    // render a data: URI, so a photo-less product would share with a
    // broken preview image. Passing undefined instead leaves usePageMeta's
    // default (the site-wide og:image set in index.html) in place, which is
    // a real, fetchable image — a better fallback than a broken one.
    product && product.img ? resolveImg(product.img) : undefined,
    product ? `/product/${product.id}` : undefined,
    product
      ? [
          {
            id: 'product',
            data: {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.desc,
              image: (product.images || [product.img]).map((img) => resolveImg(img)),
              sku: product.sku || undefined,
              mpn: product.sku || undefined,
              brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
              offers: {
                '@type': 'Offer',
                priceCurrency: 'BDT',
                price: product.price,
                availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                url: `${window.location.origin}/product/${product.id}`,
              },
              ...(product.reviewCount > 0
                ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } }
                : {}),
            },
          },
          {
            id: 'breadcrumb',
            data: {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
                { '@type': 'ListItem', position: 2, name: 'Shop', item: `${window.location.origin}/shop` },
                { '@type': 'ListItem', position: 3, name: product.category, item: `${window.location.origin}/shop?category=${encodeURIComponent(product.category)}` },
                { '@type': 'ListItem', position: 4, name: product.name, item: `${window.location.origin}/product/${product.id}` },
              ],
            },
          },
        ]
      : undefined
  );

  if (loadError) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>{t('pd.cantLoad')}</h3>
          <p style={{ marginBottom: 24 }}>{loadError}</p>
          <Link to="/shop" className="btn btn-primary">{t('checkout.backToShop')}</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="pd-grid">
          <div>
            <div className="pd-img">
              <div className="skeleton-block" style={{ width: '100%', aspectRatio: '1 / 1' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-block" style={{ width: 56, height: 56 }} />
              ))}
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            <div className="skeleton-line" style={{ width: '30%' }} />
            <div className="skeleton-line" style={{ width: '75%', height: 28, margin: '10px 0' }} />
            <div className="skeleton-line" style={{ width: '20%' }} />
            <div className="skeleton-line" style={{ width: '95%', marginTop: 20 }} />
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-block" style={{ width: 160, height: 44, marginTop: 24 }} />
          </div>
        </div>
      </div>
    );
  }

  const onSale = product.compareAt && product.compareAt > product.price;

  async function handleAdd() {
    try {
      await addToCart(product.id, qty);
      setAdded(true);
      showToast(t('shop.addedToCart'), 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleAddRelated(productId) {
    try {
      await addToCart(productId, 1);
      showToast(t('shop.addedToCart'), 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function handleWishlist() {
    if (!user) return navigate('/login');
    try {
      const nowSaved = await toggle(product.id, product);
      showToast(nowSaved ? t('card.savedToWishlist') : t('card.removedFromWishlist'), 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  const REVIEW_PHOTO_LIMIT = 4;
  const REVIEW_PHOTO_MAX_MB = 5;

  function handleReviewPhotoChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file later
    if (!files.length) return;

    setReviewError('');
    const room = REVIEW_PHOTO_LIMIT - reviewPhotos.length;
    if (room <= 0) {
      setReviewError(t('pd.photoLimitError', null, { limit: REVIEW_PHOTO_LIMIT }));
      return;
    }
    const accepted = [];
    for (const f of files) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
        setReviewError(t('pd.photoTypeError'));
        continue;
      }
      if (f.size > REVIEW_PHOTO_MAX_MB * 1024 * 1024) {
        setReviewError(t('pd.photoSizeError', null, { mb: REVIEW_PHOTO_MAX_MB }));
        continue;
      }
      accepted.push(f);
      if (accepted.length >= room) break;
    }
    if (!accepted.length) return;
    setReviewPhotos((prev) => [...prev, ...accepted]);
    setReviewPhotoPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
  }

  function removeReviewPhoto(index) {
    URL.revokeObjectURL(reviewPhotoPreviews[index]);
    setReviewPhotos((prev) => prev.filter((_, i) => i !== index));
    setReviewPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    setReviewError('');
    if (!user) return navigate('/login');
    setReviewBusy(true);
    try {
      let imageUrls = [];
      if (reviewPhotos.length) {
        const uploaded = await api.uploadMultiple('/products/reviews/upload-images', reviewPhotos);
        imageUrls = uploaded.urls;
      }
      const data = await api.post(`/products/${product.id}/reviews`, { ...reviewForm, images: imageUrls });
      setReviews((r) => [data.review, ...r]);
      setProduct((p) => ({ ...p, rating: data.product.rating, reviewCount: data.product.reviewCount }));
      setReviewForm({ rating: 5, comment: '' });
      reviewPhotoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setReviewPhotos([]);
      setReviewPhotoPreviews([]);
      showToast(t('pd.reviewThanks'), 'success');
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewBusy(false);
    }
  }

  const saved = ids?.has(product.id);
  const gallery = Array.isArray(product.images) && product.images.length ? product.images : [product.img];
  const categories = Array.isArray(product.categories) && product.categories.length ? product.categories : [product.category];

  return (
    <div className="container">
      <nav className="breadcrumb-trail" aria-label="Breadcrumb">
        <Link to="/">{t('pd.breadcrumbHome')}</Link> <span>/</span>{' '}
        <Link to="/shop">{t('pd.breadcrumbShop')}</Link> <span>/</span>{' '}
        <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> <span>/</span>{' '}
        <span aria-current="page">{product.name}</span>
      </nav>
      <div className="pd-grid">
        <div>
          <div className="pd-img">
            <img
              src={resolveImg(gallery[activeImg] || gallery[0])}
              alt={product.name}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
            />
          </div>
          {gallery.length > 1 && (
            <div className="pd-thumb-row">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={t('pd.viewImage', null, { n: i + 1 })}
                  className={`pd-thumb ${i === activeImg ? 'active' : ''}`}
                >
                  <img
                    src={resolveImg(img)}
                    alt={`${product.name} thumbnail ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map((c) => (
              <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`} className="pd-cat" style={{ textDecoration: 'none' }}>
                {c}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h1 className="pd-title">{product.name}</h1>
            <button
              className={`wishlist-heart-lg ${saved ? 'active' : ''}`}
              onClick={handleWishlist}
              aria-label={saved ? t('card.removeFromWishlist') : t('card.addToWishlist')}
            >
              {saved ? '♥' : '♡'}
            </button>
          </div>
          {product.reviewCount > 0 && (
            <div className="pd-rating-summary">
              ★ {product.rating} <span>· {t(product.reviewCount !== 1 ? 'pd.reviewCountPlural' : 'pd.reviewCount', null, { count: product.reviewCount })}</span>
            </div>
          )}

          <div className="pd-price">
            <span className="now">{formatPrice(product.price)}</span>
            {(onSale || (product.retailPrice && product.retailPrice > product.price)) && (
              <span className="was">{formatPrice(product.retailPrice || product.compareAt)}</span>
            )}
            {user?.role === 'dealer' && user?.dealerStatus === 'approved' && (
              <span className="pd-dealer-badge">{t('product.dealerPrice')}</span>
            )}
          </div>
          {user?.role !== 'dealer' && (
            <p className="pd-dealer-hint">
              <Link to="/register">{t('nav.becomeDealer')}</Link> {t('pd.dealerHintPost')}
            </p>
          )}

          <div className="pd-specs">
            {product.sku && <div><span>{t('product.sku')}</span><strong>{product.sku}</strong></div>}
            {product.brand && <div><span>{t('pd.brand')}</span><strong>{product.brand}</strong></div>}
            <div><span>{t('product.moq')}</span><strong>{product.moq || 1} {(product.moq || 1) !== 1 ? t('pd.units') : t('pd.unit')}</strong></div>
            {product.warranty && <div><span>{t('product.warranty')}</span><strong>{product.warranty}</strong></div>}
          </div>

          {product.compatibleModels?.length > 0 && (
            <div className="pd-compat">
              <span className="pd-compat-label">{t('product.compatibility')}</span>
              <div className="pd-compat-tags">
                {product.compatibleModels.map((m) => (
                  <span key={m} className="pd-compat-tag">{m}</span>
                ))}
              </div>
            </div>
          )}

          {product.bulkPricing?.length > 0 && (
            <div className="pd-bulk-pricing">
              <span className="pd-compat-label">{t('product.bulkPricing')}</span>
              <table>
                <thead>
                  <tr><th>{t('pd.quantityHeader')}</th><th>{t('pd.pricePerUnitHeader')}</th></tr>
                </thead>
                <tbody>
                  <tr><td>{product.moq || 1}+</td><td>{formatPrice(product.price)}</td></tr>
                  {product.bulkPricing.map((tier) => (
                    <tr key={tier.minQty}><td>{tier.minQty}+</td><td>{formatPrice(tier.price)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="pd-desc">{product.desc}</p>

          <div className="pd-qty">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('pd.quantityLabel', null, { moq: product.moq || 1 })}</span>
            <div className="qty-control">
              <button onClick={() => setQty((q) => Math.max(product.moq || 1, q - 1))}>−</button>
              <input
                type="number"
                min={product.moq || 1}
                max={product.stock}
                inputMode="numeric"
                value={qtyText}
                onChange={(e) => setQtyText(e.target.value)}
                onBlur={() => {
                  const n = parseInt(qtyText, 10);
                  const min = product.moq || 1;
                  const max = product.stock;
                  if (Number.isFinite(n)) setQty(Math.min(max, Math.max(min, n)));
                  else setQty(min);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                }}
              />
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
            </div>
          </div>

          <p className="pd-stock">{product.stock > 0 ? t('pd.inStockNote', null, { stock: product.stock }) : t('product.outOfStock')}</p>

          <button className="btn btn-berry btn-block" disabled={product.stock === 0} onClick={handleAdd}>
            {added ? t('pd.addedToCart') : t('product.addToCart')}
          </button>
          {added && (
            <p style={{ marginTop: 14, fontSize: '0.88rem' }}>
              <Link to="/cart" style={{ fontWeight: 600, color: 'var(--berry)' }}>{t('pd.viewCart')}</Link>
            </p>
          )}

          <div className="pd-action-row">
            <a
              className="btn btn-outline pd-whatsapp-btn"
              href={`https://wa.me/8801560047377?text=${encodeURIComponent(`${t('pd.whatsappMessage', null, { name: product.name })}${product.sku ? ` (SKU: ${product.sku})` : ''}`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackRequestQuote(product)}
            >
              💬 {t('product.whatsappOrder')}
            </a>
            <Link
              className="btn btn-outline"
              to={`/request-quote?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}${product.sku ? `&sku=${encodeURIComponent(product.sku)}` : ''}&qty=${product.moq || 1}`}
            >
              📋 {t('product.requestQuote')}
            </Link>
          </div>

          <div className="pd-meta">
            <div>{t('pd.wholesaleAvailable')}</div>
            <div>{product.warranty || t('pd.warrantyVaries')}</div>
            <div>{t('pd.bulkOrderNote')}</div>
          </div>
        </div>
      </div>

      <section className="section" style={{ borderTop: '1px solid var(--line)', maxWidth: 700 }}>
        <h2 className="section-title" style={{ marginBottom: 24 }}>
          {t('pd.customerReviewsTop')} <em>{t('pd.customerReviewsEm')}</em>
        </h2>

        {user ? (
          <form onSubmit={handleReviewSubmit} className="review-form">
            {reviewError && <div className="form-error">{reviewError}</div>}
            <div className="field">
              <label>{t('pd.yourRating')}</label>
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={n <= reviewForm.rating ? 'active' : ''}
                    onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>{t('pd.yourReview')}</label>
              <textarea
                required
                rows={3}
                placeholder={t('pd.reviewPlaceholder')}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('pd.addPhotosOptional')}</label>
              <div className="review-photo-row">
                {reviewPhotoPreviews.map((src, i) => (
                  <div className="review-photo-thumb" key={src}>
                    <img src={src} alt={`Attached photo ${i + 1}`} />
                    <button type="button" onClick={() => removeReviewPhoto(i)} aria-label={t('pd.removePhoto')}>✕</button>
                  </div>
                ))}
                {reviewPhotos.length < REVIEW_PHOTO_LIMIT && (
                  <label className="review-photo-add">
                    +
                    <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleReviewPhotoChange} />
                  </label>
                )}
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                {t('pd.photoLimitNote', null, { limit: REVIEW_PHOTO_LIMIT, mb: REVIEW_PHOTO_MAX_MB })}
              </span>
            </div>
            <button className="btn btn-primary" disabled={reviewBusy}>
              {reviewBusy ? t('pd.submittingReview') : t('pd.submitReview')}
            </button>
          </form>
        ) : (
          <p style={{ marginBottom: 24, fontSize: '0.9rem' }}>
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--berry)' }}>{t('nav.signIn')}</Link> {t('pd.signInToReviewPost')}
          </p>
        )}

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t('pd.noReviewsYet')}</p>
        ) : (
          <div style={{ marginTop: 20 }}>
            {reviews.map((r) => (
              <div className="review-item" key={r.id}>
                <div className="review-item-head">
                  <strong>{r.userName}</strong>
                  <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p>{r.comment}</p>
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="review-photo-row" style={{ marginBottom: 8 }}>
                    {r.images.map((src, i) => (
                      <button
                        type="button"
                        key={src}
                        className="review-photo-view"
                        onClick={() => setLightboxImg(resolveImg(src))}
                        aria-label={`View photo ${i + 1} from ${r.userName}`}
                      >
                        <img src={resolveImg(src)} alt="" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
                      </button>
                    ))}
                  </div>
                )}
                <span className="review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {lightboxImg && (
        <div className="review-lightbox" onClick={() => setLightboxImg(null)} role="dialog" aria-modal="true">
          <img src={lightboxImg} alt="Customer review photo, full size" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
          <button type="button" className="review-lightbox-close" onClick={() => setLightboxImg(null)} aria-label="Close">✕</button>
        </div>
      )}

      {related.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="section-head">
            <h2 className="section-title">
              {t('pd.mayAlsoLikeTop')} <em>{t('pd.mayAlsoLikeEm')}</em>
            </h2>
            <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="section-link">
              {t('pd.viewAllInCategory', null, { category: product.category })}
            </Link>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAddRelated} />
            ))}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="section-head">
            <h2 className="section-title">{t('product.recentlyViewed')}</h2>
          </div>
          <div className="grid">
            {recentlyViewed.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAddRelated} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
