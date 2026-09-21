import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';
import { OrderTracker } from './Orders.jsx';

export default function TrackOrder() {
  const { t } = useLanguage();
  // noindex: not content that should ever rank, and a bare form with no
  // order data has nothing worth indexing anyway.
  usePageMeta(t('trackOrder.pageTitle'), t('trackOrder.pageMeta'), undefined, undefined, undefined, true);

  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    setOrder(null);
    try {
      const d = await api.get(`/orders/track/lookup?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`);
      setOrder(d.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ padding: '40px 28px 100px' }}>
      <div className="page-header">
        <h1 className="page-title">
          {t('trackOrder.titleTop')} <em>{t('trackOrder.titleEm')}</em>
        </h1>
        <p style={{ color: '#6b5f59', maxWidth: 560 }}>{t('trackOrder.intro')}</p>
      </div>

      <form onSubmit={onSubmit} className="form-panel wide" style={{ maxWidth: 480 }}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="track-order-number">{t('trackOrder.orderNumber')}</label>
          <input
            id="track-order-number"
            required
            placeholder={t('trackOrder.orderNumberPlaceholder')}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            style={{ textTransform: 'uppercase' }}
          />
          <small style={{ color: 'var(--muted)' }}>{t('trackOrder.orderNumberHint')}</small>
        </div>
        <div className="field">
          <label htmlFor="track-phone">{t('trackOrder.phone')}</label>
          <input id="track-phone" type="tel" required placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn btn-berry" disabled={busy}>
          {busy ? t('trackOrder.tracking') : t('trackOrder.track')}
        </button>
      </form>

      {order && (
        <div className="form-panel wide" style={{ maxWidth: 480, marginTop: 20, textAlign: 'left' }}>
          <OrderTracker status={order.status} />
          {order.items.map((i) => (
            <div className="mini-item" key={i.productId}>
              <img src={resolveImg(i.img)} alt={i.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.name}</div>
                <div style={{ color: 'var(--muted)' }}>{t('checkout.qty')} {i.qty}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{formatPrice(i.price * i.qty)}</div>
            </div>
          ))}
          <div className="summary-row total">
            <span>{t('orderConf.totalPaid')}</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.courierTrackingCode && (
            <div className="card" style={{ padding: '14px 18px', marginTop: 14 }}>
              <strong>{t('orderConf.courierTitle')}</strong>
              <div style={{ color: 'var(--muted)', marginTop: 4 }}>{t('orderConf.courierTrackingCode', null, { code: order.courierTrackingCode })}</div>
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--muted)' }}>
        {t('trackOrder.haveAccountPre')} <Link to="/orders">{t('trackOrder.haveAccountLink')}</Link>
      </p>
    </div>
  );
}
