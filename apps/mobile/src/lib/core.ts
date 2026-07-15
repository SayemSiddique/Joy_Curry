// Mobile composition root for @joy-curry/core (counterpart of
// apps/web/src/lib/core.ts). Unlike web, init is ASYNC — the native storage
// cache must hydrate before initCore runs, because core's stores read their
// persisted state (session, cart) inside initCore's hydration hooks. The root
// layout awaits initMobileCore() before rendering any screen, so screens can
// import from '@joy-curry/core' directly.
//
// EXPO_PUBLIC_API_BASE_URL is inlined by Expo at bundle time (set in .env).
// The empty-string fallback mirrors web: a misconfigured build fails loudly on
// the first request instead of silently calling a stale host.
import { initCore } from '@joy-curry/core';
import { createNativeStorage } from './storage';

let ready: Promise<void> | null = null;

export function initMobileCore(): Promise<void> {
  ready ??= (async () => {
    const storage = await createNativeStorage();
    initCore({
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
      storage,
      // Dev-only observational zod validation of API responses (S7);
      // production pays zero parsing cost.
      validateResponses: __DEV__,
    });
  })();
  return ready;
}
