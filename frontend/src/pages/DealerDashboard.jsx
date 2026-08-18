import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatPrice } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageTitle';
import { useToast } from '../context/ToastContext';

export default function DealerDashboard() {
  const { user, setUser } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ count: 0, totalSpent: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);

  // noindex: authenticated dealer account area, no public content.
  usePageMeta(t('dealerDash.pageTitle'), t('dealerDash.pageMeta'), undefined, undefined, undefined, true);

  useEffect(() => {
    // Stats cards use a cheap DB-side aggregate (accurate for a dealer's
    // full lifetime history), while the table below only loads a page at a
    // time — so this stays fast whether someone has 5 orders or 5,000.
    Promise.all([
      api.get('/orders/mine/summary'),
      api.get('/orders/mine?page=1&limit=10'),
    ]).then(([summaryData, ordersData]) => {
      setSummary(summaryData);
      setOrders(ordersData.orders || []);
      setTotalPages(ordersData.totalPages || 1);
      setPage(1);
    }).catch((err) => {
      // Previously a failed fetch silently left `orders` at its default []
      // — a dealer with real purchase history would see "No orders yet"
      // instead of an actual error, which reads as their history vanishing.
      setLoadError(err.message);
    }).finally(() => setLoading(false));
  }, []);

  function loadMoreOrders() {
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get(`/orders/mine?page=${nextPage}&limit=10`).then((d) => {
      setOrders((prev) => [...prev, ...(d.orders || [])]);
      setPage(nextPage);
      setTotalPages(d.totalPages || 1);
    }).catch((err) => showToast(err.message, 'error')).finally(() => setLoadingMore(false));
  }

  async function handleLicenseUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseUploading(true);
    try {
      const data = await api.upload('/dealer/trade-license', file);
      setUser((u) => ({ ...u, tradeLicenseUrl: data.tradeLicenseUrl }));
      showToast(t('dealerDash.licenseUploadSuccess'), 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLicenseUploading(false);
      e.target.value = '';
    }
  }

  const totalSpent = summary.totalSpent;
  const statusLabel = {
    pending: t('dealer.statusPending'),
    approved: t('dealer.statusApproved'),
    rejected: t('dealer.statusRejected'),
  }[user?.dealerStatus] || user?.dealerStatus;

  return (
    <div className="container" style={{ padding: '40px 28px 80px' }}>
      <div className="page-header">
        <span className="eyebrow">{t('dealerDash.eyebrow')}</span>
        <h1 className="page-title">{t('dealer.dashboard')}</h1>
      </div>

      <div className={`dealer-status-banner status-${user?.dealerStatus}`}>
        <div>
          <strong>{user?.businessName}</strong>
          <p>{t('dealerDash.accountStatus')} <span className="dealer-status-pill">{statusLabel}</span></p>
        </div>
        {user?.dealerStatus === 'pending' && (
          <p className="dealer-status-note">
            {t('dealerDash.pendingNote')}
          </p>
        )}
        {user?.dealerStatus !== 'rejected' && (
          <div className="dealer-license-upload">
            {user?.tradeLicenseUrl ? (
              <p className="dealer-status-note">
                📄 {t('dealerDash.tradeLicenseUploaded')} <a href={user.tradeLicenseUrl} target="_blank" rel="noreferrer">{t('dealerDash.viewFile')}</a>.{' '}
                <label className="dealer-license-replace">
                  {licenseUploading ? t('dealerDash.uploading') : t('dealerDash.replace')}
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={licenseUploading} onChange={handleLicenseUpload} />
                </label>
              </p>
            ) : (
              <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block', marginTop: 10 }}>
                {licenseUploading ? t('dealerDash.uploading') : `📄 ${t('dealerDash.uploadTradeLicense')}`}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={licenseUploading} onChange={handleLicenseUpload} />
              </label>
            )}
          </div>
        )}
        {user?.dealerStatus === 'approved' && (
          <p className="dealer-status-note">
            ✅ {t('dealerDash.approvedNoteBase')}{user?.dealerDiscountPercent > 0
              ? ` ${t('dealerDash.approvedNoteDiscount', null, { percent: user.dealerDiscountPercent })}`
              : '.'}
          </p>
        )}
        {user?.dealerStatus === 'rejected' && (
          <p className="dealer-status-note">
            {t('dealerDash.rejectedNotePre')}{' '}
            <Link to="/contact">{t('dealerDash.contactPage')}</Link> {t('dealerDash.rejectedNotePost')}
          </p>
        )}
      </div>

      <div className="stat-grid" style={{ marginTop: 28 }}>
        <div className="stat-card">
          <div className="stat-label">{t('dealerDash.totalOrders')}</div>
          <div className="stat-value">{summary.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dealerDash.totalPurchased')}</div>
          <div className="stat-value">{formatPrice(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dealerDash.dealerDiscount')}</div>
          <div className="stat-value">{user?.dealerDiscountPercent || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dealerDash.business')}</div>
          <div className="stat-value" style={{ fontSize: '1.05rem' }}>{user?.businessName || '—'}</div>
        </div>
      </div>

      <div className="analytics-panel" style={{ marginTop: 12 }}>
        <h3>{t('dealerDash.purchaseHistory')}</h3>
        {loading ? (
          <p>{t('orders.loading')}</p>
        ) : loadError ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p>{t('dealerDash.cantLoadHistoryPre')} {loadError}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p>{t('dealerDash.noOrdersPre')} <Link to="/shop">{t('dealerDash.startShoppingWholesale')}</Link></p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('dealerDash.orderHeader')}</th>
                  <th>{t('dealerDash.dateHeader')}</th>
                  <th>{t('dealerDash.itemsHeader')}</th>
                  <th>{t('dealerDash.statusHeader')}</th>
                  <th>{t('cart.total')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id.slice(-8).toUpperCase()}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.items.length} {o.items.length !== 1 ? t('dealerDash.items') : t('dealerDash.item')}</td>
                    <td><span className={`status-badge status-${o.status}`}>{t(`order.status.${o.status}`, o.status)}</span></td>
                    <td>{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {page < totalPages && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={loadMoreOrders} disabled={loadingMore}>
              {loadingMore ? t('orders.loading') : t('orders.loadMore')}
            </button>
          </div>
        )}
      </div>

      <div className="promo-banner" style={{ marginTop: 12 }}>
        <div>
          <strong>{t('dealerDash.bulkQuoteTitle')}</strong>
          <p>{t('dealerDash.bulkQuoteSub')}</p>
        </div>
        <a
          href="https://wa.me/8801560047377?text=Hi%2C%20I%27d%20like%20a%20bulk%20quotation"
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
        >
          {t('product.requestQuote')}
        </a>
      </div>
    </div>
  );
}
