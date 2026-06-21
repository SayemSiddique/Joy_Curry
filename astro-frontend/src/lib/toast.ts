export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'info', duration = 3200): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast${type !== 'info' ? ` toast--${type}` : ''}`;
  el.textContent = message;
  el.setAttribute('role', 'status');
  container.appendChild(el);

  // Double rAF so the browser registers the initial state before the transition fires
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.add('toast--visible'))
  );

  setTimeout(() => {
    el.classList.remove('toast--visible');
    setTimeout(() => el.remove(), 350);
  }, duration);
}
