import { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';
import { trackSearch } from '../ecommerce.js';
import { buildPageWindow } from '../utils/pagination.js';
import { useLanguage } from '../context/LanguageContext';
import { productUrl } from '../utils/slug';
import { categoryFromSlug, brandFromSlug, categoryUrl, brandUrl, brandCategoryUrl, isDisabledCategory } from '../utils/taxonomy';
import NotFound from './NotFound.jsx';

const PAGE_SIZE = 24; // same page size as the server-rendered category/brand pages

// Category/brand page text (title, meta, H1, intro, FAQ, links) comes from
// GET /api/seo/page — the same source as the server-rendered pages.

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const routeParams = useParams(); // :categorySlug / :brandSlug on the clean-URL routes, empty on plain /shop
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [seoPage, setSeoPage] = useState(null);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // The clean /category/:slug and /brand/:slug routes are the canonical
  // form (see App.jsx) — resolved back to the real, correctly-cased name via
  // utils/taxonomy.js. /shop?category=/?brand= (the old query-string form)
  // still works as a fallback so nothing that already links to it breaks,
  // it's just no longer what canonicalPath points at.
  const categoryFromRoute = routeParams.categorySlug ? categoryFromSlug(routeParams.categorySlug) : null;
  const brandFromRoute = routeParams.brandSlug ? brandFromSlug(routeParams.brandSlug) : null;
  // An unresolvable slug (e.g. someone hand-typed /category/not-a-real-one)
  // is a real 404, not an empty shop grid — checked here but not returned
  // until after every hook below has run (an early return here would skip
  // hooks on this render and violate the Rules of Hooks the moment someone
  // navigates from an invalid slug to a valid one without unmounting Shop).
  const invalidSlug = Boolean((routeParams.categorySlug && !categoryFromRoute) || (routeParams.brandSlug && !brandFromRoute));

  const category = categoryFromRoute || params.get('category') || 'All';
  const brand = brandFromRoute || params.get('brand') || 'All';
  const search = params.get('search') || '';
  const sort = params.get('sort') || '';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const [searchInput, setSearchInput] = useState(search);

  // The base path a filter/sort/page link should be built on top of — the
  // clean /category/<slug> or /brand/<slug> URL once a filter is active,
  // otherwise plain /shop.
  function basePath() {
    if (category !== 'All' && brand !== 'All') return brandCategoryUrl(brand, category);
    if (category !== 'All') return categoryUrl(category);
    if (brand !== 'All') return brandUrl(brand);
    return '/shop';
  }

  // Canonicalizes to the clean path form — a request that arrived via the
  // legacy /shop?category=/?brand= query string still self-canonicalizes to
  // the same clean URL as the new routes, so Google consolidates both onto it.
  const canonicalPath = basePath();

  const activeFilterName = category !== 'All' ? category : brand !== 'All' ? brand : null;

  // Page text for a category/brand page (not for search results).
  const seoForThisPage = seoPage && seoPage.basePath === canonicalPath ? seoPage : null;

  // A search-results view (/shop?search=...) canonicalizes back to the
  // plain /shop or /shop?category=X page above, but that alone still lets
  // Google index the ?search= URL itself as a separate near-duplicate page;
  // noindex is the explicit signal the brief asks for on top of that.
  const isSearchView = Boolean(search);

  // Only added once this page's product grid has actually loaded — an empty
  // ItemList/CollectionPage would be invalid structured data. Re-fires
  // whenever `products` changes since usePageMeta diffs jsonLd by
  // JSON.stringify.
  const collectionJsonLd = products.length
    ? {
        id: 'collection',
        data: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: seoForThisPage?.h1 || activeFilterName || 'Shop',
          url: `${window.location.origin}${canonicalPath}`,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: products.slice(0, 20).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${window.location.origin}${productUrl(p)}`,
            })),
          },
        },
      }
    : null;

  const introText = !search ? seoForThisPage?.intro || null : null;
  const faqItems = !search && seoForThisPage?.faq?.length ? seoForThisPage.faq : null;
  const faqJsonLd = faqItems
    ? {
        id: 'faq',
        data: {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        },
      }
    : null;

  const breadcrumbJsonLd = activeFilterName
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
    : null;

  // Title/meta: the backend's English page text on category/brand pages.
  usePageMeta(
    search
      ? t('shop.searchResultsTitle', null, { search })
      : seoForThisPage
      ? seoForThisPage.head.title
      : category !== 'All'
      ? `${category} Wholesale in Bangladesh`
      : brand !== 'All'
      ? `${brand} Mobile Parts Wholesale in Bangladesh`
      : t('shop.pageTitleDefault'),
    seoForThisPage
      ? seoForThisPage.head.description
      : activeFilterName
      ? t('shop.pageMetaCategory', null, { category: activeFilterName })
      : t('shop.pageMetaDefault'),
    undefined,
    seoForThisPage?.head.canonical || canonicalPath,
    [breadcrumbJsonLd, collectionJsonLd, faqJsonLd].filter(Boolean),
    isSearchView || invalidSlug,
    { exactTitle: Boolean(seoForThisPage && !search) }
  );

  // Category/brand page text from the backend (same as the server-rendered page).
  useEffect(() => {
    if (!activeFilterName || search || invalidSlug || isDisabledCategory(category)) {
      setSeoPage(null);
      return undefined;
    }
    let current = true;
    api.get(`/seo/page?path=${encodeURIComponent(canonicalPath)}&page=${page}`)
      .then((d) => { if (current) setSeoPage(d.status === 200 ? d : null); })
      .catch(() => { if (current) setSeoPage(null); });
    return () => { current = false; };
  }, [canonicalPath, page, search, activeFilterName, invalidSlug, category]);

  // Keep the box in sync if the URL changes from elsewhere
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Track each distinct search term once
  useEffect(() => {
    if (search) trackSearch(search);
  }, [search]);

  // Live search debouncing
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) setFilter('search', searchInput);
    }, 350);
    return () => clearTimeout(handle);
     
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
        if (!current) return;
        setProducts(d.products);
        setCategories(d.categories);
        setBrands(d.brands || []);
        setTotal(d.total);
        setTotalPages(d.totalPages);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      current = false;
    };
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

  // Category/brand pills always link to the clean path form (never the old
  // query-string one) — combining a brand and a category pill navigates to
  // the nested /brand/<brand>/<category> URL; clearing one filter while the
  // other stays active drops back to that other filter's own clean URL.
  function buildFilterUrl(key, value) {
    if (key === 'category') {
      if (!value) return brand !== 'All' ? brandUrl(brand) : '/shop';
      return brand !== 'All' ? brandCategoryUrl(brand, value) : categoryUrl(value);
    }
    if (key === 'brand') {
      if (!value) return category !== 'All' ? categoryUrl(category) : '/shop';
      return value !== 'All' && category !== 'All' ? brandCategoryUrl(value, category) : brandUrl(value);
    }
    return basePath();
  }

  function buildPageUrl(p) {
    const next = new URLSearchParams(params);
    next.set('page', p);
    const qs = next.toString();
    return `${basePath()}${qs ? `?${qs}` : ''}`;
  }

  function pageWindow() {
    return buildPageWindow(page, totalPages);
  }

  if (invalidSlug) return <NotFound />;
  // A switched-off category (battery section is OFF) has no page: send the
  // visitor on, same as the server's 301 for a direct visit.
  if (isDisabledCategory(category)) return <Navigate to={brand !== 'All' ? brandUrl(brand) : '/shop'} replace />;

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
          {search ? (
            t('shop.resultsForPre', null, { search })
          ) : seoForThisPage ? (
            seoForThisPage.h1
          ) : category !== 'All' ? (
            `${category} Wholesale in Bangladesh`
          ) : brand !== 'All' ? (
            `${brand} ${t('shop.partsSuffix')}`
          ) : (
            <>
              {t('shop.shopTitleTop')} <em>{t('shop.shopTitleEm')}</em>
            </>
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
          <span className="shop-result-count">
            {loading ? t('shop.searching') : `${total} ${total === 1 ? t('shop.product') : t('shop.products')}`}
          </span>
          <div className="shop-toolbar-controls">
            <div className="shop-search-input">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
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
        <div className="grid grid-wide" style={{ paddingBottom: 40 }}>
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
          <button
            className="btn btn-primary"
            onClick={() => {
              setSearchInput('');
              setParams({});
            }}
          >
            {t('shop.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid grid-wide" style={{ paddingBottom: 40 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="pagination">
          {page <= 1 ? (
            <span className="page-btn" aria-disabled="true">
              ←
            </span>
          ) : (
            <Link className="page-btn" to={buildPageUrl(page - 1)} aria-label={t('shop.prevPage')}>
              ←
            </Link>
          )}
          {pageWindow().map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="page-ellipsis">
                …
              </span>
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
            <span className="page-btn" aria-disabled="true">
              →
            </span>
          ) : (
            <Link className="page-btn" to={buildPageUrl(page + 1)} aria-label={t('shop.nextPage')}>
              →
            </Link>
          )}
        </div>
      )}

      {!search && seoForThisPage && (seoForThisPage.categories?.length > 0 || seoForThisPage.models?.length > 0 || seoForThisPage.brands?.length > 0) && (
        <div className="form-panel wide shop-links-panel" style={{ marginTop: 28 }}>
          {seoForThisPage.categories?.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 10 }}>{t('shop.partsByType')}</h2>
              <div className="cat-strip" style={{ marginBottom: 16 }}>
                {seoForThisPage.categories.map((c) => (
                  <Link key={c.path} className="cat-pill" to={c.path}>{c.name} ({c.count})</Link>
                ))}
              </div>
            </>
          )}
          {seoForThisPage.brands?.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 10 }}>{t('shop.byBrand')}</h2>
              <div className="cat-strip" style={{ marginBottom: 16 }}>
                {seoForThisPage.brands.map((b) => (
                  <Link key={b.path} className="cat-pill" to={b.path}>{b.name}</Link>
                ))}
              </div>
            </>
          )}
          {seoForThisPage.models?.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 10 }}>{t('shop.partsByModel')}</h2>
              <div className="cat-strip">
                {seoForThisPage.models.map((m) => (
                  <Link key={m.path} className="cat-pill" to={m.path}>{m.name}</Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* The page's English intro (what Google reads) sits under the products,
          so a visitor sees the parts first (owner: fresh, less text). */}
      {introText && (
        <section className="shop-seo-text">
          <p>{introText}</p>
        </section>
      )}

      {faqItems && (
        <div className="form-panel wide" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 14 }}>{t('shop.faqTitle')}</h2>
          {faqItems.map((f) => (
            <details key={f.q} style={{ marginBottom: 10 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
              <p style={{ color: '#6b5f59', marginTop: 6, lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}