// Web composition root for @joy-curry/core.
//
// All web code imports core exports from THIS module (never from
// '@joy-curry/core' directly): ES module ordering then guarantees initCore
// has configured the platform before any store hydrates or the API client
// fires. The Expo app will have its own composition root with SecureStore.
//
// In production the backend URL MUST come from PUBLIC_API_BASE_URL, set in
// the Vercel project settings. The empty prod fallback is intentional: a
// misconfigured deploy fails loudly rather than silently calling a stale host.
import { initCore, getApiBaseUrl } from '@joy-curry/core';

initCore({
  apiBaseUrl:
    import.meta.env.PUBLIC_API_BASE_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  // window.localStorage satisfies KVStorage directly; during SSR core keeps
  // its in-memory fallback (stores render empty server-side, same as before).
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});

export * from '@joy-curry/core';

// Static convenience for web code that builds URLs directly (SSR page fetches,
// islands hitting endpoints the shared client doesn't wrap). Safe here because
// initCore has already run above.
export const API_BASE_URL = getApiBaseUrl();
