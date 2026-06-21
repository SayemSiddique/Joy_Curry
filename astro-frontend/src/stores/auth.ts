import { atom, computed } from 'nanostores';
import { rewardsApi, type RewardsSummary } from '@lib/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin';
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

const STORAGE_KEY = 'jc_auth';

function loadFromStorage(): AuthState {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export const authState = atom<AuthState>(loadFromStorage());

export const isAuthenticated = computed(authState, (s) => s.token !== null && s.user !== null);

export const isAdmin = computed(authState, (s) => s.user?.role === 'admin');

export function setAuth(token: string, user: AuthUser): void {
  const next: AuthState = { token, user };
  authState.set(next);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

export function clearAuth(): void {
  authState.set({ token: null, user: null });
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getToken(): string | null {
  return authState.get().token;
}

export const authOpen = atom<boolean>(false);
export const orderHistoryOpen = atom<boolean>(false);
export const adminPanelOpen = atom<boolean>(false);

// ── Artisan Vault rewards (Phase 3-D) ──
export const rewardsState = atom<RewardsSummary | null>(null);
export const vaultOpen = atom<boolean>(false);

/** Sync the logged-in user's rewards summary; clears it when signed out. */
export async function loadRewards(): Promise<void> {
  const token = authState.get().token;
  if (!token) {
    rewardsState.set(null);
    return;
  }
  try {
    const { rewards } = await rewardsApi.getMine(token);
    rewardsState.set(rewards);
  } catch {
    rewardsState.set(null);
  }
}
