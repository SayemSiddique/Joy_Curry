import { API_BASE_URL } from './constants';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  basePriceCents: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
  spiceLevel?: string;
  allergens: string[];
  modifiers: { id: string; label: string; priceDeltaCents: number }[];
  sizeOptions: { id: string; label: string; priceCents: number }[];
  tags: string[];
  imageUrl?: string;
  inStock: boolean;
  isActive: boolean;
  servedWith?: string;
  searchKeywords?: string[];
  pieceCount?: number;
}

export interface Order {
  id: string;
  userId: number;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  subtotalCents: number;
  taxCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  estimatedWaitMin?: number;
  createdAt: string;
  lineItems: OrderLineItem[];
}

export interface OrderLineItem {
  id: number;
  orderId: string;
  itemId: string;
  itemName: string;
  itemType: 'regular' | 'bundle';
  basePriceCents: number;
  qty: number;
  lineTotalCents: number;
  selectedOptions?: Record<string, unknown>;
  slotChoices?: Record<string, unknown>;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json as T;
}

export const menuApi = {
  getAll(): Promise<{ data: MenuItem[] }> {
    return apiFetch('/api/menu');
  },
  getById(id: string): Promise<{ data: MenuItem }> {
    return apiFetch(`/api/menu/${id}`);
  },
};

export const authApi = {
  register(body: { name: string; email: string; password: string; phone?: string }): Promise<{ token: string; user: { id: number; name: string; email: string; role: string } }> {
    return apiFetch('/api/users/register', { method: 'POST', body: JSON.stringify(body) });
  },
  login(body: { email: string; password: string }): Promise<{ token: string; user: { id: number; name: string; email: string; role: string } }> {
    return apiFetch('/api/users/login', { method: 'POST', body: JSON.stringify(body) });
  },
  me(token: string): Promise<{ user: { id: number; name: string; email: string; role: string } }> {
    return apiFetch('/api/users/me', {}, token);
  },
};

// Backend returns snake_case; normalize to camelCase for the frontend types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOrder(o: any): Order {
  return {
    id: o.id,
    userId: o.user_id ?? o.userId,
    deliveryType: o.delivery_type ?? o.deliveryType,
    deliveryAddress: o.delivery_address ?? o.deliveryAddress,
    subtotalCents: o.subtotal_cents ?? o.subtotalCents,
    taxCents: o.tax_cents ?? o.taxCents,
    deliveryFeeCents: o.delivery_fee_cents ?? o.deliveryFeeCents,
    totalCents: o.total_cents ?? o.totalCents,
    status: o.status,
    estimatedWaitMin: o.estimated_wait_min ?? o.estimatedWaitMin,
    createdAt: o.created_at ?? o.createdAt,
    lineItems: (o.lineItems ?? []).map((li: any): OrderLineItem => ({
      id: li.id,
      orderId: li.order_id ?? li.orderId,
      itemId: li.item_id ?? li.itemId,
      itemName: li.item_name ?? li.itemName,
      itemType: li.item_type ?? li.itemType,
      basePriceCents: li.base_price_cents ?? li.basePriceCents,
      qty: li.qty,
      lineTotalCents: li.line_total_cents ?? li.lineTotalCents,
      selectedOptions: li.selectedOptions ?? li.selected_options,
      slotChoices: li.slotChoices ?? li.slot_choices,
    })),
  };
}

export const ordersApi = {
  async place(body: Record<string, unknown>, token: string): Promise<{ order: Order; lineItems: OrderLineItem[] }> {
    const res = await apiFetch<{ order: unknown; lineItems: unknown[] }>('/api/orders', { method: 'POST', body: JSON.stringify(body) }, token);
    const normalized = normalizeOrder(res.order);
    return { order: normalized, lineItems: normalized.lineItems };
  },
  async myOrders(token: string): Promise<{ orders: Order[] }> {
    const res = await apiFetch<{ orders: unknown[] }>('/api/orders/me', {}, token);
    return { orders: (res.orders ?? []).map(normalizeOrder) };
  },
  async getById(id: string, token: string): Promise<{ order: Order }> {
    const res = await apiFetch<{ order: unknown }>(`/api/orders/${id}`, {}, token);
    return { order: normalizeOrder(res.order) };
  },
};

export interface Slot {
  slotTime: string;   // "YYYY-MM-DDTHH:MM"
  capacity: number;
  booked: number;
  remaining: number;
  soldOut: boolean;
  filling: boolean;
}

export const slotsApi = {
  getSlots(date: string): Promise<{ date: string; slots: Slot[] }> {
    return apiFetch(`/api/slots?date=${encodeURIComponent(date)}`);
  },
  reserve(slotTime: string, token: string): Promise<{ slot: Slot }> {
    return apiFetch('/api/slots/reserve', { method: 'POST', body: JSON.stringify({ slotTime }) }, token);
  },
};

export interface DistanceResult {
  withinRadius: boolean;
  distanceMiles: number;
  deliveryPartner: 'in-house' | 'uber' | 'doordash';
}

export const distanceApi = {
  // Returns null if the endpoint isn't available yet (wired up in Phase 3-E),
  // so the order flow degrades gracefully and still accepts the address.
  async check(address: string): Promise<DistanceResult | null> {
    try {
      return await apiFetch<DistanceResult>(`/api/distance?address=${encodeURIComponent(address)}`);
    } catch {
      return null;
    }
  },
};

// ── Artisan Vault rewards (Phase 3-D) ──
export interface RewardMilestone {
  points: number;
  label: string;
  itemCategory: string;
  unlocked: boolean;
}

export interface RewardsSummary {
  balance: number;
  milestones: RewardMilestone[];
  unlocked: RewardMilestone[];
  nextMilestone: RewardMilestone | null;
  pointsToNext: number;
  progressPct: number;
  lifetimeCents: number;
}

export interface RewardLine {
  itemId: string;
  itemName: string;
  itemType: 'regular';
  basePriceCents: number;
  originalPriceCents: number;
  pointsCost: number;
  isReward: true;
}

export const rewardsApi = {
  getMine(token: string): Promise<{ rewards: RewardsSummary }> {
    return apiFetch('/api/users/me/rewards', {}, token);
  },
  redeem(
    body: { milestonePoints: number; itemId?: string },
    token: string,
  ): Promise<{ milestone: RewardMilestone; reward: RewardLine }> {
    return apiFetch('/api/rewards/redeem', { method: 'POST', body: JSON.stringify(body) }, token);
  },
};

export interface AdminOrder {
  id: string;
  user_id: number;
  delivery_type: 'delivery' | 'pickup';
  delivery_address?: string;
  subtotal_cents: number;
  tax_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  scheduled_for?: string;
  created_at: string;
  lineItems: OrderLineItem[];
}

export interface DashboardStats {
  todayOrderCount: number;
  todayRevenueCents: number;
  pendingOrderCount: number;
}

export const adminApi = {
  getAllMenu(token: string): Promise<{ data: MenuItem[] }> {
    return apiFetch('/api/admin/menu', {}, token);
  },
  createItem(body: Record<string, unknown>, token: string): Promise<{ data: MenuItem }> {
    return apiFetch('/api/admin/menu', { method: 'POST', body: JSON.stringify(body) }, token);
  },
  updateItem(id: string, body: Record<string, unknown>, token: string): Promise<{ data: MenuItem }> {
    return apiFetch(`/api/admin/menu/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
  },
  deleteItem(id: string, token: string): Promise<void> {
    return apiFetch(`/api/admin/menu/${id}`, { method: 'DELETE' }, token);
  },
  toggleStock(id: string, inStock: boolean, token: string): Promise<{ data: MenuItem }> {
    return apiFetch(`/api/admin/menu/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ inStock }) }, token);
  },
  getAllOrders(token: string): Promise<{ orders: AdminOrder[] }> {
    return apiFetch('/api/admin/orders', {}, token);
  },
  updateOrderStatus(id: string, status: string, token: string): Promise<{ order: AdminOrder }> {
    return apiFetch(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
  },
  getDashboard(token: string): Promise<{ stats: DashboardStats }> {
    return apiFetch('/api/admin/dashboard', {}, token);
  },
};
