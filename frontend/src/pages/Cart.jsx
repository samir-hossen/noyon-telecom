import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, resolveImg } from '../api';
import { productUrl } from '../utils/slug';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { useCart } from '../context/CartContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';

// Quantity box that lets someone type any number directly (e.g. 10, 20)
// instead of only clicking +/-. Keeps its own text while typing so the
// field can be briefly empty/mid-edit, and commits the final value to the
// cart on blur (or Enter).
function QtyInput({ qty, onChange }) {
  const [text, setText] = useState(String(qty));

  useEffect(() => {
    setText(String(qty));
  }, [qty]);

  function commit() {
    const n = parseInt(text, 10);
    if (Number.isFinite(n) && n >= 1) {
      if (n !== qty) onChange(n);
      else setText(String(qty));
    } else {
      setText(String(qty));
    }
  }

  return (
    <input
      type="number"
      min="1"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.target.blur();
      }}
    />
  );
}

export default function Cart() {
  const { items, subtotal, updateQty, removeItem } = useCart();
  const navigate = useNavigate();
  const { t } = useLanguage();
  // 150 matches the backend's DEFAULT_DELIVERY_FEE (see utils/settings.js)
  // — used only until the real value loads, and as a fallback if the
  // request fails, so the estimate is never wildly wrong either way.
  const [deliveryFee, setDeliveryFee] = useState(150);

  usePageMeta(t('cart.pageTitle'), t('cart.pageMeta'));

  // Phone-width checkout bar, shown while the summary's own Checkout button
  // is off-screen (it sits below every cart row on a phone).
  const checkoutRef = useRef(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = checkoutRef.current;
    if (!el || typeof window.IntersectionObserver === 'undefined') return undefined;
    const io = new window.IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [items.length]);

  useEffect(() => {
    api
      .get('/settings/public')
      .then((d) => setDeliveryFee(d.deliveryFee))
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">🛍️</div>
          <h3>{t('cart.emptyTitle')}</h3>
          <p style={{ marginBottom: 24 }}>{t('cart.emptySub')}</p>
          <Link to="/shop" className="btn btn-primary">{t('cart.startShopping')}</Link>
        </div>
      </div>
    );
  }

  // Flat delivery charge on every order — admin-editable from the Admin
  // panel's Settings tab, not a hardcoded number (see utils/settings.js
  // on the backend, which is the source of truth actually charged at
  // checkout; this is only the pre-checkout estimate shown here).
  const shipping = deliveryFee;
  const tax = 0; // Tax disabled — no tax is added anywhere.
  const total = +(subtotal + shipping + tax).toFixed(2);
  // "Price on request" items (price 0) can't be ordered — the server
  // refuses them — so say so here instead of failing at checkout.
  const unpriced = items.filter((i) => !(i.product.price > 0));
  const canCheckout = unpriced.length === 0;

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('cart.eyebrow')}</span>
        <h1 className="page-title">
          {t('cart.titleTop')} <em>{t('cart.titleEm')}</em>
        </h1>
      </div>

      <div className="cart-layout">
        <div>
          {items.map((item) => (
            <div className="cart-row" key={item.productId}>
              <Link to={productUrl({ id: item.productId, name: item.product.name })}>
                <img src={resolveImg(item.product.img)} alt={item.product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
              </Link>
              <div>
                <Link to={productUrl({ id: item.productId, name: item.product.name })}>
                  <div className="cart-row-name">{item.product.name}</div>
                </Link>
                <div className="cart-row-cat">{item.product.category}</div>
                {!(item.product.price > 0) && <div className="cart-row-warning">{t('cart.noPriceItem')}</div>}
                <button className="remove-link" onClick={() => removeItem(item.productId)}>{t('cart.remove')}</button>
              </div>
              <div className="qty-control">
                <button onClick={() => updateQty(item.productId, item.qty - 1)}>−</button>
                <QtyInput qty={item.qty} onChange={(n) => updateQty(item.productId, n)} />
                <button onClick={() => updateQty(item.productId, item.qty + 1)}>+</button>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(item.product.price * item.qty)}</div>
            </div>
          ))}
        </div>

        <div className="summary-card">
          <h3 className="summary-title">{t('cart.summaryTitle')}</h3>
          <div className="summary-row">
            <span>{t('cart.subtotal')}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>{t('cart.shipping')}</span>
            <span>{formatPrice(shipping)}</span>
          </div>
          {tax > 0 && (
            <div className="summary-row">
              <span>{t('cart.estimatedTax')}</span>
              <span>{formatPrice(tax)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
          {!canCheckout && <div className="form-error" style={{ marginTop: 12, marginBottom: 0 }}>{t('cart.noPriceBlock')}</div>}
          <button ref={checkoutRef} className="btn btn-berry btn-block" onClick={() => navigate('/checkout')} disabled={!canCheckout} style={{ marginTop: 10 }}>
            {t('cart.checkout')}
          </button>
          <Link to="/request-quote" className="btn btn-outline btn-block" style={{ marginTop: 10 }}>
            {t('cart.requestBulkQuote')}
          </Link>
        </div>
      </div>

      <div className={`sticky-buy-bar ${showBar ? 'visible' : ''}`} aria-hidden={!showBar}>
        <div className="sticky-buy-bar-price">
          <span>{t('cart.total')}</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <button type="button" className="btn btn-berry" onClick={() => navigate('/checkout')} disabled={!canCheckout} tabIndex={showBar ? 0 : -1}>
          {t('cart.checkout')}
        </button>
      </div>
    </div>
  );
}
