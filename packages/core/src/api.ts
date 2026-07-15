import { getApiBaseUrl } from './config';
import {
  MenuItemSchema,
  OrderSchema,
  UserProfileSchema,
  parseInDev,
} from './schemas';

// Types for these resources are now inferred from the zod schemas (schemas.ts).
// The barrel (index.ts) re-exports them from schemas, so existing
// `import { MenuItem, Order, ... } from '@joy-curry/core'` sites are unaffected.
import type { MenuItem, Order, OrderLineItem, UserProfile } from './schemas';

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

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json as T;
}

export const menuApi = {
  async getAll(): Promise<{ data: MenuItem[] }> {
    const res = await apiFetch<{ data: MenuItem[] }>('/api/menu');
    return { data: parseInDev(MenuItemSchema.array(), res.data, 'menu.getAll') };
  },
  async getById(id: string): Promise<{ data: MenuItem }> {
    const res = await apiFetch<{ data: MenuItem }>(`/api/menu/${id}`);
    return { data: parseInDev(MenuItemSchema, res.data, 'menu.getById') };
  },
};

export const authApi = {
  async register(body: { name: string; email: string; password: string; phone?: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/users/register', { method: 'POST', body: JSON.stringify(body) });
    return { ...res, user: parseInDev(UserProfileSchema, res.user, 'authApi.register') };
  },
  async login(body: { email: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/users/login', { method: 'POST', body: JSON.stringify(body) });
    return { ...res, user: parseInDev(UserProfileSchema, res.user, 'authApi.login') };
  },
  async me(token: string): Promise<{ user: UserProfile }> {
    const res = await apiFetch<{ user: UserProfile }>('/api/users/me', {}, token);
    return { user: parseInDev(UserProfileSchema, res.user, 'authApi.me') };
  },
  updateMe(body: { name?: string; phone?: string; birthday?: string | null; dietaryPrefs?: string[]; addresses?: string[] }, token: string): Promise<{ user: UserProfile }> {
    return apiFetch('/api/users/me', { method: 'PUT', body: JSON.stringify(body) }, token);
  },
  rewards(token: string): Promise<{ rewards: { points: number; tier: string; nextTierPoints: number; lifetimeCents: number } }> {
    return apiFetch('/api/users/me/rewards', {}, token);
  },
};

// ── Passwordless email OTP sign-in / sign-up ──
export const otpApi = {
  // Sends a 6-digit code to the email. `devCode` is only returned in local dev
  // (no Resend key) so the flow stays testable without a live inbox.
  request(email: string): Promise<{ sent: boolean; devCode?: string }> {
    return apiFetch('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ email }) });
  },
  // Verifies the code. If the account exists you get a token + user; otherwise
  // `exists: false` plus a short-lived ticket to finish creating the account.
  verify(email: string, code: string): Promise<
    | { exists: true; token: string; user: UserProfile }
    | { exists: false; ticket: string }
  > {
    return apiFetch('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
  },
  register(body: { ticket: string; name: string; phone?: string }): Promise<{ token: string; user: UserProfile }> {
    return apiFetch('/api/auth/otp/register', { method: 'POST', body: JSON.stringify(body) });
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
    paymentStatus: o.payment_status ?? o.paymentStatus,
    estimatedWaitMin: o.estimated_wait_min ?? o.estimatedWaitMin,
    notes: o.notes ?? undefined,
    dropOffInstructions: o.drop_off_instructions ?? o.dropOffInstructions ?? undefined,
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
    const normalized = parseInDev(OrderSchema, normalizeOrder(res.order), 'ordersApi.place');
    return { order: normalized, lineItems: normalized.lineItems };
  },
  async myOrders(token: string): Promise<{ orders: Order[] }> {
    const res = await apiFetch<{ orders: unknown[] }>('/api/orders/me', {}, token);
    return { orders: parseInDev(OrderSchema.array(), (res.orders ?? []).map(normalizeOrder), 'ordersApi.myOrders') };
  },
  async getById(id: string, token: string): Promise<{ order: Order }> {
    const res = await apiFetch<{ order: unknown }>(`/api/orders/${id}`, {}, token);
    return { order: parseInDev(OrderSchema, normalizeOrder(res.order), 'ordersApi.getById') };
  },
};

export const paymentsApi = {
  // The server derives the charge amount from the stored order total —
  // the client only identifies WHICH order it is paying.
  createIntent(orderId: string, token: string): Promise<{ clientSecret: string; amountCents: number }> {
    return apiFetch('/api/payments/intent', { method: 'POST', body: JSON.stringify({ orderId }) }, token);
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
  deliveryFeeCents: number;
  quoteId?: string;
  etaMinutes?: number | null;
  simulated?: boolean;
}

export const distanceApi = {
  // Returns null if the endpoint is unreachable, so the order flow degrades
  // gracefully and still accepts the address (server re-routes authoritatively).
  // subtotalCents lets the server price the in-house free-delivery waiver and the
  // out-of-zone courier quote (DoorDash needs the order value).
  async check(address: string, subtotalCents = 0): Promise<DistanceResult | null> {
    try {
      return await apiFetch<DistanceResult>(
        `/api/distance?address=${encodeURIComponent(address)}&subtotalCents=${subtotalCents}`,
      );
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
  streak?: number;
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

// ── Push notification device tokens (mobile — Session 12) ──
// The mobile app registers its Expo push token after the first order (and on
// every launch thereafter) and deletes it on logout. Web never calls these.
export const deviceTokenApi = {
  register(token: string, platform: 'ios' | 'android' | 'unknown', authToken: string): Promise<{ ok: boolean }> {
    return apiFetch('/api/users/me/device-token', { method: 'POST', body: JSON.stringify({ token, platform }) }, authToken);
  },
  remove(token: string, authToken: string): Promise<{ ok: boolean }> {
    return apiFetch('/api/users/me/device-token', { method: 'DELETE', body: JSON.stringify({ token }) }, authToken);
  },
};

export const favoritesApi = {
  getMyFavorites(token: string): Promise<{ itemIds: string[] }> {
    return apiFetch('/api/favorites/me', {}, token);
  },
  addFavorite(itemId: string, token: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/favorites/${itemId}`, { method: 'POST' }, token);
  },
  removeFavorite(itemId: string, token: string): Promise<{ ok: boolean }> {
    return apiFetch(`/api/favorites/${itemId}`, { method: 'DELETE' }, token);
  },
};
