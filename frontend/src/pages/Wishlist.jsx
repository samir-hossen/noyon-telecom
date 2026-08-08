import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { usePageMeta } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard.jsx';

export default function Wishlist() {
  const { products } = useWishlist();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  usePageMeta('Your Wishlist', 'View and manage the products you have saved to your Noyon Telecom wishlist.');

  async function handleAdd(id) {
    try {
      await addToCart(id, 1);
      showToast('Added to cart', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  if (!user) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">♡</div>
          <h3>Sign in to see your wishlist</h3>
          <p style={{ marginBottom: 24 }}>Save items you love and find them here later.</p>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="icon">♡</div>
          <h3>Your wishlist is empty</h3>
          <p style={{ marginBottom: 24 }}>Tap the heart on any product to save it here.</p>
          <Link to="/shop" className="btn btn-primary">Start shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <span className="eyebrow">Saved for later</span>
        <h1 className="page-title">
          My <em>wishlist</em>
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
