import { atom, computed } from 'nanostores';

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
