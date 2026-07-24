export type ToastType = 'success' | 'error' | 'info';

/**
 * showToast — the app-wide toast façade. Unchanged public signature, so all
 * callers (islands + plain functions) keep working. Under the hood it now
 * dispatches a `jc:toast` window event that the single mounted `ToastRegion`
 * island (Base UI Toast) renders — giving proper live-region announcements,
 * hover/focus pause, and keyboard/swipe dismissal. See /BASE_UI_MIGRATION.md
 * (Phase 5) for why this bridges rather than each caller using the manager.
 */
export function showToast(message: string, type: ToastType = 'info', duration = 3200): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('jc:toast', { detail: { message, type, duration } }),
  );
}
