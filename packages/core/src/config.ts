// Platform configuration for @joy-curry/core.
//
// Shared code must not touch platform APIs directly: no import.meta.env
// (Vite-only — breaks under Metro/Hermes), no window.localStorage (absent in
// React Native). Each app calls initCore() once at its composition root:
//   web    → apps/web/src/lib/core.ts (localStorage + PUBLIC_API_BASE_URL)
//   mobile → app entry (SecureStore/AsyncStorage adapter + EXPO_PUBLIC_API_BASE_URL)

/** Minimal synchronous key-value storage. window.localStorage satisfies this
 *  directly; React Native supplies an adapter over its async storage. */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory fallback so stores stay functional (non-persistent) during SSR
 *  or before initCore runs. */
function createMemoryStorage(): KVStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

let apiBaseUrl: string | null = null;
let storage: KVStorage = createMemoryStorage();
let initialized = false;

const initHooks: (() => void)[] = [];

/** Register a callback to run once initCore() has configured the platform —
 *  stores use this to hydrate from persistent storage. Runs immediately if
 *  core is already initialized. */
export function onCoreInit(fn: () => void): void {
  if (initialized) fn();
  else initHooks.push(fn);
}

export interface CoreConfig {
  /** Backend origin, e.g. "http://localhost:3000". Empty string is allowed
   *  (fails loudly on first request rather than calling a stale host). */
  apiBaseUrl: string;
  /** Platform storage; omit to keep the in-memory fallback (SSR). */
  storage?: KVStorage;
}

export function initCore(config: CoreConfig): void {
  apiBaseUrl = config.apiBaseUrl;
  if (config.storage) storage = config.storage;
  const firstInit = !initialized;
  initialized = true;
  if (firstInit) {
    for (const fn of initHooks) fn();
    initHooks.length = 0;
  }
}

export function getApiBaseUrl(): string {
  if (apiBaseUrl === null) {
    throw new Error(
      '@joy-curry/core: initCore({ apiBaseUrl }) must be called before using the API client',
    );
  }
  return apiBaseUrl;
}

export function getStorage(): KVStorage {
  return storage;
}

/** UUID for cart line items. crypto.randomUUID is missing on older Hermes,
 *  so fall back to a random hex id. */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
