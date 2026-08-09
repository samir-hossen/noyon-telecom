import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackRequestQuote } from '../ecommerce.js';

function emptyItem() {
  return { productId: null, name: '', sku: '', qty: 1 };
}

export default function RequestQuote() {
  usePageMeta(
    'Request a Bulk Quote',
    'Request wholesale pricing for the mobile parts you need — our team will reply with a formal quotation.'
  );
  const { user } = useAuth();
  const { items: cartItems } = useCart();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [contact, setContact] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    businessName: user?.businessName || '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Arriving from a product page's "Request Quote" link (?productId=...) —
  // pre-fill the one item instead of making the person retype it.
  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId) return;
    setItems([
      {
        productId,
        name: searchParams.get('name') || '',
        sku: searchParams.get('sku') || '',
        qty: Math.max(1, parseInt(searchParams.get('qty'), 10) || 1),
      },
    ]);
  }, [searchParams]);

  function updateItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  // Pulls in whatever's already sitting in the cart so a dealer doesn't have
  // to retype a list they've already built — common case: they added 8
  // different SKUs to cart, then realize they want a formal bulk quote
  // instead of checking out at retail/dealer-list price.
  function loadFromCart() {
    if (!cartItems.length) {
      showToast('Your cart is empty.', 'error');
      return;
    }
    setItems(
      cartItems.map((i) => ({
        productId: i.productId,
        name: i.product.name,
        sku: i.product.sku || '',
        qty: i.qty,
      }))
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanItems = items.filter((i) => i.name.trim());
    if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim()) {
      setError('Please fill in your name, email, and phone number.');
      return;
    }
    if (cleanItems.length === 0) {
      setError('Add at least one part to your quote request.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/quotes', { ...contact, items: cleanItems, message });
      trackRequestQuote();
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="container">
        <div className="page-header">
          <span className="eyebrow">Request received</span>
          <h1 className="page-title">
            Thanks — we're <em>on it</em>
          </h1>
        </div>
        <div className="form-panel wide" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', marginBottom: 20 }}>
            Our team will review your parts list and reply by email or phone with pricing, usually within one
            business day. For anything urgent, message us directly on WhatsApp using the support button in the
            corner.
          </p>
          {user ? (
            <Link to="/dealer" className="btn btn-berry">
              View my quote history
            </Link>
          ) : (
            <Link to="/shop" className="btn btn-berry">
              Continue browsing
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Wholesale &amp; bulk orders</span>
        <h1 className="page-title">
          Request a <em>bulk quote</em>
        </h1>
        <p style={{ color: '#6b5f59', maxWidth: 560 }}>
          Building a large order or need dealer pricing on several SKUs at once? List what you need below and
          we'll send back a formal quotation — no obligation to buy.
        </p>
      </div>

      <form onSubmit={onSubmit} className="form-panel wide">
        {error && <div className="form-error">{error}</div>}

        <h3 style={{ marginBottom: 12 }}>Your details</h3>
        <div className="field">
          <label htmlFor="rq-name">Your name</label>
          <input id="rq-name" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="rq-email">Email</label>
          <input
            id="rq-email"
            type="email"
            required
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="rq-phone">Phone</label>
          <input
            id="rq-phone"
            type="tel"
            required
            placeholder="01XXXXXXXXX"
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="rq-business">Business / shop name (optional)</label>
          <input
            id="rq-business"
            value={contact.businessName}
            onChange={(e) => setContact({ ...contact, businessName: e.target.value })}
          />
        </div>

        <h3 style={{ margin: '24px 0 12px' }}>Parts needed</h3>
        {items.map((item, i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}
          >
            <div className="field" style={{ flex: '2 1 200px', margin: 0 }}>
              {i === 0 && <label htmlFor={`rq-item-name-${i}`}>Part name</label>}
              <input
                id={`rq-item-name-${i}`}
                aria-label="Part name"
                required
                placeholder="e.g. iPhone 13 Display"
                value={item.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: '1 1 120px', margin: 0 }}>
              {i === 0 && <label htmlFor={`rq-item-sku-${i}`}>SKU (optional)</label>}
              <input id={`rq-item-sku-${i}`} aria-label="SKU (optional)" value={item.sku} onChange={(e) => updateItem(i, { sku: e.target.value })} />
            </div>
            <div className="field" style={{ flex: '0 1 90px', margin: 0 }}>
              {i === 0 && <label htmlFor={`rq-item-qty-${i}`}>Qty</label>}
              <input
                id={`rq-item-qty-${i}`}
                aria-label="Quantity"
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateItem(i, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
            </div>
            {items.length > 1 && (
              <button type="button" className="remove-link" onClick={() => removeItem(i)} style={{ marginBottom: 10 }} aria-label={`Remove part ${i + 1}`}>
                Remove
              </button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={addItem}>
            + Add another part
          </button>
          {cartItems.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={loadFromCart}>
              Load items from my cart
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="rq-message">Anything else we should know? (optional)</label>
          <textarea id="rq-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Delivery timeline, preferred brand/quality tier, etc." />
        </div>

        <button className="btn btn-berry" disabled={busy}>
          {busy ? 'Sending…' : 'Send quote request'}
        </button>
      </form>
    </div>
  );
}
