import { atom, computed } from 'nanostores';
import type { Order } from '../schemas';

export const mobileNavDrawerOpen = atom<boolean>(false);

// Lifted out of OrderTracker's local state so the nav bell and the tracker
// overlay share one source of truth. Still session-local (set by the
// 'order:confirmed' event, cleared when the tracker is closed) — not backed
// by a real /api/orders/me poll.
export const activeOrder = atom<Order | null>(null);
export const hasActiveOrder = computed(activeOrder, (o) => o !== null);
