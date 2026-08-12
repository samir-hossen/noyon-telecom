import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, resolveImg } from '../api';
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
              <Link to={`/product/${item.productId}`}>
                <img src={resolveImg(item.product.img)} alt={item.product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
              </Link>
              <div>
                <Link to={`/product/${item.productId}`}>
                  <div className="cart-row-name">{item.product.name}</div>
                </Link>
                <div className="cart-row-cat">{item.product.category}</div>
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
          <div className="summary-row">
            <span>{t('cart.estimatedTax')}</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row total">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button className="btn btn-berry btn-block" onClick={() => navigate('/checkout')} style={{ marginTop: 10 }}>
            {t('cart.checkout')}
          </button>
          <Link to="/request-quote" className="btn btn-outline btn-block" style={{ marginTop: 10 }}>
            {t('cart.requestBulkQuote')}
          </Link>
        </div>
      </div>
    </div>
  );
}
