import { atom, computed } from 'nanostores';
import { TAX_RATE, DELIVERY_FEE_CENTS } from '@lib/constants';

export interface CartItem {
  cartItemId: string;
  itemId: string;
  name: string;
  basePriceCents: number;
  qty: number;
  lineTotalCents: number;
  selectedOptions?: { label: string; priceDeltaCents: number }[];
  slotChoices?: Record<string, string[]>;
  itemType: 'regular' | 'bundle';
}

const STORAGE_KEY = 'jc_cart';

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const cartItems = atom<CartItem[]>(loadFromStorage());

export const cartCount = computed(cartItems, (items) =>
  items.reduce((sum, i) => sum + i.qty, 0),
);

export const subtotalCents = computed(cartItems, (items) =>
  items.reduce((sum, i) => sum + i.lineTotalCents, 0),
);

export const taxCents = computed(subtotalCents, (sub) =>
  Math.round(sub * TAX_RATE),
);

export const deliveryFeeCents = atom<number>(DELIVERY_FEE_CENTS);

export const totalCents = computed(
  [subtotalCents, taxCents, deliveryFeeCents],
  (sub, tax, fee) => sub + tax + fee,
);

export function addToCart(item: Omit<CartItem, 'cartItemId'>): void {
  const id = crypto.randomUUID();
  const next = [...cartItems.get(), { ...item, cartItemId: id }];
  cartItems.set(next);
  saveToStorage(next);
}

export function removeFromCart(cartItemId: string): void {
  const next = cartItems.get().filter((i) => i.cartItemId !== cartItemId);
  cartItems.set(next);
  saveToStorage(next);
}

export function updateQty(cartItemId: string, qty: number): void {
  if (qty < 1) {
    removeFromCart(cartItemId);
    return;
  }
  const next = cartItems.get().map((i) =>
    i.cartItemId === cartItemId
      ? { ...i, qty, lineTotalCents: Math.round((i.lineTotalCents / i.qty) * qty) }
      : i,
  );
  cartItems.set(next);
  saveToStorage(next);
}

export function clearCart(): void {
  cartItems.set([]);
  saveToStorage([]);
}

export function setDeliveryType(type: 'delivery' | 'pickup'): void {
  deliveryFeeCents.set(type === 'pickup' ? 0 : DELIVERY_FEE_CENTS);
}

export const cartOpen = atom<boolean>(false);
export const checkoutOpen = atom<boolean>(false);
