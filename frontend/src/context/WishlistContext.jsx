import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { trackAddToWishlist } from '../ecommerce.js';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setProducts([]);
      return;
    }
    const data = await api.get('/wishlist');
    setProducts(data.products);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ids = new Set(products.map((p) => p.id));

  // Returns the new saved state (true = just added, false = just removed) so
  // callers can show the right confirmation message and fire the right
  // ecommerce event — previously this fell through without a return value,
  // so "Added"/"Removed" toasts were always wrong.
  async function toggle(productId, product) {
    const wasSaved = ids.has(productId);
    if (wasSaved) {
      await api.del(`/wishlist/${productId}`);
    } else {
      await api.post(`/wishlist/${productId}`, {});
      if (product) trackAddToWishlist(product);
    }
    await refresh();
    return !wasSaved;
  }

  return (
    <WishlistContext.Provider value={{ products, ids, toggle, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
