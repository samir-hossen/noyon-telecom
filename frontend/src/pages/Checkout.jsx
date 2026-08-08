import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, resolveImg } from '../api';
import { formatPrice } from '../utils/currency';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackBeginCheckout } from '../ecommerce.js';

export default function Checkout() {
  const { items, subtotal, refresh, clearGuestCart, isGuestCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState('cod');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '', email: user?.email || '' });

  usePageMeta('Checkout', 'Complete your purchase securely at Noyon Telecom.');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const discount = coupon?.discount || 0;
  const FREE_SHIPPING_THRESHOLD = 1500;
  const SHIPPING_FEE = 60;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
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
      const data = await api.post('/coupons/validate', { code: couponInput, subtotal });
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
          <h3>Nothing to check out</h3>
          <p style={{ marginBottom: 20 }}>Your cart is empty.</p>
          <Link to="/shop" className="btn btn-primary">Back to shop</Link>
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
        const { url } = await api.post(`/payment/sslcommerz/init/${data.order.id}`, { email: form.email });
        window.location.href = url;
        return;
      }

      navigate(`/order-confirmation/${data.order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Almost there</span>
        <h1 className="page-title">
          Secure <em>checkout</em>
        </h1>
      </div>

      {error && <div className="form-error" style={{ maxWidth: 700 }}>{error}</div>}

      <form onSubmit={onSubmit} className="checkout-grid">
        <div>
          <div className="checkout-section">
            <h3>Shipping details</h3>
            {isGuestCart && (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: -6, marginBottom: 14 }}>
                Checking out as a guest. <Link to="/login">Sign in</Link> if you'd like to save this address and track orders later.
              </p>
            )}
            <div className="field">
              <label htmlFor="co-name">Full name</label>
              <input id="co-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Rahman" />
            </div>
            <div className="field">
              <label htmlFor="co-email">Email</label>
              <input id="co-email" required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div className="field">
              <label htmlFor="co-address">Street address</label>
              <input id="co-address" required autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House 12, Road 5, Kafrul" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="co-city">City</label>
                <input id="co-city" required autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Dhaka" />
              </div>
              <div className="field">
                <label htmlFor="co-phone">Phone</label>
                <input id="co-phone" required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+880 1XXXXXXXXX" />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h3>Payment method</h3>
            <label className={`pay-option ${method === 'cod' ? 'active' : ''}`}>
              <input type="radio" name="payment-method" checked={method === 'cod'} onChange={() => setMethod('cod')} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Cash on delivery</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Pay when your order arrives</div>
              </div>
            </label>
            <label className={`pay-option ${method === 'online' ? 'active' : ''}`}>
              <input type="radio" name="payment-method" checked={method === 'online'} onChange={() => setMethod('online')} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>bKash, Nagad, Rocket or card</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Pay securely via SSLCommerz — you'll be redirected to complete payment</div>
              </div>
            </label>
          </div>
        </div>

        <div className="summary-card">
          <h3 className="summary-title">Order summary</h3>
          {items.map((i) => (
            <div className="mini-item" key={i.productId}>
              <img src={resolveImg(i.product.img)} alt={i.product.name} loading="lazy" decoding="async" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.product.name}</div>
                <div style={{ color: 'var(--muted)' }}>Qty {i.qty}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(i.product.price * i.qty)}</div>
            </div>
          ))}

          <div className="field" style={{ marginTop: 12, marginBottom: 4 }}>
            <label htmlFor="co-coupon">Coupon code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="co-coupon"
                style={{ flex: 1 }}
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="e.g. SAVE10"
                disabled={!!coupon}
              />
              {coupon ? (
                <button type="button" className="btn btn-outline" onClick={() => { setCoupon(null); setCouponInput(''); setCouponError(''); }}>
                  Remove
                </button>
              ) : (
                <button type="button" className="btn btn-outline" onClick={onApplyCoupon} disabled={applyingCoupon || !couponInput}>
                  {applyingCoupon ? 'Checking…' : 'Apply'}
                </button>
              )}
            </div>
            {couponError && <div style={{ color: '#b3261e', fontSize: '0.78rem', marginTop: 6 }}>{couponError}</div>}
            {coupon && <div style={{ color: '#2e7d32', fontSize: '0.78rem', marginTop: 6 }}>Coupon "{coupon.code}" applied</div>}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row">
              <span>Discount</span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button className="btn btn-berry btn-block" disabled={busy} style={{ marginTop: 14 }}>
            {busy ? 'Placing order…' : `Place order — ${formatPrice(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
