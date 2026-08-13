import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { usePageMeta } from '../hooks/usePageTitle';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const TRACK_STEPS = ['processing', 'shipped', 'delivered'];

function OrderTracker({ status }) {
  const { t } = useLanguage();
  if (status === 'cancelled') {
    return <div style={{ fontSize: '0.8rem', color: '#b3261e', marginBottom: 14 }}>{t('orders.cancelledNote')}</div>;
  }
  const currentIdx = Math.max(0, TRACK_STEPS.indexOf(status === 'paid' ? 'processing' : status));
  return (
    <div className="order-tracker" style={{ display: 'flex', alignItems: 'center', margin: '14px 0 18px' }}>
      {TRACK_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < TRACK_STEPS.length - 1 ? 1 : 'initial' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: '#fff',
                background: i <= currentIdx ? '#8a2846' : '#ddd0cb',
              }}
            >
              {i < currentIdx ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.7rem', marginTop: 4, color: i <= currentIdx ? '#3a2e2a' : '#a89a93' }}>
              {t(`order.status.${step}`)}
            </span>
          </div>
          {i < TRACK_STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < currentIdx ? '#8a2846' : '#ddd0cb', marginBottom: 16 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [summary, setSummary] = useState({ count: 0, totalSpent: 0 });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();

  usePageMeta(t('orders.pageTitle'), t('orders.pageMeta'));

  useEffect(() => {
    // No .catch previously — a failed request left this page stuck on the
    // skeleton loader forever, no error, no retry option.
    Promise.all([
      api.get('/orders/mine/summary'),
      api.get('/orders/mine?page=1&limit=10'),
    ]).then(([summaryData, ordersData]) => {
      setSummary(summaryData);
      setOrders(ordersData.orders);
      setTotalPages(ordersData.totalPages || 1);
      setPage(1);
    }).catch((err) => setError(err.message));
  }, []);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : '';

  const pageHeader = (
    <div className="page-header">
      <span className="eyebrow">{t('orders.eyebrow')}</span>
      <h1 className="page-title">
        {t('orders.titleTop')} <em>{t('orders.titleEm')}</em>
      </h1>
    </div>
  );

  const profileStats = user && (
    <div className="profile-summary" style={{ marginBottom: 28 }}>
      <div>
        <strong style={{ fontSize: '1.05rem' }}>{user.name}</strong>
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{user.email}</div>
        {memberSince && (
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {t('orders.memberSince', null, { date: memberSince })}
          </div>
        )}
      </div>
      <div className="stat-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-label">{t('orders.totalOrders')}</div>
          <div className="stat-value">{summary.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('orders.totalSpent')}</div>
          <div className="stat-value">{formatPrice(summary.totalSpent)}</div>
        </div>
      </div>
    </div>
  );

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get(`/orders/mine?page=${nextPage}&limit=10`).then((d) => {
      setOrders((prev) => [...(prev || []), ...d.orders]);
      setPage(nextPage);
      setTotalPages(d.totalPages || 1);
    }).catch((err) => setError(err.message)).finally(() => setLoadingMore(false));
  }

  if (error) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>{t('orders.cantLoad')}</h3>
          <p style={{ marginBottom: 24 }}>{error}</p>
          <Link to="/" className="btn btn-primary">{t('notFound.backHome')}</Link>
        </div>
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        {pageHeader}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 18, marginBottom: 14 }}>
            <div className="skeleton-line" style={{ width: '25%' }} />
            <div className="skeleton-line" style={{ width: '15%' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div className="skeleton-block" style={{ width: 56, height: 56 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: '50%' }} />
                <div className="skeleton-line" style={{ width: '30%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container">
        {pageHeader}
        {profileStats}
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>{t('orders.noOrdersTitle')}</h3>
          <p style={{ marginBottom: 24 }}>{t('orders.noOrdersSub')}</p>
          <Link to="/shop" className="btn btn-primary">{t('cart.startShopping')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {pageHeader}
      {profileStats}

      <div style={{ paddingBottom: 80 }}>
        {orders.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="order-card-head">
              <div>
                <strong>{t('orders.orderPrefix', null, { id: o.id.slice(-8).toUpperCase() })}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
              </div>
              <span className={`status-badge status-${o.status}`}>{t(`order.status.${o.status}`, o.status)}</span>
            </div>
            <OrderTracker status={o.status} />
            {o.items.map((i) => (
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
              <span>{t('cart.total')}</span>
              <span>{formatPrice(o.total)}</span>
            </div>
          </div>
        ))}
        {page < totalPages && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('orders.loading') : t('orders.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
