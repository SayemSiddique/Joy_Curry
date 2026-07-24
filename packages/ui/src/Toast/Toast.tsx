import { Toast as Base } from '@base-ui/react/toast';
import { styled } from '../utils/styled';
import './Toast.css';

/**
 * Toast — Base UI Toast, styled from global.css tokens.
 *
 * Owns the announcement a11y the hand-rolled `#toast-container` never had:
 * a proper toast region landmark (F6-focusable), `aria-live` politeness keyed
 * off `priority`, hover/focus-to-pause on the auto-dismiss timer, keyboard
 * dismissal, and swipe-to-dismiss. One `Toast.Provider` + `Toast.Viewport`
 * mounts once per document; toasts are pushed imperatively through
 * `Toast.useToastManager().add(...)`.
 *
 * In `apps/web` this backs the existing `showToast()` façade (a single mounted
 * `ToastRegion` island bridges a `jc:toast` window event → `.add()`), so every
 * caller stays unchanged while gaining Base UI's behavior. See the migration
 * tracker for the bridge rationale.
 *
 * Compound API mirrors Base UI:
 *   <Toast.Provider>
 *     <Toast.Viewport>
 *       {manager.toasts.map((t) => (
 *         <Toast.Root key={t.id} toast={t} swipeDirection={['down', 'right']}>
 *           <Toast.Title />
 *           <Toast.Description />
 *           <Toast.Close aria-label="Dismiss" />
 *         </Toast.Root>
 *       ))}
 *     </Toast.Viewport>
 *   </Toast.Provider>
 *
 * Base UI stamps `[data-type]` on the Root from the toast's `type`, so brand
 * success/error variants are pure CSS. Pass `unstyled` on any part to drop the
 * brand default and bring your own CSS.
 */
export const Toast = {
  // Context/setup parts carry no chrome — pass-throughs.
  Provider: Base.Provider,
  Portal: Base.Portal,
  Positioner: styled(Base.Positioner, 'jc-toast__positioner'),
  Viewport: styled(Base.Viewport, 'jc-toast__viewport'),
  Root: styled(Base.Root, 'jc-toast'),
  Title: styled(Base.Title, 'jc-toast__title'),
  Description: styled(Base.Description, 'jc-toast__description'),
  Action: styled(Base.Action, 'jc-toast__action'),
  Close: styled(Base.Close, 'jc-toast__close'),
  // Imperative surface — call inside the Provider subtree.
  useToastManager: Base.useToastManager,
};
