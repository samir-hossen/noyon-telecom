import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';
import { trackSearch } from '../ecommerce.js';
import { buildPageWindow } from '../utils/pagination.js';
import { useLanguage } from '../context/LanguageContext';

const PAGE_SIZE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const category = params.get('category') || 'All';
  const brand = params.get('brand') || 'All';
  const search = params.get('search') || '';
  const sort = params.get('sort') || '';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const [searchInput, setSearchInput] = useState(search);

  usePageMeta(
    search ? t('shop.searchResultsTitle', null, { search }) : category !== 'All' ? category : t('shop.pageTitleDefault'),
    category !== 'All'
      ? t('shop.pageMetaCategory', null, { category })
      : t('shop.pageMetaDefault'),
    undefined,
    // Canonicalize away sort/page/search noise — only category (and brand)
    // meaningfully changes what content is shown, so that's all that
    // should get indexed as a distinct URL.
    (() => {
      const clean = new URLSearchParams();
      if (category !== 'All') clean.set('category', category);
      if (brand !== 'All') clean.set('brand', brand);
      const qs = clean.toString();
      return `/shop${qs ? `?${qs}` : ''}`;
    })()
  );

  // Keep the box in sync if the URL changes from elsewhere (e.g. navbar search).
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Track each distinct search term once (not on every keystroke/re-render).
  useEffect(() => {
    if (search) trackSearch(search);
  }, [search]);

  // Live search: debounce keystrokes so we don't fire a request on every character.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) setFilter('search', searchInput);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (category !== 'All') q.set('category', category);
    if (brand !== 'All') q.set('brand', brand);
    if (search) q.set('search', search);
    if (sort) q.set('sort', sort);
    q.set('page', page);
    q.set('limit', PAGE_SIZE);
    api
      .get(`/products?${q.toString()}`)
      .then((d) => {
        setProducts(d.products);
        setCategories(d.categories);
        setBrands(d.brands || []);
        setTotal(d.total);
        setTotalPages(d.totalPages);
      })
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [category, brand, search, sort, page]);

  async function handleAdd(id) {
    try {
      await addToCart(id, 1);
      showToast(t('shop.addedToCart'), 'success');
    } catch (e) {
      if (e.message.toLowerCase().includes('authenticated')) {
        showToast(t('shop.signInToAddCart'), 'error');
        navigate('/login');
      } else {
        showToast(e.message, 'error');
      }
    }
  }

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  function goToPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', p);
    setParams(next);
  }

  // Windowed pagination — for large catalogs we don't want 40 page buttons
  // stretching the layout; show first, last, current ±1, and ellipses.
  // (Logic lives in utils/pagination.js so it's unit-tested without a DB.)
  function pageWindow() {
    return buildPageWindow(page, totalPages);
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('shop.eyebrow')}</span>
        <h1 className="page-title">
          {search ? t('shop.resultsForPre', null, { search }) : category !== 'All' ? category : brand !== 'All' ? `${brand} ${t('shop.partsSuffix')}` : (
            <>{t('shop.shopTitleTop')} <em>{t('shop.shopTitleEm')}</em></>
          )}
        </h1>
      </div>

      <div className="cat-strip" style={{ marginBottom: 12 }}>
        <button className={`cat-pill ${category === 'All' ? 'active' : ''}`} onClick={() => setFilter('category', '')}>
          {t('shop.allCategories')}
        </button>
        {categories.map((c) => (
          <button key={c} className={`cat-pill ${category === c ? 'active' : ''}`} onClick={() => setFilter('category', c)}>
            {c}
          </button>
        ))}
      </div>

      {brands.length > 0 && (
        <div className="cat-strip" style={{ marginBottom: 20 }}>
          <button className={`cat-pill ${brand === 'All' ? 'active' : ''}`} onClick={() => setFilter('brand', '')}>
            {t('shop.allBrands')}
          </button>
          {brands.map((b) => (
            <button key={b} className={`cat-pill ${brand === b ? 'active' : ''}`} onClick={() => setFilter('brand', b)}>
              {b}
            </button>
          ))}
        </div>
      )}

      <div className="sticky-search-bar">
        <div className="shop-toolbar">
          <span className="shop-result-count">{loading ? t('shop.searching') : `${total} ${total === 1 ? t('shop.product') : t('shop.products')}`}</span>
          <div className="shop-toolbar-controls">
            <div className="shop-search-input">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
              <input
                type="text"
                placeholder={t('shop.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label={t('shop.searchAriaLabel')}
              />
            </div>
            <select className="select" value={sort} onChange={(e) => setFilter('sort', e.target.value)}>
              <option value="">{t('shop.sortFeatured')}</option>
              <option value="price-asc">{t('shop.sortPriceAsc')}</option>
              <option value="price-desc">{t('shop.sortPriceDesc')}</option>
              <option value="rating">{t('shop.sortTopRated')}</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid" style={{ paddingBottom: 40 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="card skeleton-card" key={i}>
              <div className="skeleton-block" style={{ aspectRatio: '1 / 1.05' }} />
              <div className="card-body">
                <div className="skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton-line" style={{ width: '80%', height: 18 }} />
                <div className="skeleton-line" style={{ width: '30%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>{t('shop.noProductsTitle')}</h3>
          <p>{t('shop.noProductsSub')}</p>
          <button className="btn btn-primary" onClick={() => { setSearchInput(''); setParams({}); }}>
            {t('shop.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid" style={{ paddingBottom: 40 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label={t('shop.prevPage')}>←</button>
          {pageWindow().map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="page-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`page-btn ${page === p ? 'active' : ''}`}
                onClick={() => goToPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button className="page-btn" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} aria-label={t('shop.nextPage')}>→</button>
        </div>
      )}
    </div>
  );
}
