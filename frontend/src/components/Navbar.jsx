import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { api, resolveImg } from '../api';
import { FALLBACK_IMG } from '../utils/fallbackImage';
import { formatPrice } from '../utils/currency';

// Mega menu grouping of the full parts taxonomy — keeps the flat category
// list from products.routes.js organized into scannable columns.
const MEGA_MENU_GROUPS = [
  { titleKey: 'nav.megaGroup.screenDisplay', categories: ['Display', 'OLED', 'LCD', 'Touch'] },
  { titleKey: 'nav.megaGroup.powerCharging', categories: ['Battery', 'Charging Port', 'IC'] },
  { titleKey: 'nav.megaGroup.bodyHousing', categories: ['Back Glass', 'Housing', 'Frame', 'Buttons'] },
  { titleKey: 'nav.megaGroup.cameraAudio', categories: ['Camera', 'Speaker', 'Microphone'] },
  { titleKey: 'nav.megaGroup.logicSecurity', categories: ['Flex', 'Logic Board', 'Motherboard', 'CPU', 'Fingerprint', 'Face ID'] },
  { titleKey: 'nav.megaGroup.toolsAccessories', categories: ['SIM Tray', 'Repair Tools', 'Accessories'] },
];

const BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Vivo', 'Oppo', 'Xiaomi', 'Realme', 'Google Pixel', 'Motorola'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { products: wishlistProducts } = useWishlist();
  const wishlistCount = wishlistProducts?.length || 0;
  const { lang, toggleLang, t } = useLanguage();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchWrapRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Sticky glassmorphism header: only kicks in once the page has scrolled
  // past the top so the header reads as "premium glass" over content
  // instead of looking glassy against nothing on first paint.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The mobile drawer sits over the page rather than pushing it down now,
  // so lock background scroll while it's open — otherwise the page behind
  // it scrolls invisibly and jumps when the drawer closes.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function onSearch(e) {
    e.preventDefault();
    setMenuOpen(false);
    setSuggestOpen(false);
    navigate(`/shop?search=${encodeURIComponent(q)}`);
  }

  function closeMenu() {
    setMenuOpen(false);
    setMegaOpen(false);
  }

  // Live search suggestions (instant search) — debounced so we're not
  // firing a request on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get(`/products?search=${encodeURIComponent(q.trim())}&limit=6`);
        setSuggestions(data.products || []);
        setSuggestOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    function onClickOutside(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="nav-topbar">
        <div className="container nav-topbar-inner">
          <span><a href="tel:+8801560047377">📞 {t('nav.hotline')}: 01560-047377 (9 AM–8 PM)</a></span>
          <div className="nav-topbar-right">
            <Link to="/orders">{t('nav.trackOrder')}</Link>
            <button className="lang-switch" onClick={toggleLang} aria-label={t('nav.switchLanguage')}>
              {lang === 'en' ? '🇺🇸 English' : '🇧🇩 বাংলা'}
              <span className="lang-switch-alt">{lang === 'en' ? '| বাংলা' : '| English'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container nav-top">
        <button
          className={`hamburger nav-hamburger ${menuOpen ? 'open' : ''}`}
          aria-label={t('nav.toggleMenu')}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <img src="/logo-mark.png" alt="" className="nav-logo-mark" />
          Noyon <span>Telecom</span>
        </Link>

        <div className="nav-actions nav-search-slot">
          <div className="nav-search" ref={searchWrapRef}>
            <form onSubmit={onSearch}>
              <span>⚲</span>
              <input
                placeholder={t('nav.search')}
                aria-label={t('nav.search')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
              />
            </form>
            {suggestOpen && suggestions.length > 0 && (
              <div className="nav-suggest">
                {suggestions.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="nav-suggest-item"
                    onClick={() => setSuggestOpen(false)}
                  >
                    <img src={resolveImg(p.img)} alt="" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
                    <div>
                      <span className="nav-suggest-name">{p.name}</span>
                      <span className="nav-suggest-meta">{p.sku ? `SKU: ${p.sku} · ` : ''}{formatPrice(p.price)}</span>
                    </div>
                  </Link>
                ))}
                <button
                  type="button"
                  className="nav-suggest-viewall"
                  onClick={() => {
                    setSuggestOpen(false);
                    navigate(`/shop?search=${encodeURIComponent(q)}`);
                  }}
                >
                  {t('nav.viewAllResultsFor', null, { query: q })}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="nav-actions nav-actions-desktop">
          <Link to="/wishlist" className="nav-cart">♡ {t('nav.wishlist')}</Link>
          <Link to="/cart" className="nav-cart">
            {t('nav.cart')} {count > 0 && <span className="nav-cart-count">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/orders">{t('nav.orders')}</Link>
              {user.role === 'dealer' && <Link to="/dealer">{t('dealer.dashboard')}</Link>}
              {user.role === 'admin' && <Link to="/admin">{t('nav.admin')}</Link>}
              <button className="btn btn-outline" onClick={logout} style={{ padding: '8px 16px' }}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '8px 18px' }}>
              {t('nav.signIn')}
            </Link>
          )}
        </div>

        {/* Mobile-only: wishlist + cart icon buttons */}
        <div className="nav-mobile-actions">
          <Link to="/wishlist" className="nav-icon-btn" aria-label={t('nav.wishlist')} onClick={closeMenu}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20.5s-7.5-4.6-10-9.4C.6 7.6 2.4 4 6 4c2 0 3.5 1.1 6 3.6C14.5 5.1 16 4 18 4c3.6 0 5.4 3.6 4 7.1-2.5 4.8-10 9.4-10 9.4Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {wishlistCount > 0 && <span className="nav-icon-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/cart" className="nav-icon-btn" aria-label={t('nav.cart')} onClick={closeMenu}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l1 12H5L6 8Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {count > 0 && <span className="nav-icon-badge">{count}</span>}
          </Link>
        </div>
      </div>

      {/* Category bar with mega menu trigger — desktop only */}
      <nav className="nav-catbar nav-links-desktop">
        <div className="container nav-catbar-inner">
          <div
            className="mega-trigger"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMegaOpen(false);
            }}
          >
            <button
              className="mega-trigger-btn"
              aria-haspopup="true"
              aria-expanded={megaOpen}
              onClick={() => setMegaOpen((o) => !o)}
            >
              ☰ {t('nav.allCategoriesBtn')}
            </button>
            {/* Always rendered (not `{megaOpen && ...}`) so every category/brand
                link below is real, crawlable HTML present in the DOM from
                first render — a crawler that doesn't hover/click a menu
                trigger previously saw none of these links at all. Visibility
                is purely CSS now (.mega-menu.open, see index.css), the same
                pattern .mobile-menu already used below. */}
            <div className={`mega-menu ${megaOpen ? 'open' : ''}`} role="menu" aria-hidden={!megaOpen}>
              {MEGA_MENU_GROUPS.map((group) => (
                <div className="mega-menu-col" key={group.titleKey} role="group" aria-label={t(group.titleKey)}>
                  <h4>{t(group.titleKey)}</h4>
                  {group.categories.map((c) => (
                    <Link key={c} to={`/shop?category=${encodeURIComponent(c)}`} onClick={() => setMegaOpen(false)} role="menuitem">
                      {c}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="mega-menu-col mega-menu-brands" role="group" aria-label={t('nav.brands')}>
                <h4>{t('nav.brands')}</h4>
                <div className="mega-menu-brand-grid">
                  {BRANDS.map((b) => (
                    <Link key={b} to={`/shop?brand=${encodeURIComponent(b)}`} onClick={() => setMegaOpen(false)} role="menuitem">
                      {b}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Link to="/">{t('nav.home')}</Link>
          <Link to="/shop">{t('nav.allParts')}</Link>
          <Link to="/shop?category=Display">{t('nav.display')}</Link>
          <Link to="/shop?category=Battery">{t('nav.battery')}</Link>
          <Link to="/shop?category=Charging Port">{t('nav.chargingPort')}</Link>
          <Link to="/shop?category=Back Glass">{t('nav.backGlass')}</Link>
          <Link to="/shop?category=Camera">{t('nav.camera')}</Link>
          <Link to="/register" className="nav-catbar-dealer">{t('nav.becomeDealer')}</Link>
        </div>
      </nav>

      <div className={`mobile-menu-backdrop ${menuOpen ? 'open' : ''}`} onClick={closeMenu} aria-hidden="true" />
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <button type="button" className="mobile-menu-close" onClick={closeMenu} aria-label={t('nav.closeMenu')}>
            ✕
          </button>

          <button className="lang-switch lang-switch-mobile" onClick={toggleLang}>
            {lang === 'en' ? '🇺🇸 English' : '🇧🇩 বাংলা'} <span className="lang-switch-alt">{lang === 'en' ? '/ বাংলা' : '/ English'}</span>
          </button>

          <nav className="mobile-menu-links">
            <Link to="/" onClick={closeMenu}>{t('nav.home')}</Link>
            <Link to="/shop" onClick={closeMenu}>{t('nav.allParts')}</Link>
            <Link to="/shop?category=Display" onClick={closeMenu}>{t('nav.display')}</Link>
            <Link to="/shop?category=Battery" onClick={closeMenu}>{t('nav.battery')}</Link>
            <Link to="/shop?category=Charging Port" onClick={closeMenu}>{t('nav.chargingPort')}</Link>
            <Link to="/shop?category=Back Glass" onClick={closeMenu}>{t('nav.backGlass')}</Link>
            <Link to="/shop?category=Camera" onClick={closeMenu}>{t('nav.camera')}</Link>
            <Link to="/wishlist" onClick={closeMenu}>♡ {t('nav.wishlist')}</Link>
            <Link to="/register" onClick={closeMenu}>{t('nav.becomeDealer')}</Link>
          </nav>

          <div className="mobile-menu-account">
            {user ? (
              <>
                <Link to="/orders" onClick={closeMenu} className="btn btn-outline btn-block">{t('nav.myOrders')}</Link>
                {user.role === 'dealer' && (
                  <Link to="/dealer" onClick={closeMenu} className="btn btn-outline btn-block">{t('dealer.dashboard')}</Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={closeMenu} className="btn btn-outline btn-block">{t('nav.adminPanel')}</Link>
                )}
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link to="/login" onClick={closeMenu} className="btn btn-primary btn-block">
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
    </header>
  );
}
