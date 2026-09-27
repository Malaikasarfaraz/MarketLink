import { create } from 'zustand';

function loadStoredCart() {
  try {
    return JSON.parse(localStorage.getItem('marketlink_cart')) || [];
  } catch {
    return [];
  }
}

function computeTotal(items) {
  return items.reduce((s, i) => s + i.price * i.cartQty, 0);
}

function persistCart(items, set) {
  localStorage.setItem('marketlink_cart', JSON.stringify(items));
  set({ items, total: computeTotal(items) });
}

// Zustand store — replaces CartContext + CartProvider.
// Usage stays the same as before: const {items, total, add, change, remove, clear} = useCart();
export const useCart = create((set, get) => ({
  items: loadStoredCart(),
  total: computeTotal(loadStoredCart()),

  add(product) {
    const items = get().items;
    if (items.length) {
      const sameFarmer = String(items[0].farmer?._id || items[0].farmer) === String(product.farmer?._id || product.farmer);
      const sameMarket = String(items[0].market?._id || items[0].market) === String(product.market?._id || product.market);
      if (!sameFarmer || !sameMarket) {
        throw new Error('One basket can contain products from one farmer and one market at a time.');
      }
    }
    const found = items.find((i) => i._id === product._id);
    const next = found
      ? items.map((i) => (i._id === product._id ? { ...i, cartQty: i.cartQty + 1 } : i))
      : [...items, { ...product, cartQty: 1 }];
    persistCart(next, set);
  },

  change(id, qty) {
    const next = get().items.map((i) => (i._id === id ? { ...i, cartQty: Math.max(1, qty) } : i));
    persistCart(next, set);
  },

  remove(id) {
    const next = get().items.filter((i) => i._id !== id);
    persistCart(next, set);
  },

  clear() {
    persistCart([], set);
  },
}));
