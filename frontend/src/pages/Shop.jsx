import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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

  // Canonicalize away sort/page/search noise — only category (and brand)
  // meaningfully changes what content is shown, so that's all that should
  // get indexed as a distinct URL.
  const canonicalPath = (() => {
    const clean = new URLSearchParams();
    if (category !== 'All') clean.set('category', category);
    if (brand !== 'All') clean.set('brand', brand);
    const qs = clean.toString();
    return `/shop${qs ? `?${qs}` : ''}`;
  })();
  // Whichever single filter is actually narrowing the catalog right now —
  // category wins if somehow both are set, matching the <h1> logic below.
  // Was previously only checked for `category`, so filtering by brand alone
  // silently kept the generic "Shop" title/description while the <h1>
  // already correctly showed "{brand} Parts" — title and heading disagreeing
  // like that is exactly the kind of mismatch Google's quality guidance
  // flags structured data/metadata for, so it's worth keeping them in sync
  // here even though this isn't structured data.
  const activeFilterName = category !== 'All' ? category : brand !== 'All' ? brand : null;

  usePageMeta(
    search
      ? t('shop.searchResultsTitle', null, { search })
      : category !== 'All'
      ? category
      : brand !== 'All'
      ? `${brand} ${t('shop.partsSuffix')}`
      : t('shop.pageTitleDefault'),
    activeFilterName ? t('shop.pageMetaCategory', null, { category: activeFilterName }) : t('shop.pageMetaDefault'),
    undefined,
    canonicalPath,
    activeFilterName
      ? {
          id: 'breadcrumb',
          data: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: `${window.location.origin}/shop` },
              { '@type': 'ListItem', position: 3, name: activeFilterName, item: `${window.location.origin}${canonicalPath}` },
            ],
          },
        }
      : undefined
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
    let current = true;
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
        // Guards against an earlier, slower filter/page request resolving
        // after a newer one — without this, quickly clicking two category
        // pills in a row can end with the listing showing the first
        // click's results while the pill/URL both reflect the second.
        if (!current) return;
        setProducts(d.products);
        setCategories(d.categories);
        setBrands(d.brands || []);
        setTotal(d.total);
        setTotalPages(d.totalPages);
      })
      .finally(() => { if (current) setLoading(false); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => { current = false; };
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

  // Same URL logic as setFilter, but returning the target URL (rather than
  // navigating directly) so category/brand pills can render as real <Link>
  // elements — a crawler that won't click a JS onClick handler can still
  // follow an <a href>, so these filter combinations are discoverable
  // on-page instead of only via the sitemap. React Router still handles the
  // actual navigation client-side when a Link is clicked, so behavior for a
  // real visitor is unchanged.
  function buildFilterUrl(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    const qs = next.toString();
    return `/shop${qs ? `?${qs}` : ''}`;
  }

  function buildPageUrl(p) {
    const next = new URLSearchParams(params);
    next.set('page', p);
    const qs = next.toString();
    return `/shop${qs ? `?${qs}` : ''}`;
  }

  // Windowed pagination — for large catalogs we don't want 40 page buttons
  // stretching the layout; show first, last, current ±1, and ellipses.
  // (Logic lives in utils/pagination.js so it's unit-tested without a DB.)
  function pageWindow() {
    return buildPageWindow(page, totalPages);
  }

  return (
    <div className="container">
      {activeFilterName && (
        <nav className="breadcrumb-trail" aria-label="Breadcrumb">
          <Link to="/">{t('pd.breadcrumbHome')}</Link> <span>/</span>{' '}
          <Link to="/shop">{t('pd.breadcrumbShop')}</Link> <span>/</span>{' '}
          <span aria-current="page">{activeFilterName}</span>
        </nav>
      )}
      <div className="page-header">
        <span className="eyebrow">{t('shop.eyebrow')}</span>
        <h1 className="page-title">
          {search ? t('shop.resultsForPre', null, { search }) : category !== 'All' ? category : brand !== 'All' ? `${brand} ${t('shop.partsSuffix')}` : (
            <>{t('shop.shopTitleTop')} <em>{t('shop.shopTitleEm')}</em></>
          )}
        </h1>
      </div>

      <div className="cat-strip" style={{ marginBottom: 12 }}>
        <Link className={`cat-pill ${category === 'All' ? 'active' : ''}`} to={buildFilterUrl('category', '')}>
          {t('shop.allCategories')}
        </Link>
        {categories.map((c) => (
          <Link key={c} className={`cat-pill ${category === c ? 'active' : ''}`} to={buildFilterUrl('category', c)}>
            {c}
          </Link>
        ))}
      </div>

      {brands.length > 0 && (
        <div className="cat-strip" style={{ marginBottom: 20 }}>
          <Link className={`cat-pill ${brand === 'All' ? 'active' : ''}`} to={buildFilterUrl('brand', '')}>
            {t('shop.allBrands')}
          </Link>
          {brands.map((b) => (
            <Link key={b} className={`cat-pill ${brand === b ? 'active' : ''}`} to={buildFilterUrl('brand', b)}>
              {b}
            </Link>
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
          {page <= 1 ? (
            <span className="page-btn" aria-disabled="true">←</span>
          ) : (
            <Link className="page-btn" to={buildPageUrl(page - 1)} aria-label={t('shop.prevPage')}>←</Link>
          )}
          {pageWindow().map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="page-ellipsis">…</span>
            ) : (
              <Link
                key={p}
                className={`page-btn ${page === p ? 'active' : ''}`}
                to={buildPageUrl(p)}
                aria-current={page === p ? 'page' : undefined}
              >
                {p}
              </Link>
            )
          )}
          {page >= totalPages ? (
            <span className="page-btn" aria-disabled="true">→</span>
          ) : (
            <Link className="page-btn" to={buildPageUrl(page + 1)} aria-label={t('shop.nextPage')}>→</Link>
          )}
        </div>
      )}
    </div>
  );
}
