import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { trackAddToCart } from '../ecommerce.js';

const CartContext = createContext(null);
const GUEST_CART_KEY = 'guest_cart_v1';

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded edge cases —
    // the cart just won't persist across reloads, which is an acceptable fallback.
  }
}

// Guests don't have a server-side cart, so we keep {productId, qty} pairs in
// localStorage and hydrate them with live product data (price/stock/name)
// on every read — that way an out-of-stock or price-changed item is never
// shown stale.
async function enrichGuestItems(rawItems) {
  const results = await Promise.all(
    rawItems.map(async (i) => {
      try {
        const { product } = await api.get(`/products/${i.productId}`);
        return { productId: i.productId, qty: i.qty, product };
      } catch {
        return null; // product deleted/unavailable since it was added
      }
    })
  );
  const items = results.filter(Boolean);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  return { items, subtotal };
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUserRef = useRef(user);
  const mergingRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await api.get('/cart');
        setItems(data.items);
        setSubtotal(data.subtotal);
      } else {
        const { items: guestItems, subtotal: guestSubtotal } = await enrichGuestItems(readGuestCart());
        setItems(guestItems);
        setSubtotal(guestSubtotal);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // When someone logs in with items already sitting in their guest cart
  // (added while browsing before signing in), fold those into their real
  // account cart once, then clear the local copy so it isn't merged twice.
  useEffect(() => {
    const wasGuest = !prevUserRef.current;
    const isNowLoggedIn = !!user;
    if (wasGuest && isNowLoggedIn && !mergingRef.current) {
      const guestItems = readGuestCart();
      if (guestItems.length > 0) {
        mergingRef.current = true;
        (async () => {
          for (const i of guestItems) {
            try {
              await api.post('/cart/add', { productId: i.productId, qty: i.qty });
            } catch {
              // Skip items that fail to merge (e.g. no longer in stock) rather
              // than blocking the whole login flow on one bad item.
            }
          }
          writeGuestCart([]);
          mergingRef.current = false;
          refresh();
        })();
      }
    }
    prevUserRef.current = user;
  }, [user, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addToCart(productId, qty = 1) {
    if (user) {
      const data = await api.post('/cart/add', { productId, qty });
      setItems(data.items);
      setSubtotal(data.subtotal);
      const added = data.items.find((i) => i.productId === productId);
      if (added) trackAddToCart(added.product, qty);
    } else {
      const current = readGuestCart();
      const existing = current.find((i) => i.productId === productId);
      if (existing) existing.qty += qty;
      else current.push({ productId, qty });
      writeGuestCart(current);
      const { items: guestItems, subtotal: guestSubtotal } = await enrichGuestItems(current);
      setItems(guestItems);
      setSubtotal(guestSubtotal);
      const added = guestItems.find((i) => i.productId === productId);
      if (added) trackAddToCart(added.product, qty);
    }
  }

  async function updateQty(productId, qty) {
    if (user) {
      const data = await api.put('/cart/update', { productId, qty });
      setItems(data.items);
      setSubtotal(data.subtotal);
    } else {
      let current = readGuestCart();
      if (qty <= 0) {
        current = current.filter((i) => i.productId !== productId);
      } else {
        const item = current.find((i) => i.productId === productId);
        if (item) {
          // Clamp against the live stock/MOQ, mirroring the server-side
          // clamp that logged-in carts get from PUT /cart/update — without
          // this, a guest could type any quantity here (e.g. 9999) and only
          // find out it's invalid at checkout instead of right in the cart.
          try {
            const { product } = await api.get(`/products/${productId}`);
            const moq = product.moq || 1;
            // Clamp to stock FIRST, then apply the moq floor — clamping in
            // the other order (moq floor first) could raise the quantity
            // back above real stock whenever stock happens to be below moq
            // (e.g. moq=5 but only 3 left), silently showing more units in
            // the cart than actually exist. Matches the correct ordering
            // already used for the logged-in-cart equivalent in
            // ProductDetail.jsx's quantity field.
            item.qty = Math.min(product.stock, Math.max(moq, qty));
          } catch {
            // Lookup failed (e.g. offline) — fall back to the raw value;
            // checkout still re-validates stock server-side either way.
            item.qty = qty;
          }
        }
      }
      writeGuestCart(current);
      const { items: guestItems, subtotal: guestSubtotal } = await enrichGuestItems(current);
      setItems(guestItems);
      setSubtotal(guestSubtotal);
    }
  }

  async function removeItem(productId) {
    if (user) {
      const data = await api.del(`/cart/remove/${productId}`);
      setItems(data.items);
      setSubtotal(data.subtotal);
    } else {
      const current = readGuestCart().filter((i) => i.productId !== productId);
      writeGuestCart(current);
      const { items: guestItems, subtotal: guestSubtotal } = await enrichGuestItems(current);
      setItems(guestItems);
      setSubtotal(guestSubtotal);
    }
  }

  // Called after a successful guest checkout to empty the local cart —
  // there's no server-side cart to clear for a guest, so this is the
  // equivalent of what `refresh()` does for a logged-in user post-order.
  function clearGuestCart() {
    writeGuestCart([]);
    setItems([]);
    setSubtotal(0);
  }

  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, subtotal, count, loading, addToCart, updateQty, removeItem, refresh, clearGuestCart, isGuestCart: !user }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
