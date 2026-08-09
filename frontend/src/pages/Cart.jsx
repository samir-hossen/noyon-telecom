import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { useCart } from '../context/CartContext';
import { usePageMeta } from '../hooks/usePageTitle';

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

  usePageMeta('Your Cart', 'Review items in your Noyon Telecom shopping cart before checkout.');

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">🛍️</div>
          <h3>Your cart is empty</h3>
          <p style={{ marginBottom: 24 }}>Time to find something bold.</p>
          <Link to="/shop" className="btn btn-primary">Start shopping</Link>
        </div>
      </div>
    );
  }

  // BDT-scale shipping: free over ৳1500, otherwise a flat courier fee.
  const FREE_SHIPPING_THRESHOLD = 1500;
  const SHIPPING_FEE = 60;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = 0; // Tax disabled — no tax is added anywhere.
  const total = +(subtotal + shipping + tax).toFixed(2);

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Your bag</span>
        <h1 className="page-title">
          Shopping <em>cart</em>
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
                <button className="remove-link" onClick={() => removeItem(item.productId)}>Remove</button>
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
          <h3 className="summary-title">Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row">
            <span>Estimated tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {subtotal < FREE_SHIPPING_THRESHOLD && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 16 }}>
              Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
            </p>
          )}
          <button className="btn btn-berry btn-block" onClick={() => navigate('/checkout')} style={{ marginTop: 10 }}>
            Checkout
          </button>
          <Link to="/request-quote" className="btn btn-outline btn-block" style={{ marginTop: 10 }}>
            Request a bulk quote instead
          </Link>
        </div>
      </div>
    </div>
  );
}
