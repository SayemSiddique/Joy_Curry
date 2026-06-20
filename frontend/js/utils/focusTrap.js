// Selector for all naturally focusable elements.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Trap keyboard focus within `container` while a modal is open.
 * Tab wraps from last → first; Shift+Tab wraps from first → last.
 *
 * @param {HTMLElement} container
 * @returns {() => void} cleanup — call when the modal closes
 */
export function trapFocus(container) {
  function getFocusable() {
    return [...container.querySelectorAll(FOCUSABLE)].filter(
      (el) => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]')
    );
  }

  function handleKeydown(e) {
    if (e.key !== 'Tab') return;
    const els = getFocusable();
    if (els.length === 0) return;
    const first = els[0];
    const last  = els[els.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeydown);
  return () => container.removeEventListener('keydown', handleKeydown);
}
