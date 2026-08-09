import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackPurchase } from '../ecommerce.js';

export default function OrderConfirmation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  // Set by the SSLCommerz fail/cancel redirect (?payment=failed|cancelled);
  // a successful payment doesn't need a query flag since order.status
  // already flips to "paid" once the gateway confirms it.
  const paymentIssue = searchParams.get('payment');

  usePageMeta('Order Confirmed', 'Your order has been placed successfully.');

  useEffect(() => {
    setError('');
    setOrder(null);
    // Guest orders require the email they checked out with as proof of
    // access (see orders.routes.js) — Checkout.jsx and the SSLCommerz
    // redirect (payment.routes.js) both already attach it here, so this is
    // invisible to a legitimate customer landing on their own confirmation
    // page; it's only ever absent for someone who got here some other way.
    const email = searchParams.get('email');
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    // A failed/unhandled fetch here used to leave the page stuck on the
    // loading skeleton forever with no explanation — right after checkout,
    // that's the worst possible moment for the site to look broken with no
    // feedback. Now it falls through to a real error state with next steps.
    api.get(`/orders/${id}${qs}`).then((d) => setOrder(d.order)).catch((err) => setError(err.message));
  }, [id, searchParams]);

  // Fire the purchase conversion event once, and only for orders that
  // actually went through (not a failed/cancelled online-payment redirect —
  // counting those would over-report conversions to Ads/Analytics).
  const trackedRef = useRef(false);
  useEffect(() => {
    if (order && !paymentIssue && !trackedRef.current) {
      trackedRef.current = true;
      trackPurchase(order);
    }
  }, [order, paymentIssue]);

  if (error) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>🧾</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 10 }}>Can't load this order</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>{error}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            If you just placed this order, your payment/order itself is fine — this is only a page-load issue.
            Check <Link to="/orders">your orders</Link>, or contact us if it keeps happening.
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '60px 28px 100px' }}>
        <div className="form-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="skeleton-block" style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton-line" style={{ width: '60%', height: 24, margin: '0 auto 10px' }} />
          <div className="skeleton-line" style={{ width: '80%', margin: '0 auto 26px' }} />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div className="skeleton-block" style={{ width: 48, height: 48 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: '55%' }} />
                <div className="skeleton-line" style={{ width: '25%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Same short 8-char code already used in the order-confirmation SMS/email
  // (see orders.routes.js) and the Invoice page — showing the full internal
  // cuid here instead was inconsistent with what the customer was already
  // told to expect as "their order number".
  const shortOrderId = order.id.slice(-8).toUpperCase();

  return (
    <div className="container" style={{ padding: '60px 28px 100px' }}>
      <div className="form-panel" style={{ maxWidth: 600, textAlign: 'center' }}>
        {paymentIssue ? (
          <>
            <div style={{ fontSize: '2.6rem', marginBottom: 10 }}>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', marginBottom: 8 }}>
              Payment {paymentIssue === 'cancelled' ? 'cancelled' : 'failed'}
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: 26 }}>
              Your order <strong>#{shortOrderId}</strong> was created but the payment didn't go through. No charge was made — you can try
              paying again from your <Link to="/orders">orders page</Link>, or contact us for help.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2.6rem', marginBottom: 10 }}>✓</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', marginBottom: 8 }}>Order confirmed</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 26 }}>
              Thank you! Your order <strong>#{shortOrderId}</strong> has been placed
              {order.paymentMethod === 'cod'
                ? ' — pay on delivery.'
                : order.status === 'paid'
                ? ' and payment received.'
                : ' — finalizing your payment confirmation.'}
            </p>
          </>
        )}

        <div style={{ textAlign: 'left', borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          {order.items.map((i) => (
            <div className="mini-item" key={i.productId}>
              <img src={resolveImg(i.img)} alt={i.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.name}</div>
                <div style={{ color: 'var(--muted)' }}>Qty {i.qty}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(i.price * i.qty)}</div>
            </div>
          ))}
          <div className="summary-row total">
            <span>Total paid</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {!order.userId && (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 18 }}>
            A confirmation has been sent to {order.guestEmail || order.shipping?.email}. Bookmark this page or save your order number to track it later —
            or <Link to="/register">create an account</Link> next time to see all your orders in one place.
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 26, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/shop" className="btn btn-outline">Continue shopping</Link>
          <Link
            to={`/invoice/${order.id}${searchParams.get('email') ? `?email=${encodeURIComponent(searchParams.get('email'))}` : ''}`}
            className="btn btn-outline"
          >
            🧾 Print Invoice
          </Link>
          {order.userId && <Link to="/orders" className="btn btn-primary">View my orders</Link>}
        </div>
      </div>
    </div>
  );
}
