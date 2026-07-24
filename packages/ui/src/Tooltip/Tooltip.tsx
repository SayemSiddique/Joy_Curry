import { Tooltip as Base } from '@base-ui/react/tooltip';
import { styled } from '../utils/styled';
import './Tooltip.css';

/**
 * Tooltip — Base UI Tooltip, styled from global.css tokens.
 *
 * Owns the hover/focus intent, open delay, `aria-describedby` linkage from the
 * trigger to the popup, dismissal (pointer-out, ESC, scroll), and anchored
 * portaled positioning. Wrap a `Tooltip.Provider` once near the island root to
 * share a single delay across many triggers.
 *
 * Compound API mirrors Base UI. The Trigger is a pass-through so callers render
 * their own element (a badge span, an icon button) via Base UI's `render` prop
 * and keep their existing className:
 *
 *   <Tooltip.Provider delay={200}>
 *     <Tooltip.Root>
 *       <Tooltip.Trigger render={<span className="badge badge--gf">GF</span>} />
 *       <Tooltip.Portal>
 *         <Tooltip.Positioner side="top" sideOffset={6}>
 *           <Tooltip.Popup>Gluten-free</Tooltip.Popup>
 *         </Tooltip.Positioner>
 *       </Tooltip.Portal>
 *     </Tooltip.Root>
 *   </Tooltip.Provider>
 *
 * Pass `unstyled` on Positioner/Popup to drop the brand default and bring your
 * own CSS.
 */
export const Tooltip = {
  Provider: Base.Provider,
  Root: Base.Root,
  // Trigger stays a pass-through — the caller supplies the real element/button.
  Trigger: Base.Trigger,
  Portal: Base.Portal,
  Positioner: styled(Base.Positioner, 'jc-tooltip__positioner'),
  Popup: styled(Base.Popup, 'jc-tooltip__popup'),
  Arrow: styled(Base.Arrow, 'jc-tooltip__arrow'),
};
