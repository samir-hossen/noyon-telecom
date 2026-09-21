import { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';
import { trackSearch } from '../ecommerce.js';
import { buildPageWindow } from '../utils/pagination.js';
import { useLanguage } from '../context/LanguageContext';
import { productUrl } from '../utils/slug';
import { categoryFromSlug, brandFromSlug, categoryUrl, brandUrl, brandCategoryUrl } from '../utils/taxonomy';
import NotFound from './NotFound.jsx';

const PAGE_SIZE = 12;

// ক্যাটাগরিভিত্তিক হাই-ভ্যালু এসইও কিওয়ার্ড ম্যাপিং
const CATEGORY_SEO = {
  display: {
    title: 'Mobile Display Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Display Wholesale in Bangladesh',
    desc: 'Wholesale importer of original smartphone LCD and OLED displays in Bangladesh. Best wholesale rates for repair shops in Gulistan, Dhaka.',
  },
  battery: {
    title: 'Original Phone Battery Wholesale in Dhaka BD | Noyon Telecom',
    h1: 'Original Phone Battery Wholesale in Dhaka',
    desc: 'High quality original mobile phone batteries at wholesale prices in Bangladesh for dealers, repair shops and technicians.',
  },
  'charging port': {
    title: 'Mobile Charging Port & Flex Ribbon Wholesale BD | Noyon Telecom',
    h1: 'Mobile Charging Port Wholesale in Bangladesh',
    desc: 'Wholesale supplier of smartphone charging ports, sub-boards, and flex ribbons across Bangladesh.',
  },
  'back glass': {
    title: 'Mobile Back Glass & Housing Wholesale Bangladesh | Noyon Telecom',
    h1: 'Mobile Back Glass & Housing Wholesale BD',
    desc: 'Imported smartphone back glass, camera glass, and body housing replacement parts at wholesale rates.',
  },
  oled: {
    title: 'OLED Display Wholesale in Bangladesh | Noyon Telecom',
    h1: 'OLED Display Wholesale in Bangladesh',
    desc: 'Wholesale OLED smartphone displays, pre-tested before dispatch, for repair shops and dealers across Bangladesh.',
  },
  lcd: {
    title: 'LCD Display Wholesale in Bangladesh | Noyon Telecom',
    h1: 'LCD Display Wholesale in Bangladesh',
    desc: 'Wholesale LCD smartphone displays at competitive rates, imported and tested for repair shops in Dhaka and nationwide.',
  },
  touch: {
    title: 'Mobile Touch Screen Digitizer Wholesale BD | Noyon Telecom',
    h1: 'Mobile Touch Screen Wholesale in Bangladesh',
    desc: 'Wholesale touch screen digitizers for smartphones, compatible with major brands, at dealer pricing in Bangladesh.',
  },
  housing: {
    title: 'Mobile Housing & Body Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Housing Wholesale in Bangladesh',
    desc: 'Wholesale smartphone housing and body replacement parts for repair shops and dealers in Bangladesh.',
  },
  frame: {
    title: 'Mobile Middle Frame Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Frame Wholesale in Bangladesh',
    desc: 'Wholesale middle frame and chassis replacement parts for smartphones, at dealer rates in Bangladesh.',
  },
  camera: {
    title: 'Mobile Camera Module Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Camera Module Wholesale in Bangladesh',
    desc: 'Wholesale front and rear camera module replacements for smartphones, for repair shops and technicians in Bangladesh.',
  },
  speaker: {
    title: 'Mobile Speaker & Ringer Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Speaker Wholesale in Bangladesh',
    desc: 'Wholesale loudspeaker and ringer replacement parts for smartphones, at competitive dealer rates in Bangladesh.',
  },
  microphone: {
    title: 'Mobile Microphone Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Microphone Wholesale in Bangladesh',
    desc: 'Wholesale microphone replacement parts for smartphones, for repair shops and service centers in Bangladesh.',
  },
  flex: {
    title: 'Mobile Flex Cable Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Flex Cable Wholesale in Bangladesh',
    desc: 'Wholesale flex cables and ribbon connectors for smartphones, at dealer pricing for repair shops in Bangladesh.',
  },
  'logic board': {
    title: 'Mobile Logic Board Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Logic Board Wholesale in Bangladesh',
    desc: 'Wholesale logic board and small board replacement parts for smartphones, for technicians and repair shops in Bangladesh.',
  },
  motherboard: {
    title: 'Mobile Motherboard Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Motherboard Wholesale in Bangladesh',
    desc: 'Wholesale motherboard and mainboard replacement parts for smartphones, for repair shops and dealers in Bangladesh.',
  },
  ic: {
    title: 'Mobile IC Chip Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile IC Wholesale in Bangladesh',
    desc: 'Wholesale power IC, charging IC, and other smartphone repair chips, for technicians and repair shops in Bangladesh.',
  },
  cpu: {
    title: 'Mobile CPU Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile CPU Wholesale in Bangladesh',
    desc: 'Wholesale CPU/processor replacement chips for smartphone repair, for technicians and service centers in Bangladesh.',
  },
  buttons: {
    title: 'Mobile Buttons & Switches Wholesale BD | Noyon Telecom',
    h1: 'Mobile Buttons Wholesale in Bangladesh',
    desc: 'Wholesale power, volume, and home button replacement parts for smartphones, at dealer rates in Bangladesh.',
  },
  'sim tray': {
    title: 'Mobile SIM Tray Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile SIM Tray Wholesale in Bangladesh',
    desc: 'Wholesale SIM card tray replacement parts for smartphones, for repair shops and dealers in Bangladesh.',
  },
  fingerprint: {
    title: 'Mobile Fingerprint Sensor Wholesale BD | Noyon Telecom',
    h1: 'Mobile Fingerprint Sensor Wholesale in Bangladesh',
    desc: 'Wholesale fingerprint sensor replacement parts for smartphones, for repair shops and technicians in Bangladesh.',
  },
  'face id': {
    title: 'Mobile Face ID Module Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Face ID Module Wholesale in Bangladesh',
    desc: 'Wholesale Face ID / dot projector module replacement parts for smartphones, for repair shops in Bangladesh.',
  },
  'repair tools': {
    title: 'Mobile Repair Tools Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Repair Tools Wholesale in Bangladesh',
    desc: 'Wholesale mobile phone repair tools and equipment for technicians and repair shops in Bangladesh.',
  },
  accessories: {
    title: 'Mobile Accessories Wholesale in Bangladesh | Noyon Telecom',
    h1: 'Mobile Accessories Wholesale in Bangladesh',
    desc: 'Wholesale mobile phone accessories for dealers and shops across Bangladesh, at competitive rates.',
  },
};

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const routeParams = useParams(); // :categorySlug / :brandSlug on the clean-URL routes, empty on plain /shop
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

  // বর্তমান ক্যাটাগরি কিওয়ার্ড শনাক্তকরণ
  const catKey = category !== 'All' ? category.toLowerCase().replace(/-/g, ' ') : null;
  const currentSEO = catKey ? CATEGORY_SEO[catKey] : null;

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
          name: currentSEO ? currentSEO.h1 : activeFilterName || 'Shop',
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

  // ডাইনামিক পেজ মেটা ও এসইও হ্যান্ডলার
  usePageMeta(
    search
      ? t('shop.searchResultsTitle', null, { search })
      : currentSEO
      ? currentSEO.title
      : category !== 'All'
      ? `${category} Wholesale in Bangladesh | Noyon Telecom`
      : brand !== 'All'
      ? `${brand} Mobile Spare Parts Wholesale | Noyon Telecom`
      : t('shop.pageTitleDefault'),
    currentSEO
      ? currentSEO.desc
      : activeFilterName
      ? t('shop.pageMetaCategory', null, { category: activeFilterName })
      : t('shop.pageMetaDefault'),
    undefined,
    canonicalPath,
    [breadcrumbJsonLd, collectionJsonLd].filter(Boolean),
    isSearchView || invalidSlug
  );

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
          ) : currentSEO ? (
            currentSEO.h1
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
        <div className="grid" style={{ paddingBottom: 40 }}>
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
    </div>
  );
}