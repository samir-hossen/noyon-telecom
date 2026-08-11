import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Fixed thumb-reachable tab bar for small screens. Purely additive —
// doesn't touch routing, auth, cart, or any backend logic. Hidden above
// 900px via CSS (see .mobile-bottom-nav in index.css) so desktop is
// unaffected.
const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // Grid icon (matches CategoryGrid.jsx's "View All Categories" tile) —
  // this used to be the exact same bag icon as `bag` below, so "All Parts"
  // and "Cart" were visually identical in this icon-first tab bar and only
  // distinguishable by their text label.
  shop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.4" strokeLinejoin="round" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.4" strokeLinejoin="round" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.4" strokeLinejoin="round" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.4" strokeLinejoin="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 20.5s-7.5-4.6-10-9.4C.6 7.6 2.4 4 6 4c2 0 3.5 1.1 6 3.6C14.5 5.1 16 4 18 4c3.6 0 5.4 3.6 4 7.1-2.5 4.8-10 9.4-10 9.4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M6 8h12l1 12H5L6 8Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function MobileBottomNav() {
  const location = useLocation();
  const { count } = useCart();
  const { products } = useWishlist();
  const { user } = useAuth();
  const { t } = useLanguage();

  const wishlistCount = products?.length || 0;
  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  const accountHref = user ? '/orders' : '/login';

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      <Link to="/" className={`mbn-item ${isActive('/') ? 'active' : ''}`}>
        {ICONS.home}
        <span>{t('nav.home')}</span>
      </Link>
      <Link to="/shop" className={`mbn-item ${isActive('/shop') ? 'active' : ''}`}>
        {ICONS.shop}
        <span>{t('nav.allParts')}</span>
      </Link>
      <Link to="/wishlist" className={`mbn-item ${isActive('/wishlist') ? 'active' : ''}`}>
        <span style={{ position: 'relative' }}>
          {ICONS.heart}
          {wishlistCount > 0 && <span className="mbn-badge">{wishlistCount}</span>}
        </span>
        <span>{t('nav.wishlist')}</span>
      </Link>
      <Link to="/cart" className={`mbn-item ${isActive('/cart') ? 'active' : ''}`}>
        <span style={{ position: 'relative' }}>
          {ICONS.bag}
          {count > 0 && <span className="mbn-badge">{count}</span>}
        </span>
        <span>{t('nav.cart')}</span>
      </Link>
      <Link to={accountHref} className={`mbn-item ${isActive('/orders') || isActive('/login') ? 'active' : ''}`}>
        {ICONS.user}
        <span>{user ? t('nav.orders') : t('nav.signIn')}</span>
      </Link>
    </nav>
  );
}
