import { useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';

const ALL_CATEGORIES = [
  'Display', 'OLED', 'LCD', 'Touch', 'Battery', 'Back Glass', 'Housing', 'Frame',
  'Camera', 'Charging Port', 'Speaker', 'Microphone', 'Flex', 'Logic Board',
  'Motherboard', 'IC', 'CPU', 'Buttons', 'SIM Tray', 'Fingerprint', 'Face ID',
  'Repair Tools', 'Accessories',
];
const ALL_BRANDS = [
  'Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola',
  'Sony', 'Huawei', 'Honor', 'Nothing', 'iQOO', 'POCO', 'Infinix', 'Tecno', 'Nokia', 'Walton', 'Symphony',
];
const emptyForm = {
  name: '', categories: ['Display'], price: '', compareAt: '', stock: '', images: [], desc: '',
  sku: '', brand: '', compatibleModels: '', moq: '1', dealerPrice: '', warranty: '', published: true,
};
const emptyCoupon = { code: '', type: 'percent', value: '', minSubtotal: '', usageLimit: '', usageLimitPerCustomer: '', expiresAt: '' };
const ORDER_STATUSES = ['processing', 'paid', 'shipped', 'delivered', 'cancelled'];

export default function Admin() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  usePageMeta('Admin Dashboard', 'Manage products, orders, and coupons.');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [couponError, setCouponError] = useState('');

  const [twoFA, setTwoFA] = useState({ enabled: false });
  const [setupData, setSetupData] = useState(null); // { secret, qrCode }
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');

  const [admins, setAdmins] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '' });
  const [newAdminError, setNewAdminError] = useState('');

  const [auditLogs, setAuditLogs] = useState([]);

  const [deliveryFeeInput, setDeliveryFeeInput] = useState('150');
  const [savingDeliveryFee, setSavingDeliveryFee] = useState(false);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [sslcommerzConfigured, setSslcommerzConfigured] = useState(true); // avoid a false warning flash before load
  const [savingOnlinePayment, setSavingOnlinePayment] = useState(false);

  const [banners, setBanners] = useState([]);
  const [bannerUploading, setBannerUploading] = useState(false);

  const [dealers, setDealers] = useState([]);
  const [dealerFilter, setDealerFilter] = useState('pending');
  const [dealerPage, setDealerPage] = useState(1);
  const [dealerTotalPages, setDealerTotalPages] = useState(1);
  const [dealerTotal, setDealerTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all'); // all | published | draft
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0, avgOrderValue: 0, pendingCount: 0, guestOrderCount: 0,
    statusCounts: {}, revenueByDay: [], topProducts: [],
  });
  const [quotes, setQuotes] = useState([]);
  const [quoteFilter, setQuoteFilter] = useState('pending');
  const [lowStock, setLowStock] = useState([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  // Uses the admin-only /admin/products endpoint (not the public /products
  // catalog listing), because the public one always filters to
  // published=true — that would silently hide every draft product from
  // this management table. See admin.routes.js for the full reasoning.
  // Every load* function below now catches its own fetch failure and
  // surfaces it as a toast — previously an unhandled rejection here (e.g.
  // session expired, network hiccup) left that tab's data silently empty
  // with no explanation, indistinguishable from "there's just nothing here".
  function loadProducts(page = productPage, search = productSearch, status = productStatusFilter) {
    const params = new URLSearchParams({ page, limit: 50, status });
    if (search) params.set('search', search);
    api.get(`/admin/products?${params}`).then((d) => {
      // The backend doesn't clamp an out-of-range page — deleting the last
      // product on the last page re-requests that same (now nonexistent)
      // page number and gets back 0 rows. Self-correct once by refetching
      // the new last page instead of leaving the table stuck empty.
      if (d.products.length === 0 && d.page > 1 && d.total > 0) {
        loadProducts(d.totalPages, search, status);
        return;
      }
      setProducts(d.products);
      setProductPage(d.page);
      setProductTotalPages(d.totalPages);
      setProductTotal(d.total);
    }).catch((err) => showToast(err.message, 'error'));
  }
  function onProductStatusChange(status) {
    setProductStatusFilter(status);
    loadProducts(1, productSearch, status);
  }
  function onProductSearchSubmit(e) {
    e.preventDefault();
    setProductSearch(productSearchInput);
    loadProducts(1, productSearchInput);
  }
  function loadOrders(page = orderPage, status = orderStatusFilter) {
    const params = new URLSearchParams({ page, limit: 25 });
    if (status) params.set('status', status);
    api.get(`/admin/orders?${params}`).then((d) => {
      // Same out-of-range-page self-correction as loadProducts above — the
      // backend doesn't clamp the page either here.
      if (d.orders.length === 0 && d.page > 1 && d.total > 0) {
        loadOrders(d.totalPages, status);
        return;
      }
      setOrders(d.orders);
      setOrderPage(d.page);
      setOrderTotalPages(d.totalPages);
      setOrderTotal(d.total);
    }).catch((err) => showToast(err.message, 'error'));
  }
  function loadAnalytics() {
    api.get('/admin/analytics').then((d) => setAnalytics(d)).catch((err) => showToast(err.message, 'error'));
  }
  function loadCoupons() {
    api.get('/admin/coupons').then((d) => setCoupons(d.coupons)).catch((err) => showToast(err.message, 'error'));
  }
  function loadMe() {
    api.get('/auth/me').then((d) => setTwoFA({ enabled: !!d.user.twoFAEnabled })).catch((err) => showToast(err.message, 'error'));
  }
  function loadAdmins() {
    api.get('/admin/admins').then((d) => setAdmins(d.admins)).catch((err) => showToast(err.message, 'error'));
  }
  function loadAuditLogs() {
    api.get('/admin/audit-logs').then((d) => setAuditLogs(d.logs)).catch((err) => showToast(err.message, 'error'));
  }
  function loadSettings() {
    api.get('/admin/settings').then((d) => {
      setDeliveryFeeInput(String(d.deliveryFee));
      setOnlinePaymentEnabled(!!d.onlinePaymentEnabled);
      setSslcommerzConfigured(!!d.sslcommerzConfigured);
    }).catch((err) => showToast(err.message, 'error'));
  }
  function loadBanners() {
    api.get('/admin/banners').then((d) => setBanners(d.banners)).catch((err) => showToast(err.message, 'error'));
  }
  function loadDealers(status = dealerFilter, page = 1) {
    const params = new URLSearchParams({ page, limit: 25 });
    if (status) params.set('status', status);
    api.get(`/admin/dealers?${params}`).then((d) => {
      // Same out-of-range-page self-correction as loadProducts above — the
      // backend doesn't clamp the page either here.
      if (d.dealers.length === 0 && d.page > 1 && d.total > 0) {
        loadDealers(status, d.totalPages);
        return;
      }
      setDealers(d.dealers);
      setDealerPage(d.page);
      setDealerTotalPages(d.totalPages);
      setDealerTotal(d.total);
    }).catch((err) => showToast(err.message, 'error'));
  }
  function loadQuotes(status = quoteFilter) {
    api.get(`/admin/quotes${status ? `?status=${status}` : ''}`).then((d) => setQuotes(d.quotes)).catch((err) => showToast(err.message, 'error'));
  }
  function loadLowStock() {
    api.get('/admin/inventory/low-stock').then((d) => setLowStock(d.products)).catch((err) => showToast(err.message, 'error'));
  }

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadAnalytics();
    loadCoupons();
    loadMe();
    loadAuditLogs();
    loadDealers();
    loadQuotes();
    loadLowStock();
    loadAdmins();
    loadSettings();
    loadBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSaveDeliveryFee(e) {
    e.preventDefault();
    setSavingDeliveryFee(true);
    try {
      const d = await api.put('/admin/settings', { deliveryFee: Number(deliveryFeeInput) });
      setDeliveryFeeInput(String(d.deliveryFee));
      showToast('Delivery fee updated', 'success');
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingDeliveryFee(false);
    }
  }

  async function onToggleOnlinePayment(e) {
    const next = e.target.checked;
    setSavingOnlinePayment(true);
    try {
      const d = await api.put('/admin/settings', { onlinePaymentEnabled: next });
      setOnlinePaymentEnabled(!!d.onlinePaymentEnabled);
      showToast(d.onlinePaymentEnabled ? 'Online payment enabled' : 'Online payment disabled', 'success');
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingOnlinePayment(false);
    }
  }

  async function onBannerImageSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBannerUploading(true);
    try {
      const data = await api.uploadMultiple('/admin/upload-multiple', files);
      // Each newly uploaded image becomes its own banner slide, appended
      // after whatever's already there (sortOrder = current count + i).
      for (let i = 0; i < data.urls.length; i++) {
        await api.post('/admin/banners', { imageUrl: data.urls[i], sortOrder: banners.length + i });
      }
      showToast(data.urls.length > 1 ? `${data.urls.length} banners added` : 'Banner added', 'success');
      loadBanners();
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  }

  async function updateBanner(id, patch) {
    try {
      await api.put(`/admin/banners/${id}`, patch);
      loadBanners();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function deleteBanner(id) {
    if (!window.confirm('Remove this banner?')) return;
    try {
      await api.del(`/admin/banners/${id}`);
      showToast('Banner removed', 'success');
      loadBanners();
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function moveBanner(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const a = banners[index];
    const b = banners[target];
    // Swap sortOrder between the two neighbors, then reload — simplest way
    // to reorder without a dedicated bulk-reorder endpoint.
    Promise.all([
      api.put(`/admin/banners/${a.id}`, { sortOrder: b.sortOrder }),
      api.put(`/admin/banners/${b.id}`, { sortOrder: a.sortOrder }),
    ])
      .then(loadBanners)
      .catch((err) => showToast(err.message, 'error'));
  }

  async function setDealerStatus(id, status) {
    try {
      await api.patch(`/admin/dealers/${id}/status`, { status });
      showToast(`Dealer ${status}`, 'success');
      loadDealers();
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function setDealerDiscount(id, discount) {
    try {
      await api.patch(`/admin/dealers/${id}/status`, { status: 'approved', dealerDiscountPercent: discount });
      showToast('Dealer discount updated', 'success');
      loadDealers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function updateQuote(id, patch) {
    try {
      await api.patch(`/admin/quotes/${id}`, patch);
      showToast('Quote updated', 'success');
      loadQuotes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ---- Excel export/import (SheetJS reads/writes the .xlsx client-side;
  // the backend just accepts/returns plain JSON rows — see admin.routes.js) ----
  async function exportProductsToExcel() {
    setExportBusy(true);
    try {
      const { products: all } = await api.get('/admin/products/export');
      const rows = all.map((p) => ({
        name: p.name,
        desc: p.desc,
        category: p.category,
        categories: (p.categories || []).join(','),
        price: p.price,
        compareAt: p.compareAt || '',
        stock: p.stock,
        sku: p.sku || '',
        brand: p.brand || '',
        compatibleModels: (p.compatibleModels || []).join(','),
        moq: p.moq,
        dealerPrice: p.dealerPrice || '',
        warranty: p.warranty || '',
        lowStockThreshold: p.lowStockThreshold,
        images: (p.images || []).join(','),
      }));
      // Loaded on demand — xlsx is a large library and most admin sessions
      // never touch export/import, so it shouldn't slow down every visit
      // to the dashboard.
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, 'Products');
      XLSX.writeFile(wb, `noyon-telecom-products-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast(`Exported ${rows.length} products`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExportBusy(false);
    }
  }

  async function importProductsFromExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    setImportResult(null);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const data = await api.post('/admin/products/import', { rows });
      setImportResult(data);
      showToast(`Imported: ${data.created} created, ${data.updated} updated`, data.errors.length ? 'error' : 'success');
      setProductSearchInput('');
      setProductSearch('');
      loadProducts(1, '');
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setImportBusy(false);
      e.target.value = '';
    }
  }

  // ---- Backup / Restore (application-level JSON snapshot) ----
  async function exportBackup() {
    setBackupBusy(true);
    try {
      const data = await api.get('/admin/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noyon-telecom-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBackupBusy(false);
    }
  }

  async function restoreBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Restore will create/overwrite products found in this backup file. Continue?')) {
      e.target.value = '';
      return;
    }
    setRestoreBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = await api.post('/admin/backup/restore', { products: parsed.products || [] });
      showToast(`Restored ${data.restored} of ${data.attempted} products`, 'success');
      setProductSearchInput('');
      setProductSearch('');
      loadProducts(1, '');
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRestoreBusy(false);
      e.target.value = '';
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      categories: Array.isArray(p.categories) && p.categories.length ? p.categories : [p.category],
      price: p.price,
      compareAt: p.compareAt || '',
      stock: p.stock,
      images: Array.isArray(p.images) && p.images.length ? p.images : [p.img],
      desc: p.desc,
      sku: p.sku || '',
      brand: p.brand || '',
      compatibleModels: Array.isArray(p.compatibleModels) ? p.compatibleModels.join(', ') : '',
      moq: p.moq || '1',
      dealerPrice: p.dealerPrice || '',
      warranty: p.warranty || '',
      published: p.published !== false,
    });
    setShowForm(true);
  }

  const productNameRef = useRef(null);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    // The form was already open (e.g. editing) or just mounted — either
    // way, focus needs to happen after the input exists/re-renders.
    setTimeout(() => productNameRef.current?.focus(), 0);
  }

  // Enter key moves to the next field instead of submitting — the form has
  // ~14 fields, and submitting after the first one (Product name) would be
  // a data-entry trap, not a shortcut. Textareas keep their normal Enter
  // (newline) behavior. Only the explicit "Create product"/"Save changes"
  // button submits.
  function focusNextFieldOnEnter(e) {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    const focusable = Array.from(
      e.currentTarget.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    const idx = focusable.indexOf(e.target);
    if (idx > -1 && idx < focusable.length - 1) focusable[idx + 1].focus();
  }

  async function onImagesSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (form.images.length + files.length > 8) {
      showToast('You can add up to 8 images per product', 'error');
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const data = await api.uploadMultiple('/admin/upload-multiple', files);
      setForm((f) => ({ ...f, images: [...f.images, ...data.urls] }));
      showToast(data.urls.length > 1 ? `${data.urls.length} images uploaded` : 'Image uploaded', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function addImageUrl() {
    setForm((f) => ({ ...f, images: [...f.images, ''] }));
  }

  function updateImageUrl(i, value) {
    setForm((f) => ({ ...f, images: f.images.map((img, idx) => (idx === i ? value : img)) }));
  }

  function removeImage(i) {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  function toggleCategory(cat) {
    setForm((f) => {
      const has = f.categories.includes(cat);
      const next = has ? f.categories.filter((c) => c !== cat) : [...f.categories, cat];
      return { ...f, categories: next.length ? next : f.categories }; // always keep at least one
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const images = form.images.map((i) => i.trim()).filter(Boolean);
    if (images.length === 0) {
      setError('Add at least one product image');
      return;
    }
    const payload = {
      name: form.name,
      desc: form.desc,
      categories: form.categories,
      category: form.categories[0],
      images,
      img: images[0],
      price: parseFloat(form.price),
      compareAt: form.compareAt ? parseFloat(form.compareAt) : null,
      stock: parseInt(form.stock, 10),
      sku: form.sku.trim() || null,
      brand: form.brand || null,
      compatibleModels: form.compatibleModels
        ? form.compatibleModels.split(',').map((m) => m.trim()).filter(Boolean)
        : [],
      moq: parseInt(form.moq, 10) || 1,
      dealerPrice: form.dealerPrice ? parseFloat(form.dealerPrice) : null,
      warranty: form.warranty.trim() || null,
      published: form.published !== false,
    };
    try {
      if (editingId) {
        await api.put(`/admin/products/${editingId}`, payload);
        loadProducts(); // stay on the current page/search
        setShowForm(false);
      } else {
        await api.post('/admin/products', payload);
        setProductSearchInput('');
        setProductSearch('');
        // Also clear a Drafts-only/Published-only filter — otherwise a new
        // product whose published state doesn't match the active filter
        // would vanish immediately after the "Product created" toast,
        // contradicting the comment below's promise that it'll be visible.
        setProductStatusFilter('all');
        loadProducts(1, '', 'all'); // new products sort first — jump to page 1 so it's visible
        // Keep the form open for the next product instead of closing it —
        // a batch of similar parts (same category/brand/MOQ/warranty,
        // different name/photo/price) is the common case, and reopening +
        // re-picking those every time was the slow part. Only the
        // product-specific fields reset; the "batch" fields carry over.
        setForm((f) => ({
          ...emptyForm,
          categories: f.categories,
          brand: f.brand,
          moq: f.moq,
          dealerPrice: f.dealerPrice,
          warranty: f.warranty,
          published: f.published,
        }));
        setTimeout(() => productNameRef.current?.focus(), 0);
      }
      loadAuditLogs();
      showToast(editingId ? 'Product updated' : 'Product created — ready for the next one', 'success');
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.del(`/admin/products/${id}`);
      loadProducts();
      loadAuditLogs();
      showToast('Product deleted', 'success');
    } catch (err) {
      // Most common cause: the product has order history and is protected
      // from deletion (see admin.routes.js) — the backend already sends a
      // specific, actionable message for that case, so just surface it.
      showToast(err.message, 'error');
    }
  }

  async function onStatusChange(orderId, status) {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      loadOrders();
      loadAnalytics();
      loadAuditLogs();
      showToast('Order status updated', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function onCreateCoupon(e) {
    e.preventDefault();
    setCouponError('');
    try {
      await api.post('/admin/coupons', {
        code: couponForm.code,
        type: couponForm.type,
        value: parseFloat(couponForm.value),
        minSubtotal: couponForm.minSubtotal ? parseFloat(couponForm.minSubtotal) : 0,
        usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit, 10) : null,
        usageLimitPerCustomer: couponForm.usageLimitPerCustomer ? parseInt(couponForm.usageLimitPerCustomer, 10) : null,
        expiresAt: couponForm.expiresAt || null,
      });
      setCouponForm(emptyCoupon);
      loadCoupons();
      loadAuditLogs();
      showToast('Coupon created', 'success');
    } catch (err) {
      setCouponError(err.message);
    }
  }

  async function onToggleCoupon(c) {
    try {
      await api.put(`/admin/coupons/${c.id}`, { active: !c.active });
      loadCoupons();
      loadAuditLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function onDeleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return;
    try {
      await api.del(`/admin/coupons/${id}`);
      loadCoupons();
      loadAuditLogs();
      showToast('Coupon deleted', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function onStartTwoFASetup() {
    setTwoFAError('');
    try {
      const data = await api.post('/admin/2fa/setup');
      setSetupData(data);
    } catch (err) {
      setTwoFAError(err.message);
    }
  }

  async function onEnableTwoFA(e) {
    e.preventDefault();
    setTwoFAError('');
    try {
      await api.post('/admin/2fa/enable', { code: twoFACode });
      setSetupData(null);
      setTwoFACode('');
      setTwoFA({ enabled: true });
      loadAuditLogs();
      showToast('Two-factor authentication enabled', 'success');
    } catch (err) {
      setTwoFAError(err.message);
    }
  }

  async function onCreateAdmin(e) {
    e.preventDefault();
    setNewAdminError('');
    try {
      await api.post('/admin/admins', newAdminForm);
      setNewAdminForm({ name: '', email: '', password: '' });
      loadAdmins();
      loadAuditLogs();
      showToast('Admin account created', 'success');
    } catch (err) {
      setNewAdminError(err.message);
    }
  }

  async function onDisableTwoFA() {
    if (!confirm('Disable two-factor authentication on this admin account?')) return;
    // Backend now requires the current 6-digit code to disable 2FA (not
    // just a valid session) — same proof-of-possession already required to
    // enable it, so a hijacked session alone can't silently strip 2FA.
    const code = prompt('Enter your current 6-digit authenticator code to confirm:');
    if (!code) return;
    try {
      await api.post('/admin/2fa/disable', { code });
      setTwoFA({ enabled: false });
      loadAuditLogs();
      showToast('Two-factor authentication disabled', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Revenue, top products, and the 14-day chart come from GET /admin/analytics
  // (real database aggregation — see loadAnalytics above), not from summing
  // whatever page of `orders` happens to be loaded. That keeps the numbers
  // correct regardless of how many orders the store has or which page/filter
  // the Orders tab is currently on.
  const maxStatusCount = useMemo(
    () => Math.max(1, ...Object.values(analytics.statusCounts || {})),
    [analytics.statusCounts]
  );
  const maxDayRevenue = useMemo(
    () => Math.max(1, ...(analytics.revenueByDay || []).map((d) => d.total)),
    [analytics.revenueByDay]
  );
  const revenueLast14Days = useMemo(
    () => (analytics.revenueByDay || []).reduce((sum, d) => sum + d.total, 0),
    [analytics.revenueByDay]
  );

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Store management</span>
        <h1 className="page-title">
          Admin <em>panel</em>
        </h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>Analytics</button>
        <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Products</button>
        <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders ({orderTotal})</button>
        <button className={`tab ${tab === 'dealers' ? 'active' : ''}`} onClick={() => setTab('dealers')}>
          Dealers {dealerFilter === 'pending' && dealerTotal > 0 && `(${dealerTotal})`}
        </button>
        <button className={`tab ${tab === 'quotes' ? 'active' : ''}`} onClick={() => setTab('quotes')}>RFQs {quotes.length > 0 && quoteFilter === 'pending' && `(${quotes.length})`}</button>
        <button className={`tab ${tab === 'coupons' ? 'active' : ''}`} onClick={() => setTab('coupons')}>Coupons ({coupons.length})</button>
        <button className={`tab ${tab === 'data' ? 'active' : ''}`} onClick={() => setTab('data')}>Import / Export</button>
        <button className={`tab ${tab === 'banners' ? 'active' : ''}`} onClick={() => setTab('banners')}>Banners ({banners.length})</button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Settings</button>
        <button className={`tab ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>Security</button>
        <button className={`tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>Audit log</button>
      </div>

      {tab === 'analytics' && (
        <div style={{ paddingBottom: 80 }}>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total revenue</div>
              <div className="stat-value">{formatPrice(analytics.totalRevenue)}</div>
              <div className="stat-sub">Excludes cancelled orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total orders</div>
              <div className="stat-value">{orderTotal}</div>
              <div className="stat-sub">{analytics.guestOrderCount} from guests</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg. order value</div>
              <div className="stat-value">{formatPrice(analytics.avgOrderValue)}</div>
              <div className="stat-sub">Per non-cancelled order</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Needs attention</div>
              <div className="stat-value">{analytics.pendingCount}</div>
              <div className="stat-sub">Processing or paid, not yet shipped</div>
            </div>
          </div>

          <div className="analytics-panel">
            <h3>Revenue — last 14 days</h3>
            {revenueLast14Days === 0 ? (
              <p style={{ color: '#9a8f8a', fontSize: '0.86rem' }}>No revenue yet in this window.</p>
            ) : (
              <div className="bar-chart">
                {analytics.revenueByDay.map((d) => {
                  // /admin/analytics returns dates as JSON (ISO strings), not
                  // Date instances — calling Date methods directly on d.date
                  // threw a TypeError that crashed this whole tab.
                  const date = new Date(d.date);
                  return (
                    <div className="bar-col" key={date.toISOString()} title={`${date.toLocaleDateString()}: ${formatPrice(d.total)}`}>
                      <div
                        className="bar"
                        style={{ height: `${Math.max(2, (d.total / maxDayRevenue) * 100)}%` }}
                      />
                      <div className="bar-label">{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="analytics-panel">
            <h3>Orders by status</h3>
            {ORDER_STATUSES.map((s) => (
              <div className="status-bar-row" key={s}>
                <span className="status-name">{s}</span>
                <div className="status-track">
                  <div
                    className="status-fill"
                    style={{ width: `${(analytics.statusCounts[s] / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="status-count">{analytics.statusCounts[s]}</span>
              </div>
            ))}
          </div>

          <div className="analytics-panel">
            <h3>Top-selling products <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#9a8f8a' }}>(last 90 days)</span></h3>
            {analytics.topProducts.length === 0 ? (
              <p style={{ color: '#9a8f8a', fontSize: '0.86rem' }}>No sales yet.</p>
            ) : (
              analytics.topProducts.map((p, idx) => (
                <div className="top-product-row" key={p.name + idx}>
                  <span className="rank">#{idx + 1}</span>
                  <span className="tp-name">{p.name}</span>
                  <span className="tp-qty">{p.qty} sold</span>
                  <span style={{ fontWeight: 700 }}>{formatPrice(p.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div style={{ paddingBottom: 80 }}>
          <div className="admin-toolbar">
            <span>{productTotal} product{productTotal === 1 ? '' : 's'}</span>
            <button className="btn btn-primary" onClick={startNew}>+ Add product</button>
          </div>

          <form onSubmit={onProductSearchSubmit} className="field-row" style={{ marginBottom: 16, alignItems: 'center' }}>
            <input
              value={productSearchInput}
              onChange={(e) => setProductSearchInput(e.target.value)}
              placeholder="Search by name, SKU, or brand…"
              style={{ maxWidth: 320 }}
              aria-label="Search products"
            />
            <button type="submit" className="btn btn-outline btn-sm">Search</button>
            {productSearch && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setProductSearchInput('');
                  setProductSearch('');
                  loadProducts(1, '');
                }}
              >
                Clear
              </button>
            )}
            <select
              className="select"
              value={productStatusFilter}
              onChange={(e) => onProductStatusChange(e.target.value)}
              aria-label="Filter by publish status"
              style={{ maxWidth: 160 }}
            >
              <option value="all">All products</option>
              <option value="published">Published only</option>
              <option value="draft">Drafts only</option>
            </select>
          </form>

          {showForm && (
            <form onSubmit={onSubmit} onKeyDown={focusNextFieldOnEnter} className="form-panel wide" style={{ marginBottom: 30 }}>
              {error && <div className="form-error">{error}</div>}
              <div className="field-row">
                <div className="field">
                  <label>Product name</label>
                  <input required ref={productNameRef} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Categories</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', paddingTop: 8 }}>
                    {ALL_CATEGORIES.map((c) => (
                      <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', fontWeight: 400, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.categories.includes(c)} onChange={() => toggleCategory(c)} />
                        {c}
                      </label>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#9a8f8a' }}>Pick one or more — this product will show up under each.</span>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Price (৳)</label>
                  <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="field">
                  <label>Compare-at price (optional)</label>
                  <input type="number" step="0.01" value={form.compareAt} onChange={(e) => setForm({ ...form, compareAt: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Stock</label>
                  <input required type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="field">
                  <label>SKU</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. NT-DIS-IP13-OLED" />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Brand</label>
                  <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                    <option value="">— Not brand-specific —</option>
                    {ALL_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Compatible models (comma-separated)</label>
                  <input
                    value={form.compatibleModels}
                    onChange={(e) => setForm({ ...form, compatibleModels: e.target.value })}
                    placeholder="e.g. iPhone 13, iPhone 13 Pro"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>MOQ (minimum order quantity)</label>
                  <input required type="number" min="1" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} />
                </div>
                <div className="field">
                  <label>Dealer price (৳, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.dealerPrice}
                    onChange={(e) => setForm({ ...form, dealerPrice: e.target.value })}
                    placeholder="Falls back to retail price if empty"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Warranty</label>
                  <input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="e.g. 30 Days, 7 Days Testing Warranty" />
                </div>
                <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                  <input
                    type="checkbox"
                    id="published-toggle"
                    checked={form.published !== false}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <label htmlFor="published-toggle" style={{ margin: 0 }}>
                    Published (visible to customers)
                  </label>
                </div>
              </div>
              {form.published === false && (
                <p style={{ color: 'var(--accent, #f5720c)', fontSize: '0.85rem', marginTop: '-8px' }}>
                  This product is hidden from the storefront — customers can't see it until you check "Published"
                  (e.g. once you've set a real price and photo).
                </p>
              )}

              <div className="field">
                <label>Product images (gallery, up to 8 — the first one is used as the thumbnail)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  {form.images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      {img ? (
                        <img
                          src={resolveImg(img)}
                          alt={`Product ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          style={{ width: 72, height: 72, objectFit: 'cover', border: i === 0 ? '2px solid var(--berry)' : '1px solid var(--line)' }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                        />
                      ) : (
                        <input
                          autoFocus
                          value={img}
                          onChange={(e) => updateImageUrl(i, e.target.value)}
                          placeholder="Paste image URL"
                          style={{ width: 140, height: 72, fontSize: '0.75rem' }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                        style={{
                          position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%',
                          background: '#2b2320', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.7rem', lineHeight: '20px',
                        }}
                      >
                        ×
                      </button>
                      {i === 0 && (
                        <span style={{ position: 'absolute', bottom: -6, left: 0, fontSize: '0.62rem', background: 'var(--berry)', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>
                          Thumbnail
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label className="btn btn-outline" style={{ padding: '10px 14px', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {uploading ? 'Uploading…' : 'Upload photos'}
                    <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={onImagesSelected} style={{ display: 'none' }} />
                  </label>
                  <button type="button" className="btn btn-outline" style={{ padding: '10px 14px', fontSize: '0.8rem' }} onClick={addImageUrl}>
                    + Paste URL instead
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea required rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-berry">{editingId ? 'Save changes' : 'Create product'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {products.length === 0 ? (
            <p>{productSearch ? `No products match "${productSearch}".` : 'No products yet.'}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Product" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={resolveImg(p.img)} alt={p.name} loading="lazy" decoding="async" style={{ width: 36, height: 36, objectFit: 'cover' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
                        {p.name}
                        {p.published === false && (
                          <span style={{ fontSize: '0.7rem', background: '#f5720c', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                            Draft
                          </span>
                        )}
                      </td>
                      <td data-label="Category">
                        {(p.categories && p.categories.length ? p.categories : [p.category]).join(', ')}
                        {p.images && p.images.length > 1 && (
                          <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#9a8f8a' }}>· {p.images.length} photos</span>
                        )}
                      </td>
                      <td data-label="Brand">
                        {p.brand ? p.brand : (
                          <span style={{ color: '#9a8f8a', fontStyle: 'italic' }} title="No brand set — this product won't show up when a customer filters the Shop page by brand.">
                            — not set —
                          </span>
                        )}
                      </td>
                      <td data-label="Price">{formatPrice(p.price)}</td>
                      <td data-label="Stock">{p.stock}</td>
                      <td data-label="Actions">
                        <button className="remove-link" style={{ marginRight: 12 }} onClick={() => startEdit(p)}>Edit</button>
                        <button className="remove-link" onClick={() => onDelete(p.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {productTotalPages > 1 && (
            <div className="field-row" style={{ justifyContent: 'center', marginTop: 20, alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={productPage <= 1}
                onClick={() => loadProducts(productPage - 1, productSearch)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Page {productPage} of {productTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={productPage >= productTotalPages}
                onClick={() => loadProducts(productPage + 1, productSearch)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div style={{ paddingBottom: 80 }}>
          <div className="field-row" style={{ marginBottom: 16, alignItems: 'center' }}>
            <select
              className="select"
              value={orderStatusFilter}
              onChange={(e) => {
                const status = e.target.value;
                setOrderStatusFilter(status);
                loadOrders(1, status);
              }}
              style={{ maxWidth: 200 }}
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              {orderTotal} order{orderTotal === 1 ? '' : 's'} total
            </span>
          </div>
          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            orders.map((o) => (
              <div className="order-card" key={o.id}>
                <div className="order-card-head">
                  <div>
                    {/* Short code matches what the customer was actually told
                        (SMS/email/Invoice all use the same last-8 format) —
                        full id is still there via the title tooltip for admins
                        who need to copy/paste the exact internal id. */}
                    <strong title={o.id}>Order #{o.id.slice(-8).toUpperCase()}</strong>
                    {!o.userId && (
                      <span className="card-tag" style={{ marginLeft: 8, background: 'var(--muted)', fontSize: '0.68rem' }}>Guest</span>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {o.shipping?.name} · {o.shipping?.city} · {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <select
                    className="select"
                    value={o.status}
                    onChange={(e) => onStatusChange(o.id, e.target.value)}
                    style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="summary-row total">
                  <span>{o.items.length} item(s)</span>
                  <span>{formatPrice(o.total)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                >
                  {expandedOrderId === o.id ? 'Hide details' : 'View details'}
                </button>

                {expandedOrderId === o.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16, fontSize: '0.85rem' }}>
                      <div>
                        <strong>Ship to</strong>
                        <div style={{ color: 'var(--muted)' }}>
                          {o.shipping?.name}<br />
                          {o.shipping?.phone}<br />
                          {o.shipping?.email}<br />
                          {o.shipping?.address}, {o.shipping?.city}
                        </div>
                      </div>
                      <div>
                        <strong>Payment</strong>
                        <div style={{ color: 'var(--muted)' }}>
                          Method: {o.paymentMethod === 'cod' ? 'Cash on delivery' : o.paymentMethod}<br />
                          {o.couponCode && <>Coupon: {o.couponCode}<br /></>}
                          {o.transactionId && <>Transaction ID: {o.transactionId}<br /></>}
                        </div>
                      </div>
                    </div>

                    {o.items.map((i) => (
                      <div className="mini-item" key={i.productId}>
                        <img
                          src={resolveImg(i.img)}
                          alt={i.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ color: 'var(--muted)' }}>Qty {i.qty} &times; {formatPrice(i.price)}</div>
                        </div>
                        <div style={{ fontWeight: 700 }}>{formatPrice(i.price * i.qty)}</div>
                      </div>
                    ))}

                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>{formatPrice(o.subtotal)}</span>
                    </div>
                    {o.discount > 0 && (
                      <div className="summary-row">
                        <span>Discount</span>
                        <span>-{formatPrice(o.discount)}</span>
                      </div>
                    )}
                    <div className="summary-row">
                      <span>Shipping</span>
                      <span>{formatPrice(o.shippingFee)}</span>
                    </div>
                    {o.tax > 0 && (
                      <div className="summary-row">
                        <span>Tax</span>
                        <span>{formatPrice(o.tax)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total</span>
                      <span>{formatPrice(o.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {orderTotalPages > 1 && (
            <div className="field-row" style={{ justifyContent: 'center', marginTop: 20, alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={orderPage <= 1}
                onClick={() => loadOrders(orderPage - 1, orderStatusFilter)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Page {orderPage} of {orderTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={orderPage >= orderTotalPages}
                onClick={() => loadOrders(orderPage + 1, orderStatusFilter)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      {tab === 'coupons' && (
        <div style={{ paddingBottom: 80 }}>
          <form onSubmit={onCreateCoupon} className="form-panel wide" style={{ marginBottom: 30 }}>
            {couponError && <div className="form-error">{couponError}</div>}
            <div className="field-row">
              <div className="field">
                <label>Code</label>
                <input
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE10"
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Value {couponForm.type === 'percent' ? '(%)' : '(৳)'}</label>
                <input required type="number" step="0.01" max={couponForm.type === 'percent' ? 100 : undefined} value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} />
              </div>
              <div className="field">
                <label>Minimum order (৳, optional)</label>
                <input type="number" step="0.01" value={couponForm.minSubtotal} onChange={(e) => setCouponForm({ ...couponForm, minSubtotal: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Max total uses (optional)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Unlimited"
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Max uses per customer (optional)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Unlimited"
                  value={couponForm.usageLimitPerCustomer}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimitPerCustomer: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Expires on (optional)</label>
                <input
                  type="date"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <button className="btn btn-berry">Create coupon</button>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min order</th>
                  <th>Limits</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Code"><strong>{c.code}</strong></td>
                    <td data-label="Discount">{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}</td>
                    <td data-label="Min order">{c.minSubtotal ? formatPrice(c.minSubtotal) : '—'}</td>
                    <td data-label="Limits" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {!c.usageLimit && !c.usageLimitPerCustomer && !c.expiresAt
                        ? 'Unlimited'
                        : [
                            c.usageLimit ? `${c.usageLimit} total` : null,
                            c.usageLimitPerCustomer ? `${c.usageLimitPerCustomer}/customer` : null,
                            c.expiresAt ? `until ${new Date(c.expiresAt).toLocaleDateString()}` : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                    </td>
                    <td data-label="Status">{c.active ? 'Active' : 'Disabled'}</td>
                    <td data-label="Actions">
                      <button className="remove-link" style={{ marginRight: 12 }} onClick={() => onToggleCoupon(c)}>
                        {c.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="remove-link" onClick={() => onDeleteCoupon(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={6}>No coupons yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dealers' && (
        <div style={{ paddingBottom: 80 }}>
          <div className="admin-toolbar">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['pending', 'approved', 'rejected', ''].map((s) => (
                <button
                  key={s || 'all'}
                  className={`tab ${dealerFilter === s ? 'active' : ''}`}
                  style={{ padding: '8px 16px' }}
                  onClick={() => {
                    setDealerFilter(s);
                    loadDealers(s);
                  }}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Discount %</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Business">
                      <strong>{d.businessName || '—'}</strong>
                      <div style={{ fontSize: '0.76rem', color: '#9a8f8a' }}>{d.address || ''}</div>
                      {d.dealerVerifiedAt && <span className="dealer-status-pill" style={{ marginTop: 4, display: 'inline-block' }}>✓ Verified</span>}
                      {d.tradeLicenseUrl && (
                        <div style={{ marginTop: 4 }}>
                          <a href={resolveImg(d.tradeLicenseUrl)} target="_blank" rel="noreferrer" style={{ fontSize: '0.76rem', color: 'var(--berry)', fontWeight: 600 }}>
                            📄 View trade license
                          </a>
                        </div>
                      )}
                    </td>
                    <td data-label="Contact">
                      {d.name}<br />
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{d.email} · {d.phone}</span>
                    </td>
                    <td data-label="Status"><span className={`status-badge status-${d.dealerStatus === 'approved' ? 'paid' : d.dealerStatus === 'rejected' ? 'cancelled' : 'processing'}`}>{d.dealerStatus}</span></td>
                    <td data-label="Discount %">
                      <input
                        type="number"
                        className="select"
                        style={{ width: 70 }}
                        defaultValue={d.dealerDiscountPercent}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v !== d.dealerDiscountPercent) setDealerDiscount(d.id, v);
                        }}
                      />
                    </td>
                    <td data-label="Applied" style={{ fontSize: '0.8rem' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: 6 }}>
                        {d.dealerStatus !== 'approved' && (
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => setDealerStatus(d.id, 'approved')}>Approve</button>
                        )}
                        {d.dealerStatus !== 'rejected' && (
                          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => setDealerStatus(d.id, 'rejected')}>Reject</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {dealers.length === 0 && <tr><td colSpan={6}>No dealer applications in this view.</td></tr>}
              </tbody>
            </table>
          </div>
          {dealerTotalPages > 1 && (
            <div className="field-row" style={{ justifyContent: 'center', marginTop: 20, alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={dealerPage <= 1}
                onClick={() => loadDealers(dealerFilter, dealerPage - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Page {dealerPage} of {dealerTotalPages} ({dealerTotal} total)
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={dealerPage >= dealerTotalPages}
                onClick={() => loadDealers(dealerFilter, dealerPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'quotes' && (
        <div style={{ paddingBottom: 80 }}>
          <div className="admin-toolbar">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['pending', 'responded', 'closed', ''].map((s) => (
                <button
                  key={s || 'all'}
                  className={`tab ${quoteFilter === s ? 'active' : ''}`}
                  style={{ padding: '8px 16px' }}
                  onClick={() => {
                    setQuoteFilter(s);
                    loadQuotes(s);
                  }}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          {quotes.length === 0 ? (
            <div className="empty-state"><p>No RFQs in this view.</p></div>
          ) : (
            quotes.map((q) => (
              <div className="order-card" key={q.id}>
                <div className="order-card-head">
                  <div>
                    <strong>{q.name}</strong>{q.businessName ? ` · ${q.businessName}` : ''}
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{q.email} · {q.phone} · {new Date(q.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`status-badge status-${q.status === 'closed' ? 'cancelled' : q.status === 'responded' ? 'paid' : 'processing'}`}>{q.status}</span>
                </div>
                <div style={{ fontSize: '0.86rem', marginBottom: 10 }}>
                  {(q.items || []).map((i, idx) => (
                    <div key={idx}>• {i.name} × {i.qty}{i.sku ? ` (${i.sku})` : ''}</div>
                  ))}
                </div>
                {q.message && <p style={{ fontSize: '0.84rem', color: 'var(--muted)', marginBottom: 10 }}>"{q.message}"</p>}
                <div className="field-row">
                  <div className="field">
                    <label>Admin note</label>
                    <input
                      defaultValue={q.adminNote || ''}
                      onBlur={(e) => e.target.value !== (q.adminNote || '') && updateQuote(q.id, { adminNote: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Quoted total (৳)</label>
                    <input
                      type="number"
                      defaultValue={q.quotedTotal || ''}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (parseFloat(v) !== q.quotedTotal) updateQuote(q.id, { quotedTotal: v });
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {q.status !== 'responded' && (
                    <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => updateQuote(q.id, { status: 'responded' })}>Mark responded</button>
                  )}
                  {q.status !== 'closed' && (
                    <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => updateQuote(q.id, { status: 'closed' })}>Close</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'data' && (
        <div style={{ paddingBottom: 80 }}>
          {lowStock.length > 0 && (
            <div className="analytics-panel" style={{ borderLeft: '4px solid #a13a3a' }}>
              <h3>⚠️ Low Stock Alert ({lowStock.length})</h3>
              {lowStock.slice(0, 10).map((p) => (
                <div className="top-product-row" key={p.id}>
                  <span className="tp-name">{p.name} {p.sku ? `(${p.sku})` : ''}</span>
                  <span className="tp-qty">{p.stock} left</span>
                </div>
              ))}
            </div>
          )}

          <div className="analytics-panel">
            <h3>Excel Import / Export</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)', marginBottom: 16 }}>
              Export the full catalog to .xlsx for offline editing, or bulk-import products from a spreadsheet —
              rows are matched to existing products by SKU (matching SKU updates it, new SKU creates it).
              Required columns: <code>name</code>, <code>price</code>, <code>category</code>.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-outline" disabled={exportBusy} onClick={exportProductsToExcel}>
                {exportBusy ? 'Exporting…' : '📤 Export Products (.xlsx)'}
              </button>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                {importBusy ? 'Importing…' : '📥 Import Products (.xlsx)'}
                <input type="file" accept=".xlsx,.xls,.csv" hidden disabled={importBusy} onChange={importProductsFromExcel} />
              </label>
            </div>
            {importResult && (
              <div style={{ marginTop: 16, fontSize: '0.84rem' }}>
                <p><strong>{importResult.created}</strong> created, <strong>{importResult.updated}</strong> updated.</p>
                {importResult.errors.length > 0 && (
                  <ul style={{ color: '#a13a3a' }}>
                    {importResult.errors.map((er, i) => (
                      <li key={i}>Row {er.row}: {er.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="analytics-panel">
            <h3>Backup &amp; Restore</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)', marginBottom: 16 }}>
              A JSON snapshot of your products, coupons, and dealer accounts — useful for quick recovery or
              migrating between environments. This is an application-level backup, not a substitute for real
              database backups (configure automated Postgres backups at your hosting provider too).
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" disabled={backupBusy} onClick={exportBackup}>
                {backupBusy ? 'Preparing…' : '💾 Download Backup (.json)'}
              </button>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                {restoreBusy ? 'Restoring…' : '♻️ Restore Products from Backup'}
                <input type="file" accept=".json" hidden disabled={restoreBusy} onChange={restoreBackup} />
              </label>
            </div>
          </div>
        </div>
      )}

      {tab === 'banners' && (
        <div style={{ paddingBottom: 80, maxWidth: 720 }}>
          <div className="form-panel wide">
            <h3 style={{ marginBottom: 10 }}>Homepage banners</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: '0.85rem' }}>
              Images shown in the homepage's top carousel. Upload one or more images, optionally point each at a
              page (e.g. <code>/shop?category=Display</code>) or an external link. While at least one banner is
              active, it replaces the default hero slides — turn all banners off (or delete them) to go back to the
              default.
            </p>

            <label className="btn btn-primary" style={{ cursor: 'pointer', marginBottom: 20, display: 'inline-block' }}>
              {bannerUploading ? 'Uploading…' : '+ Upload banner image(s)'}
              <input type="file" accept="image/*" multiple hidden disabled={bannerUploading} onChange={onBannerImageSelected} />
            </label>

            {banners.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No banners yet — the homepage is showing the default hero slides.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {banners.map((b, i) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex', gap: 14, alignItems: 'center', padding: 12,
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      opacity: b.active ? 1 : 0.55,
                    }}
                  >
                    <img
                      src={resolveImg(b.imageUrl)}
                      alt=""
                      style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="field" style={{ marginBottom: 6 }}>
                        <input
                          placeholder="Link (optional) — e.g. /shop?category=Display"
                          defaultValue={b.linkUrl || ''}
                          onBlur={(e) => {
                            if (e.target.value !== (b.linkUrl || '')) updateBanner(b.id, { linkUrl: e.target.value });
                          }}
                        />
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                        <input type="checkbox" checked={b.active} onChange={(e) => updateBanner(b.id, { active: e.target.checked })} />
                        Active
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button type="button" className="btn btn-outline" disabled={i === 0} onClick={() => moveBanner(i, -1)} style={{ padding: '4px 10px' }}>↑</button>
                      <button type="button" className="btn btn-outline" disabled={i === banners.length - 1} onClick={() => moveBanner(i, 1)} style={{ padding: '4px 10px' }}>↓</button>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => deleteBanner(b.id)} style={{ color: '#b3261e', borderColor: '#b3261e' }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div style={{ paddingBottom: 80, maxWidth: 480 }}>
          <div className="form-panel wide">
            <h3 style={{ marginBottom: 10 }}>Delivery charge</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: '0.85rem' }}>
              Flat delivery fee charged on every order (shown as the shipping estimate in Cart/Checkout, and what's
              actually charged at checkout). Change takes effect immediately for new orders.
            </p>
            <form onSubmit={onSaveDeliveryFee}>
              <div className="field">
                <label>Delivery fee (৳)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryFeeInput}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                />
              </div>
              <button className="btn btn-berry" disabled={savingDeliveryFee}>
                {savingDeliveryFee ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>

          <div className="form-panel wide" style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 10 }}>Online payment (SSLCommerz)</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: '0.85rem' }}>
              Shows "Online Payment" as a checkout option alongside Cash on Delivery. Takes effect immediately —
              no deploy needed.
            </p>
            {!sslcommerzConfigured && (
              <p style={{ background: '#fdf0e6', color: '#a15c00', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', marginBottom: 14 }}>
                SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD aren't set on the server yet — turning this on will
                show the option, but customers who pick it will hit a payment error until those are added in the
                Render dashboard's Environment settings.
              </p>
            )}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={onlinePaymentEnabled} disabled={savingOnlinePayment} onChange={onToggleOnlinePayment} />
              Enable online payment at checkout
            </label>
          </div>
        </div>
      )}
      {tab === 'security' && (
        <div style={{ paddingBottom: 80, maxWidth: 480 }}>
          <div className="form-panel wide">
            <h3 style={{ marginBottom: 10 }}>Two-factor authentication</h3>
            {twoFAError && <div className="form-error">{twoFAError}</div>}

            {twoFA.enabled && !setupData && (
              <div>
                <p style={{ color: '#2e7d32', marginBottom: 16 }}>2FA is enabled on this account.</p>
                <button className="btn btn-outline" onClick={onDisableTwoFA}>Disable 2FA</button>
              </div>
            )}

            {!twoFA.enabled && !setupData && (
              <div>
                <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
                  2FA is off. Turn it on so a stolen password alone isn't enough to access the admin panel.
                </p>
                <button className="btn btn-berry" onClick={onStartTwoFASetup}>Set up 2FA</button>
              </div>
            )}

            {setupData && (
              <form onSubmit={onEnableTwoFA}>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
                  Scan this QR code with Google Authenticator, Authy, or 1Password, then enter the 6-digit code it shows.
                </p>
                <img src={setupData.qrCode} alt="2FA QR code" style={{ width: 180, height: 180, marginBottom: 12 }} />
                <p style={{ fontSize: '0.75rem', color: '#9a8f8a', marginBottom: 16, wordBreak: 'break-all' }}>
                  Can't scan? Enter this key manually: <code>{setupData.secret}</code>
                </p>
                <div className="field">
                  <label>Verification code</label>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                  />
                </div>
                <button className="btn btn-berry" disabled={twoFACode.length !== 6}>Confirm and enable</button>
              </form>
            )}
          </div>

          <div className="form-panel wide" style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 10 }}>Admin accounts</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 12, fontSize: '0.85rem' }}>
              Anyone with an admin account has full access to orders, products, and store settings — only add people you trust.
            </p>
            {admins.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
                {admins.map((a) => (
                  <li key={a.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: '0.9rem' }}>
                    <strong>{a.name}</strong> — {a.email}
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ marginBottom: 10 }}>Add a new admin</h4>
            {newAdminError && <div className="form-error">{newAdminError}</div>}
            <form onSubmit={onCreateAdmin}>
              <div className="field">
                <label>Name</label>
                <input required value={newAdminForm.name} onChange={(e) => setNewAdminForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Email</label>
                <input required type="email" value={newAdminForm.email} onChange={(e) => setNewAdminForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="8+ characters, with a letter and number"
                />
              </div>
              <button className="btn btn-berry">Create admin account</button>
            </form>
          </div>
        </div>
      )}
      {tab === 'audit' && (
        <div style={{ paddingBottom: 80 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="When" style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td data-label="Admin">{log.adminName}</td>
                    <td data-label="Action">{log.action}</td>
                    <td data-label="Details" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={4}>No admin activity recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
