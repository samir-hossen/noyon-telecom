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
  const [loadingMore, setLoadingMore] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);

  usePageMeta('Dealer Dashboard', 'Manage your Noyon Telecom dealer account, pricing, and purchase history.');

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
    }).finally(() => setLoading(false));
  }, []);

  function loadMoreOrders() {
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get(`/orders/mine?page=${nextPage}&limit=10`).then((d) => {
      setOrders((prev) => [...prev, ...(d.orders || [])]);
      setPage(nextPage);
      setTotalPages(d.totalPages || 1);
    }).finally(() => setLoadingMore(false));
  }

  async function handleLicenseUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseUploading(true);
    try {
      const data = await api.upload('/dealer/trade-license', file);
      setUser((u) => ({ ...u, tradeLicenseUrl: data.tradeLicenseUrl }));
      showToast('Trade license uploaded — this speeds up verification', 'success');
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
        <span className="eyebrow">Dealer Account</span>
        <h1 className="page-title">{t('dealer.dashboard')}</h1>
      </div>

      <div className={`dealer-status-banner status-${user?.dealerStatus}`}>
        <div>
          <strong>{user?.businessName}</strong>
          <p>Account status: <span className="dealer-status-pill">{statusLabel}</span></p>
        </div>
        {user?.dealerStatus === 'pending' && (
          <p className="dealer-status-note">
            Your application is under review. You can shop at retail pricing meanwhile — dealer pricing
            unlocks automatically as soon as you're approved (usually within 24 hours).
          </p>
        )}
        {user?.dealerStatus !== 'rejected' && (
          <div className="dealer-license-upload">
            {user?.tradeLicenseUrl ? (
              <p className="dealer-status-note">
                📄 Trade license uploaded — <a href={user.tradeLicenseUrl} target="_blank" rel="noreferrer">view file</a>.{' '}
                <label className="dealer-license-replace">
                  {licenseUploading ? 'Uploading…' : 'Replace'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={licenseUploading} onChange={handleLicenseUpload} />
                </label>
              </p>
            ) : (
              <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block', marginTop: 10 }}>
                {licenseUploading ? 'Uploading…' : '📄 Upload trade license (optional, speeds up approval)'}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={licenseUploading} onChange={handleLicenseUpload} />
              </label>
            )}
          </div>
        )}
        {user?.dealerStatus === 'approved' && (
          <p className="dealer-status-note">
            ✅ Dealer pricing is active on every product{user?.dealerDiscountPercent > 0
              ? ` with an extra ${user.dealerDiscountPercent}% discount applied to your account.`
              : '.'}
          </p>
        )}
        {user?.dealerStatus === 'rejected' && (
          <p className="dealer-status-note">
            Your dealer application wasn't approved. Contact support via WhatsApp or the{' '}
            <Link to="/contact">contact page</Link> if you believe this is a mistake.
          </p>
        )}
      </div>

      <div className="stat-grid" style={{ marginTop: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{summary.count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Purchased</div>
          <div className="stat-value">{formatPrice(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dealer Discount</div>
          <div className="stat-value">{user?.dealerDiscountPercent || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Business</div>
          <div className="stat-value" style={{ fontSize: '1.05rem' }}>{user?.businessName || '—'}</div>
        </div>
      </div>

      <div className="analytics-panel" style={{ marginTop: 12 }}>
        <h3>Purchase History</h3>
        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p>No orders yet. <Link to="/shop">Start shopping wholesale parts →</Link></p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id.slice(-8).toUpperCase()}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                    <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
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
              {loadingMore ? 'Loading…' : 'Load more orders'}
            </button>
          </div>
        )}
      </div>

      <div className="promo-banner" style={{ marginTop: 12 }}>
        <div>
          <strong>Need a bulk quotation or invoice?</strong>
          <p>Message us on WhatsApp with your parts list and quantities for a fast wholesale quote and formal invoice.</p>
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
