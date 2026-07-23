import { Dialog as Base } from '@base-ui/react/dialog';
import { styled } from '../utils/styled';
import './Dialog.css';

/**
 * Dialog — Base UI Dialog, styled from global.css tokens.
 *
 * Behavior/a11y (focus trap, ESC + backdrop dismiss, focus return, scroll-lock,
 * ARIA roles/ids) comes from Base UI. Look comes entirely from Dialog.css, which
 * is the promoted-to-production version of the original BaseUISpike.css.
 *
 * Compound API mirrors Base UI so it reads the same in every island:
 *   <Dialog.Root>
 *     <Dialog.Trigger>…</Dialog.Trigger>       // your own button, unstyled here
 *     <Dialog.Portal>
 *       <Dialog.Backdrop />
 *       <Dialog.Popup>
 *         <Dialog.Title>…</Dialog.Title>
 *         <Dialog.Description>…</Dialog.Description>
 *         …content…
 *         <Dialog.Close>…</Dialog.Close>
 *       </Dialog.Popup>
 *     </Dialog.Portal>
 *   </Dialog.Root>
 *
 * `Root`, `Trigger`, `Portal`, `Close` pass through unstyled — triggers/closes
 * are usually your own branded buttons. `Backdrop`, `Popup`, `Title`,
 * `Description` carry brand classes (still overridable via `className`).
 */
export const Dialog = {
  Root: Base.Root,
  Portal: Base.Portal,
  // Trigger/Close render real DOM buttons and usually carry the caller's own
  // classes. Route them through styled() with an EMPTY default class: they add
  // no brand class, but they still strip the control props (`unstyled`, and the
  // brand `className` merge) so those never leak to the DOM as attributes.
  Trigger: styled(Base.Trigger, ''),
  Close: styled(Base.Close, ''),
  Backdrop: styled(Base.Backdrop, 'jc-dialog__backdrop'),
  Popup: styled(Base.Popup, 'jc-dialog__popup'),
  Title: styled(Base.Title, 'jc-dialog__title'),
  Description: styled(Base.Description, 'jc-dialog__desc'),
};
