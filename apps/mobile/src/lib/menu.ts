import { menuApi, type MenuItem } from '@joy-curry/core';

// ── Session-scoped menu cache ────────────────────────────────────────────────
// The menu screen loads the full list once; the dish/bundle/cart screens then
// resolve items synchronously from this cache instead of re-fetching (the
// bundle picker alone needs ~30 lookups for its option pools). refresh() gives
// pull-to-refresh a way to bust it.

let inflight: Promise<MenuItem[]> | null = null;
let byId = new Map<string, MenuItem>();

export function loadMenu(force = false): Promise<MenuItem[]> {
  if (!inflight || force) {
    inflight = menuApi.getAll().then(({ data }) => {
      byId = new Map(data.map((m) => [m.id, m]));
      return data;
    });
    inflight.catch(() => {
      inflight = null; // allow retry after a failed load
    });
  }
  return inflight;
}

export function getItem(id: string): MenuItem | undefined {
  return byId.get(id);
}

// Same rule the web MenuCard uses to route to the bundle configurator.
export function isBundle(item: Pick<MenuItem, 'category'>): boolean {
  return item.category === 'dinner-special' || item.category === 'combo';
}

// imageUrl values are web-root-relative (/images/dishes/x.jpg) — served by the
// web app, not the API. Absolute URLs pass through untouched.
const ASSET_BASE = process.env.EXPO_PUBLIC_WEB_ASSET_BASE_URL ?? '';

export function imageUri(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return ASSET_BASE ? `${ASSET_BASE}${imageUrl}` : undefined;
}
