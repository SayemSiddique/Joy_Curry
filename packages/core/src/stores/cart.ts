import { atom, computed } from 'nanostores';
import { TAX_RATE, DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS } from '@lib/constants';

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
const ORDER_TYPE_KEY = 'jc_order_type';
const ADDRESS_KEY = 'jc_delivery_address';
const ROUTING_KEY = 'jc_delivery_routing';

export type OrderType = 'pickup' | 'delivery';

function loadOrderType(): OrderType | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(ORDER_TYPE_KEY);
  return v === 'pickup' || v === 'delivery' ? v : null;
}

function loadAddress(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ADDRESS_KEY) ?? '';
}

export interface DeliveryRouting {
  withinRadius: boolean;
  distanceMiles: number;
  partner: string;     // 'in-house' | 'uber' | 'doordash'
  quoteCents: number;  // courier pass-through fee (0 for in-house)
}

function loadRouting(): DeliveryRouting | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ROUTING_KEY);
    return raw ? (JSON.parse(raw) as DeliveryRouting) : null;
  } catch {
    return null;
  }
}

function saveRouting(routing: DeliveryRouting | null): void {
  if (typeof window === 'undefined') return;
  if (routing) window.localStorage.setItem(ROUTING_KEY, JSON.stringify(routing));
  else window.localStorage.removeItem(ROUTING_KEY);
}

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

// ── Order type + delivery routing (these drive the fee) ──
export const orderType = atom<OrderType | null>(loadOrderType());

// Set by OrderGate after the /api/distance check. null = unknown → treated as
// in-house (so the fee degrades gracefully before/without a routing decision).
export const deliveryRouting = atom<DeliveryRouting | null>(loadRouting());

export function setDeliveryRouting(routing: DeliveryRouting | null): void {
  deliveryRouting.set(routing);
  saveRouting(routing);
}

// Delivery fee policy (mirrors backend/config/delivery.js resolveDeliveryFeeCents):
//   pickup → 0 · out-of-zone → courier pass-through quote · in-house → $3, free ≥ $30.
export const deliveryFeeCents = computed(
  [orderType, deliveryRouting, subtotalCents],
  (type, routing, sub) => {
    if (type !== 'delivery') return 0;
    if (routing && !routing.withinRadius) return routing.quoteCents;
    return sub >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : DELIVERY_FEE_CENTS;
  },
);

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
  // scheduledFor reset happens in CheckoutModal after confirmed
}

export const cartOpen = atom<boolean>(false);
export const checkoutOpen = atom<boolean>(false);

// P5-D: selected "Schedule for Later" slot, synced from CheckoutModal → read in CartDrawer
export const scheduledFor = atom<string | null>(null);

// ── Order-flow gate (Phase 3-C): pickup vs delivery fork ──
// `orderType` is declared above (it drives the fee computed).
export const deliveryAddress = atom<string>(loadAddress());
export const orderGateOpen = atom<boolean>(false);

/** Persist + apply the customer's pickup/delivery choice (and address). */
export function setOrderType(type: OrderType, address = ''): void {
  orderType.set(type);
  if (typeof window !== 'undefined') window.localStorage.setItem(ORDER_TYPE_KEY, type);

  if (type === 'delivery') {
    deliveryAddress.set(address);
    if (typeof window !== 'undefined') window.localStorage.setItem(ADDRESS_KEY, address);
    // Routing is set separately by OrderGate after the /api/distance check.
  } else {
    deliveryAddress.set('');
    if (typeof window !== 'undefined') window.localStorage.removeItem(ADDRESS_KEY);
    setDeliveryRouting(null); // pickup → no delivery routing/fee
  }
}
