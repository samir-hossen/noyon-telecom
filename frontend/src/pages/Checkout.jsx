import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackBeginCheckout } from '../ecommerce.js';
import { useLanguage } from '../context/LanguageContext';

// Online gateway isn't configured yet — hide it from checkout so no one can
// select it and land on a guaranteed-fail payment. Flip back to true once
// the gateway is set up.
const ONLINE_PAYMENT_ENABLED = false;

export default function Checkout() {
  const { items, subtotal, refresh, clearGuestCart, isGuestCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState('cod');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '', email: user?.email || '' });
  const { t } = useLanguage();

  usePageMeta(t('checkout.pageTitle'), t('checkout.pageMeta'));
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const discount = coupon?.discount || 0;
  // 150 matches the backend's DEFAULT_DELIVERY_FEE (see utils/settings.js)
  // — used only until the real value loads below.
  const [deliveryFee, setDeliveryFee] = useState(150);
  useEffect(() => {
    api
      .get('/settings/public')
      .then((d) => setDeliveryFee(d.deliveryFee))
      .catch(() => {});
  }, []);
  const shipping = deliveryFee;
  const tax = 0; // Tax disabled — no tax is added anywhere.
  const total = +(subtotal - discount + shipping + tax).toFixed(2);

  const trackedCheckoutRef = useRef(false);
  useEffect(() => {
    if (items.length > 0 && !trackedCheckoutRef.current) {
      trackedCheckoutRef.current = true;
      trackBeginCheckout(
        items.map((i) => ({ ...i.product, qty: i.qty })),
        subtotal
      );
    }
  }, [items, subtotal]);

  async function onApplyCoupon(e) {
    e.preventDefault();
    setCouponError('');
    setApplyingCoupon(true);
    try {
      const data = await api.post('/coupons/validate', { code: couponInput, subtotal, email: form.email });
      setCoupon(data);
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message);
    } finally {
      setApplyingCoupon(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <h3>{t('checkout.emptyTitle')}</h3>
          <p style={{ marginBottom: 20 }}>{t('checkout.emptySub')}</p>
          <Link to="/shop" className="btn btn-primary">{t('checkout.backToShop')}</Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.post('/orders/checkout', {
        shipping: form,
        payment: { method },
        couponCode: coupon?.code || undefined,
        // Guests have no server-side cart, so their items ride along in the
        // request body directly; logged-in users' items live server-side
        // already and this is ignored.
        items: isGuestCart ? items.map((i) => ({ productId: i.productId, qty: i.qty })) : undefined,
      });
      if (isGuestCart) clearGuestCart();
      else await refresh();

      if (method === 'online') {
        // SSLCommerz needs the order to exist first (it's the transaction
        // reference), so we create it above, then start the payment session
        // and send the browser to the gateway page.
        try {
          const { url } = await api.post(`/payment/sslcommerz/init/${data.order.id}`, { email: form.email });
          window.location.href = url;
        } catch {
          // The order already exists and the cart's already been cleared
          // above, so items.length is now 0 — falling through to the outer
          // catch's setError() would be silently hidden behind this page's
          // own "cart is empty" early-return (line 68) with no sign an
          // order was ever created. Route to order-confirmation's existing
          // ?payment=failed handling instead, the same recovery path the
          // SSLCommerz fail/cancel redirects themselves already use.
          navigate(
            `/order-confirmation/${data.order.id}?payment=failed${isGuestCart ? `&email=${encodeURIComponent(form.email)}` : ''}`
          );
        }
        return;
      }

      // Guests have no session cookie to prove ownership of the order they
      // just placed, so GET /orders/:id requires their email as proof for
      // an unauthenticated request (see orders.routes.js) — carrying it
      // here means the confirmation page loads exactly as before, with
      // nothing extra for the customer to do.
      navigate(isGuestCart ? `/order-confirmation/${data.order.id}?email=${encodeURIComponent(form.email)}` : `/order-confirmation/${data.order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('checkout.eyebrow')}</span>
        <h1 className="page-title">
          {t('checkout.titleTop')} <em>{t('checkout.titleEm')}</em>
        </h1>
      </div>

      {error && <div className="form-error" style={{ maxWidth: 700 }}>{error}</div>}

      <form onSubmit={onSubmit} className="checkout-grid">
        <div>
          <div className="checkout-section">
            <h3>{t('checkout.shippingDetails')}</h3>
            {isGuestCart && (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: -6, marginBottom: 14 }}>
                {t('checkout.guestNotePre')} <Link to="/login">{t('nav.signIn')}</Link> {t('checkout.guestNotePost')}
              </p>
            )}
            <div className="field">
              <label htmlFor="co-name">{t('checkout.fullName')}</label>
              <input id="co-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('checkout.fullNamePlaceholder')} />
            </div>
            <div className="field">
              <label htmlFor="co-email">{t('checkout.email')}</label>
              <input id="co-email" required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div className="field">
              <label htmlFor="co-address">{t('checkout.streetAddress')}</label>
              <input id="co-address" required autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t('checkout.streetAddressPlaceholder')} />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="co-city">{t('checkout.city')}</label>
                <input id="co-city" required autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t('checkout.cityPlaceholder')} />
              </div>
              <div className="field">
                <label htmlFor="co-phone">{t('checkout.phone')}</label>
                <input id="co-phone" required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+880 1XXXXXXXXX" />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h3>{t('checkout.paymentMethod')}</h3>
            <label className={`pay-option ${method === 'cod' ? 'active' : ''}`}>
              <input type="radio" name="payment-method" checked={method === 'cod'} onChange={() => setMethod('cod')} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t('checkout.cod')}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t('checkout.codSub')}</div>
              </div>
            </label>
            {ONLINE_PAYMENT_ENABLED && (
              <label className={`pay-option ${method === 'online' ? 'active' : ''}`}>
                <input type="radio" name="payment-method" checked={method === 'online'} onChange={() => setMethod('online')} />
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{t('checkout.onlineTitle')}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t('checkout.onlineSub')}</div>
                </div>
              </label>
            )}
          </div>
        </div>

        <div className="summary-card">
          <h3 className="summary-title">{t('cart.summaryTitle')}</h3>
          {items.map((i) => (
            <div className="mini-item" key={i.productId}>
              <img src={resolveImg(i.product.img)} alt={i.product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.product.name}</div>
                <div style={{ color: 'var(--muted)' }}>{t('checkout.qty')} {i.qty}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(i.product.price * i.qty)}</div>
            </div>
          ))}

          <div className="field" style={{ marginTop: 12, marginBottom: 4 }}>
            <label htmlFor="co-coupon">{t('checkout.couponCode')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="co-coupon"
                style={{ flex: 1 }}
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t('checkout.couponPlaceholder')}
                disabled={!!coupon}
              />
              {coupon ? (
                <button type="button" className="btn btn-outline" onClick={() => { setCoupon(null); setCouponInput(''); setCouponError(''); }}>
                  {t('cart.remove')}
                </button>
              ) : (
                <button type="button" className="btn btn-outline" onClick={onApplyCoupon} disabled={applyingCoupon || !couponInput}>
                  {applyingCoupon ? t('checkout.couponApplying') : t('checkout.couponApply')}
                </button>
              )}
            </div>
            {couponError && <div style={{ color: '#b3261e', fontSize: '0.78rem', marginTop: 6 }}>{couponError}</div>}
            {coupon && <div style={{ color: '#2e7d32', fontSize: '0.78rem', marginTop: 6 }}>{t('checkout.couponApplied', null, { code: coupon.code })}</div>}
          </div>

          <div className="summary-row">
            <span>{t('cart.subtotal')}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row">
              <span>{t('checkout.discount')}</span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>{t('cart.shipping')}</span>
            <span>{formatPrice(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>{t('checkout.tax')}</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row total">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button className="btn btn-berry btn-block" disabled={busy} style={{ marginTop: 14 }}>
            {busy ? t('checkout.placingOrder') : t('checkout.placeOrder', null, { total: formatPrice(total) })}
          </button>
        </div>
      </form>
    </div>
  );
}
