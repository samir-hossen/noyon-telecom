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
import PartTile from '../components/PartTile.jsx';
import { trackViewItem, trackRequestQuote, trackWhatsappClick } from '../ecommerce.js';
import { getPostForCategory } from '../content/blogPosts';
import { productUrl } from '../utils/slug';
import { categoryUrl, brandUrl, brandCategoryUrl, brandFromSlug } from '../utils/taxonomy';
import { slugify } from '../utils/slug';
import { hasPublicPrice, priceRequestLink, stockRequestLink, orderRequestLink, quoteRequestPath, whatsappLink } from '../utils/whatsapp';
import { qualityOptions, priceRange } from '../utils/quality';

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

// A plain slice(0, n) cuts mid-word ("...confirm exact co" from
// "...confirm exact compatibility") — this backs off to the last full word
// instead, so a truncated description always ends on a whole word.
function truncateAtWordBoundary(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
}

// "Buy X at ৳1,234 in Bangladesh. <real description>. In stock. Order from
// Noyon Telecom." — built entirely from this product's own DB fields (price,
// desc, stock), never invented. Mirrors the "[Product] Price in Bangladesh"
// title pattern below, a common high-intent search phrase for BD shoppers.
function buildMetaDescription(product, t) {
  // Same rule ProductCard uses — the API sends price: null until the owner
  // publishes a price, and a hidden price is never stated anywhere.
  const priceUnavailable = !hasPublicPrice(product);
  const priceText = priceUnavailable ? '' : `at ${formatPrice(product.price)} `;
  const stockText = product.stock > 0 ? 'In stock.' : 'Currently out of stock.';
  const detail = product.desc ? truncateAtWordBoundary(product.desc, 90) : t('pd.metaFallback', null, { category: product.category });
  return `Buy ${product.name} ${priceText}in Bangladesh. ${detail} ${stockText} Order from Noyon Telecom.`;
}

// Home › Samsung › Samsung Display › Galaxy A15 Display — same as the
// server-rendered page (Shop › Display when the brand isn't one we list).
function crumbsFor(product) {
  const brand = product.brand ? brandFromSlug(slugify(product.brand)) : null;
  return brand
    ? [
      { name: 'Home', path: '/' },
      { name: brand, path: brandUrl(brand) },
      { name: `${brand} ${product.category}`, path: brandCategoryUrl(brand, product.category) },
      { name: product.name, path: productUrl(product) },
    ]
    : [
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
      { name: product.category, path: categoryUrl(product.category) },
      { name: product.name, path: productUrl(product) },
    ];
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [missingProduct, setMissingProduct] = useState(false);
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
  // Phone-width "buy bar" pinned above the bottom nav while the real Add to
  // Cart button is off-screen — on a phone that button sits well below the
  // photo, specs and description, so it was never visible on arrival.
  const mainAddRef = useRef(null);
  const [showBuyBar, setShowBuyBar] = useState(false);
  useEffect(() => {
    const el = mainAddRef.current;
    if (!el || typeof window.IntersectionObserver === 'undefined') {
      setShowBuyBar(false);
      return undefined;
    }
    const io = new window.IntersectionObserver(([entry]) => setShowBuyBar(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [product]);
  const [activeImg, setActiveImg] = useState(0);
  // The grade picked in the quality picker (null = the cheapest).
  const [gradeLabel, setGradeLabel] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  // Other parts for the same phone model (links to the /model/<slug> hub).
  const [modelParts, setModelParts] = useState({ model: null, products: [] });
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
    setMissingProduct(false);
    setQty(1);
    setActiveImg(0);
    setGradeLabel(null);
    window.scrollTo(0, 0);
    // Previously had no .catch — a failed fetch (dropped connection, product
    // just deleted, backend hiccup) left the page stuck on the skeleton
    // loader forever with no way out. Now it surfaces a real error instead.
    // The `current` guard stops an earlier, slower request (e.g. clicking
    // through two related products quickly) from overwriting the page with
    // stale data if it resolves after the latest request already has.
    api.get(`/products/${id}`)
      .then((d) => {
        if (!current) return;
        // An old URL (renamed product) or a bare id: move to the product's
        // current clean URL without adding a history entry.
        if (d.product.slug && id !== d.product.slug) {
          navigate(productUrl(d.product), { replace: true });
          return;
        }
        setProduct(d.product);
      })
      .catch((err) => { if (current) { setLoadError(err.message); setMissingProduct(err.status === 404 || err.status === 410); } });
    return () => { current = false; };
  }, [id]);

  // Count an engaged view, never a listing/prefetch. Server deduplicates too.
  useEffect(() => {
    if (!product?.id || user?.role === 'admin') return;
    const timer = setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      const key = `nt-view:${product.id}`;
      const day = new Date().toISOString().slice(0, 10);
      try { if (sessionStorage.getItem(key) === day) return; } catch { /* storage optional */ }
      api.post(`/products/${product.id}/view`, {}).then(() => {
        try { sessionStorage.setItem(key, day); } catch { /* storage optional */ }
      }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [product?.id, user?.role]);

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
    api.get(`/products?category=${encodeURIComponent(product.category)}&limit=8&card=1`).then((d) => {
      setRelated(d.products.filter((p) => p.id !== product.id).slice(0, 4));
    });
    api.get(`/products/${product.id}/reviews`).then((d) => setReviews(d.reviews));
    const modelSlug = product.modelSlugs?.[0];
    setModelParts({ model: null, products: [] });
    if (modelSlug) {
      api.get(`/products/model/${encodeURIComponent(modelSlug)}?exclude=${encodeURIComponent(product.id)}&limit=12&card=1`)
        .then((d) => setModelParts({ model: d.model, products: d.products }))
        .catch(() => {});
    }

    const viewedIds = readRecentlyViewed().filter((x) => x !== product.id);
    if (viewedIds.length > 0) {
      Promise.all(viewedIds.slice(0, 4).map((vid) => api.get(`/products/${vid}`).then((d) => d.product).catch(() => null)))
        .then((list) => setRecentlyViewed(list.filter(Boolean)));
    } else {
      setRecentlyViewed([]);
    }
  }, [product]);

  // Title + meta come from the backend (same templates as the server-
  // rendered page — English, owner's language rule).
  const productImages = product ? (Array.isArray(product.images) ? product.images : [product.img]).filter(Boolean) : [];
  usePageMeta(
    product ? product.seo?.title || `${product.name} Wholesale Price in Bangladesh` : undefined,
    product ? product.seo?.description || buildMetaDescription(product, t) : undefined,
    // Only pass a real image URL — resolveImg() falls back to an inline SVG
    // data: URI when a product has no photo yet (see utils/fallbackImage.js),
    // which is exactly right for an <img> tag but wrong here: Facebook/
    // WhatsApp/Twitter link previews fetch og:image over HTTP(S) and can't
    // render a data: URI, so a photo-less product would share with a
    // broken preview image. Passing undefined instead leaves usePageMeta's
    // default (the site-wide og:image set in index.html) in place, which is
    // a real, fetchable image — a better fallback than a broken one.
    product && product.img ? resolveImg(product.img) : undefined,
    product ? productUrl(product) : undefined,
    product
      ? [
          // Product markup only with a published price (same as the server-
          // rendered page): without offers Google counts it as an invalid item.
          ...(product.price > 0
            ? [{
                id: 'product',
                data: {
                  '@context': 'https://schema.org',
                  '@type': 'Product',
                  name: product.name,
                  description: String(product.desc || '').split(/\n\s*\n/)[0] || product.name,
                  ...(productImages.length ? { image: productImages.map((img) => resolveImg(img)) } : {}),
                  sku: product.sku || undefined,
                  mpn: product.sku || undefined,
                  brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
                  category: `Mobile Phone Parts > ${product.category}`,
                  offers: {
                    // Several grades = one AggregateOffer from the cheapest to the dearest.
                    ...(priceRange(product)
                      ? { '@type': 'AggregateOffer', lowPrice: priceRange(product).min, highPrice: priceRange(product).max, offerCount: qualityOptions(product).length }
                      : { '@type': 'Offer', price: product.price }),
                    priceCurrency: 'BDT',
                    // Stock 0 = "ask us", not sold out: no availability claim then.
                    ...(product.stock > 0 ? { availability: 'https://schema.org/InStock' } : {}),
                    url: `${window.location.origin}${productUrl(product)}`,
                  },
                  ...(product.reviewCount > 0
                    ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } }
                    : {}),
                },
              }]
            : []),
          {
            id: 'breadcrumb',
            data: {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: crumbsFor(product).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${window.location.origin}${c.path}` })),
            },
          },
        ]
      : undefined,
    // noindex once the fetch has definitively failed (deleted product, bad
    // link, etc) — without this, a dead product URL kept whatever meta the
    // previously-viewed page left behind and was never marked non-indexable.
    missingProduct,
    { exactTitle: Boolean(product?.seo?.title), ogType: product ? 'product' : 'website', preserveExisting: !product && !missingProduct }
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
  // No published price yet: no "৳0", no cart — "দাম জানতে WhatsApp করুন" +
  // "কোটেশন চান" instead (owner's hidden-draft-price policy).
  const priceUnavailable = !hasPublicPrice(product);
  // Several grades with their own price: picked here, ordered on WhatsApp.
  const grades = priceUnavailable ? [] : qualityOptions(product);
  const graded = grades.length > 0;
  const selectedGrade = grades.find((g) => g.label === gradeLabel) || grades[0] || null;

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
  const gallery = Array.isArray(product.images) && product.images.filter(Boolean).length ? product.images.filter(Boolean) : [product.img].filter(Boolean);
  const categories = Array.isArray(product.categories) && product.categories.length ? product.categories : [product.category];

  return (
    <div className="container">
      <nav className="breadcrumb-trail" aria-label="Breadcrumb">
        {crumbsFor(product).map((c, i, all) => (i === all.length - 1 ? (
          <span key={c.path} aria-current="page">{c.name}</span>
        ) : (
          <span key={c.path}><Link to={c.path}>{i === 0 ? t('pd.breadcrumbHome') : c.name}</Link> <span>/</span>{' '}</span>
        )))}
      </nav>
      <div className="pd-grid">
        <div>
          <div className="pd-img">
            {gallery.length ? (
              <img
                src={resolveImg(gallery[activeImg] || gallery[0], 800)}
                alt={product.name}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
              />
            ) : (
              <PartTile product={product} large />
            )}
          </div>
          {!gallery.length && (
            <p className="pd-photo-note">{t('pd.photoNote')} · <Link to="/photo-credits">{t('pd.photoCredits')}</Link></p>
          )}
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
                    src={resolveImg(img, 120)}
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
        <div className="pd-buybox">
          <div className="pd-buybox-top">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map((c) => (
                <Link key={c} to={categoryUrl(c)} className="pd-cat" style={{ textDecoration: 'none' }}>
                  {c}
                </Link>
              ))}
            </div>
            <button
              className={`wishlist-heart-lg ${saved ? 'active' : ''}`}
              onClick={handleWishlist}
              aria-label={saved ? t('card.removeFromWishlist') : t('card.addToWishlist')}
            >
              {saved ? '♥' : '♡'}
            </button>
          </div>
          {/* The searched phrase ("… Price in Bangladesh") — same as the
              server-rendered page; the short name stays in cards and cart. */}
          <h1 className="pd-title">{product.seo?.h1 || `${product.name} Price in Bangladesh`}</h1>
          {product.reviewCount > 0 && (
            <div className="pd-rating-summary">
              ★ {product.rating} <span>· {t(product.reviewCount !== 1 ? 'pd.reviewCountPlural' : 'pd.reviewCount', null, { count: product.reviewCount })}</span>
            </div>
          )}

          <div className="pd-price">
            {priceUnavailable ? (
              <a
                className="now pd-price-request pd-price-ask"
                href={priceRequestLink(product)}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsappClick('product_detail_price')}
              >
                {t('card.askPrice')}
              </a>
            ) : (
              // Several grades: the chosen grade's price (the picker below).
              <span className="now">{formatPrice(selectedGrade ? selectedGrade.price : product.price)}</span>
            )}
            {!priceUnavailable && !graded && (onSale || (product.retailPrice && product.retailPrice > product.price)) && (
              <span className="was">{formatPrice(product.retailPrice || product.compareAt)}</span>
            )}
            {!graded && user?.role === 'dealer' && user?.dealerStatus === 'approved' && (
              <span className="pd-dealer-badge">{t('product.dealerPrice')}</span>
            )}
          </div>

          {graded ? (
            <>
              <label className="pd-quality-select">
                <span>{t('pd.quality')}</span>
                <select value={selectedGrade?.label || ''} onChange={(e) => setGradeLabel(e.target.value)}>
                  {grades.map((g) => (
                    <option key={g.label} value={g.label}>{g.label} — {formatPrice(g.price)}</option>
                  ))}
                </select>
              </label>
              <div className="pd-action-row">
                <a
                  className="btn pd-whatsapp-btn pd-whatsapp-primary"
                  href={orderRequestLink(product, selectedGrade)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    trackRequestQuote(product);
                    trackWhatsappClick('product_detail_grade');
                  }}
                >
                  💬 {t('pd.orderOnWhatsapp')}{selectedGrade ? ` — ${selectedGrade.label}` : ''}
                </a>
                <Link className="btn btn-outline" to={quoteRequestPath(product)}>
                  📋 {t('product.requestQuote')}
                </Link>
              </div>
            </>
          ) : (
            <>
              {user?.role !== 'dealer' && !priceUnavailable && (
                <p className="pd-dealer-hint">
                  <Link to="/register">{t('nav.becomeDealer')}</Link> {t('pd.dealerHintPost')}
                </p>
              )}

              {!priceUnavailable && product.stock === 0 && (
                <p className="pd-stock">
                  <a href={stockRequestLink(product)} target="_blank" rel="noreferrer" onClick={() => trackWhatsappClick('product_detail_stock')}>
                    {t('card.askStock')}
                  </a>
                </p>
              )}
              {!priceUnavailable && product.stock > 0 && (
              <>
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

              <button ref={mainAddRef} className="btn btn-berry btn-block" disabled={product.stock === 0} onClick={handleAdd}>
                {added ? t('pd.addedToCart') : t('product.addToCart')}
              </button>
              {added && (
                <p style={{ marginTop: 14, fontSize: '0.88rem' }}>
                  <Link to="/cart" style={{ fontWeight: 600, color: 'var(--berry)' }}>{t('pd.viewCart')}</Link>
                </p>
              )}
              </>
              )}
              {priceUnavailable && product.stock > 0 && (
                <p className="pd-stock">{t('pd.inStockNote', null, { stock: product.stock })}</p>
              )}

              <div className="pd-action-row">
                <a
                  className={`btn pd-whatsapp-btn ${priceUnavailable ? 'pd-whatsapp-primary' : 'btn-outline'}`}
                  href={priceUnavailable
                    ? priceRequestLink(product)
                    : whatsappLink(`${t('pd.whatsappMessage', null, { name: product.name, link: `${window.location.origin}${productUrl(product)}` })}${product.sku ? ` (SKU: ${product.sku})` : ''}`)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    trackRequestQuote(product);
                    trackWhatsappClick('product_detail');
                  }}
                >
                  💬 {priceUnavailable ? t('card.askPrice') : t('product.whatsappOrder')}
                </a>
                <Link
                  className="btn btn-outline"
                  to={quoteRequestPath(product)}
                >
                  📋 {t('product.requestQuote')}
                </Link>
              </div>
            </>
          )}

          <ul className="pd-trust">
            <li>{t('pd.trustWarranty')}</li>
            <li>{t('pd.trustDelivery')}</li>
            <li>{t('pd.trustWholesale')}</li>
          </ul>

          <dl className="pd-meta-line">
            {product.sku && <div><dt>{t('product.sku')}</dt><dd>{product.sku}</dd></div>}
            {product.brand && <div><dt>{t('pd.brand')}</dt><dd>{product.brand}</dd></div>}
            <div><dt>{t('product.moq')}</dt><dd>{product.moq || 1} {(product.moq || 1) !== 1 ? t('pd.units') : t('pd.unit')}</dd></div>
            {product.warranty && <div><dt>{t('product.warranty')}</dt><dd>{product.warranty}</dd></div>}
          </dl>
        </div>
      </div>

      {/* Details below the buy box: the text Google reads, out of the way of
          the price and the order buttons (owner: "less writing next to the
          product"). */}
      <section className="pd-details">
        <h2 className="pd-details-title">{t('pd.description')}</h2>
        <div className="pd-desc">
          {String(product.desc || '').split(/\n\s*\n/).filter((para) => para.trim()).map((para, i) => (
            <p key={i}>{para.trim()}</p>
          ))}
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

        {!graded && product.bulkPricing?.length > 0 && (
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

        {(() => {
          const guide = getPostForCategory(product.category);
          return guide ? (
            <p style={{ fontSize: '0.85rem' }}>
              📘 <Link to={`/blog/${guide.slug}`}>{guide.title}</Link>
            </p>
          ) : null;
        })()}
      </section>

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

      {modelParts.model && modelParts.products.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="section-head">
            <h2 className="section-title">{t('pd.otherPartsForModel', null, { model: modelParts.model.name })}</h2>
            <Link to={`/model/${modelParts.model.slug}`} className="section-link">
              {t('pd.allModelParts', null, { model: modelParts.model.name })}
            </Link>
          </div>
          <div className="grid">
            {modelParts.products.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAddRelated} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="section-head">
            <h2 className="section-title">
              {t('pd.mayAlsoLikeTop')} <em>{t('pd.mayAlsoLikeEm')}</em>
            </h2>
            <Link to={categoryUrl(product.category)} className="section-link">
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
      {!priceUnavailable && product.stock > 0 && (
        <div className={`sticky-buy-bar ${showBuyBar ? 'visible' : ''}`} aria-hidden={!showBuyBar}>
          <div className="sticky-buy-bar-price">
            <span>{product.name}</span>
            <strong>{formatPrice(product.price)}</strong>
          </div>
          {added ? (
            <Link to="/cart" className="btn btn-berry" tabIndex={showBuyBar ? 0 : -1}>{t('pd.viewCart')}</Link>
          ) : (
            <button type="button" className="btn btn-berry" onClick={handleAdd} tabIndex={showBuyBar ? 0 : -1}>{t('product.addToCart')}</button>
          )}
        </div>
      )}
    </div>
  );
}

