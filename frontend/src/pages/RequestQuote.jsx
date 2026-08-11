import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { trackRequestQuote } from '../ecommerce.js';
import { useLanguage } from '../context/LanguageContext';

function emptyItem() {
  return { productId: null, name: '', sku: '', qty: 1 };
}

export default function RequestQuote() {
  const { t } = useLanguage();
  usePageMeta(t('rq.pageTitle'), t('rq.pageMeta'));
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
      showToast(t('rq.emptyCartError'), 'error');
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
      setError(t('rq.contactRequiredError'));
      return;
    }
    if (cleanItems.length === 0) {
      setError(t('rq.atLeastOnePartError'));
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
          <span className="eyebrow">{t('rq.receivedEyebrow')}</span>
          <h1 className="page-title">
            {t('rq.receivedTitleTop')} <em>{t('rq.receivedTitleEm')}</em>
          </h1>
        </div>
        <div className="form-panel wide" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', marginBottom: 20 }}>
            {t('rq.receivedBody')}
          </p>
          {user ? (
            <Link to="/dealer" className="btn btn-berry">
              {t('rq.viewQuoteHistory')}
            </Link>
          ) : (
            <Link to="/shop" className="btn btn-berry">
              {t('rq.continueBrowsing')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('rq.eyebrow')}</span>
        <h1 className="page-title">
          {t('rq.titleTop')} <em>{t('rq.titleEm')}</em>
        </h1>
        <p style={{ color: '#6b5f59', maxWidth: 560 }}>
          {t('rq.sub')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="form-panel wide">
        {error && <div className="form-error">{error}</div>}

        <h3 style={{ marginBottom: 12 }}>{t('rq.yourDetails')}</h3>
        <div className="field">
          <label htmlFor="rq-name">{t('rq.yourName')}</label>
          <input id="rq-name" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="rq-email">{t('auth.email')}</label>
          <input
            id="rq-email"
            type="email"
            required
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="rq-phone">{t('checkout.phone')}</label>
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
          <label htmlFor="rq-business">{t('rq.businessNameOptional')}</label>
          <input
            id="rq-business"
            value={contact.businessName}
            onChange={(e) => setContact({ ...contact, businessName: e.target.value })}
          />
        </div>

        <h3 style={{ margin: '24px 0 12px' }}>{t('rq.partsNeeded')}</h3>
        {items.map((item, i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}
          >
            <div className="field" style={{ flex: '2 1 200px', margin: 0 }}>
              {i === 0 && <label htmlFor={`rq-item-name-${i}`}>{t('rq.partName')}</label>}
              <input
                id={`rq-item-name-${i}`}
                aria-label={t('rq.partName')}
                required
                placeholder={t('rq.partNamePlaceholder')}
                value={item.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: '1 1 120px', margin: 0 }}>
              {i === 0 && <label htmlFor={`rq-item-sku-${i}`}>{t('rq.skuOptional')}</label>}
              <input id={`rq-item-sku-${i}`} aria-label={t('rq.skuOptional')} value={item.sku} onChange={(e) => updateItem(i, { sku: e.target.value })} />
            </div>
            <div className="field" style={{ flex: '0 1 90px', margin: 0 }}>
              {i === 0 && <label htmlFor={`rq-item-qty-${i}`}>{t('checkout.qty')}</label>}
              <input
                id={`rq-item-qty-${i}`}
                aria-label={t('checkout.qty')}
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateItem(i, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
            </div>
            {items.length > 1 && (
              <button type="button" className="remove-link" onClick={() => removeItem(i)} style={{ marginBottom: 10 }} aria-label={t('rq.removePart', null, { n: i + 1 })}>
                {t('cart.remove')}
              </button>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={addItem}>
            {t('rq.addAnotherPart')}
          </button>
          {cartItems.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={loadFromCart}>
              {t('rq.loadFromCart')}
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="rq-message">{t('rq.anythingElse')}</label>
          <textarea id="rq-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('rq.messagePlaceholder')} />
        </div>

        <button className="btn btn-berry" disabled={busy}>
          {busy ? t('rq.sending') : t('rq.sendQuoteRequest')}
        </button>
      </form>
    </div>
  );
}
