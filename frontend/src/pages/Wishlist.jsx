import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';
import { useLanguage } from '../context/LanguageContext';

export default function Wishlist() {
  const { products } = useWishlist();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { t } = useLanguage();

  usePageMeta(t('wishlist.pageTitle'), t('wishlist.pageMeta'));

  async function handleAdd(id) {
    try {
      await addToCart(id, 1);
      showToast(t('shop.addedToCart'), 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (!user) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">♡</div>
          <h3>{t('wishlist.signInTitle')}</h3>
          <p style={{ marginBottom: 24 }}>{t('wishlist.signInSub')}</p>
          <Link to="/login" className="btn btn-primary">{t('nav.signIn')}</Link>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">♡</div>
          <h3>{t('wishlist.emptyTitle')}</h3>
          <p style={{ marginBottom: 24 }}>{t('wishlist.emptySub')}</p>
          <Link to="/shop" className="btn btn-primary">{t('cart.startShopping')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">{t('wishlist.eyebrow')}</span>
        <h1 className="page-title">
          {t('wishlist.titleTop')} <em>{t('wishlist.titleEm')}</em>
        </h1>
      </div>
      <div className="grid" style={{ paddingBottom: 80 }}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
      </div>
    </div>
  );
}
