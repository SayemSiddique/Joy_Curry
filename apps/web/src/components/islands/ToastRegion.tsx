import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Toast } from '@joy-curry/ui';
import type { ToastType } from '@lib/toast';

/**
 * ToastRegion — the single Base UI Toast host for the whole document.
 *
 * Mounted once in BaseLayout. The legacy `showToast()` façade (14 callers) now
 * dispatches a `jc:toast` window event instead of hand-injecting DOM nodes into
 * `#toast-container`; this island bridges that event into the Base UI toast
 * manager, so every caller stays byte-for-byte unchanged while the notifications
 * gain a real live-region, hover/focus pause, keyboard + swipe dismissal, and
 * focus management. See /BASE_UI_MIGRATION.md (Phase 5) for the bridge rationale.
 */

interface ToastDetail {
  message: string;
  type: ToastType;
  duration: number;
}

function ToastBridge() {
  const manager = Toast.useToastManager();

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type, duration } = (e as CustomEvent<ToastDetail>).detail;
      manager.add({
        title: message,
        // 'info' is the neutral default (no [data-type] variant); success/error
        // drive the brand color via CSS.
        type: type === 'info' ? undefined : type,
        timeout: duration,
      });
    };
    window.addEventListener('jc:toast', handler as EventListener);
    return () => window.removeEventListener('jc:toast', handler as EventListener);
  }, [manager]);

  return null;
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast} swipeDirection={['down', 'right']}>
          <Toast.Title />
          <Toast.Close aria-label="Dismiss notification">
            <X size={14} aria-hidden="true" />
          </Toast.Close>
        </Toast.Root>
      ))}
    </>
  );
}

export default function ToastRegion() {
  return (
    <Toast.Provider>
      <ToastBridge />
      <Toast.Portal>
        <Toast.Viewport>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
