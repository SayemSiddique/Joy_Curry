import { useState } from 'react';
import { Dialog } from '@joy-curry/ui';
import { ShoppingBag, Check } from 'lucide-react';
import './BaseUISpike.css';

/**
 * SPIKE (throwaway) — now validates the PRODUCTION seam: it imports `Dialog`
 * from `@joy-curry/ui` (not `@base-ui/react` directly), proving Astro/Vite
 * resolves the workspace package, bundles its co-located Dialog.css, and that
 * Base UI's behavior (focus trap, ESC/backdrop close, ARIA) flows through the
 * token-styled wrapper. Popup/Backdrop/Title/Description now get their look from
 * the package's Dialog.css; only the buttons keep spike-local classes.
 * Delete this file + BaseUISpike.css + the /spike page in Phase 6.
 */
export default function BaseUISpike() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="spike">
      <p className="spike__label">@joy-curry/ui Dialog — Base UI behavior, styled by your tokens</p>

      <Dialog.Root>
        <Dialog.Trigger className="spike__btn spike__btn--primary">
          <ShoppingBag size={18} aria-hidden="true" />
          Confirm your order
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup>
            <Dialog.Title>Confirm order</Dialog.Title>
            <Dialog.Description>
              This dialog is fully accessible out of the box — focus is trapped,
              ESC and the backdrop close it, and ARIA roles are wired for you.
              Every pixel here is your <code>global.css</code> brand tokens.
            </Dialog.Description>

            {confirmed && (
              <p className="spike__confirmed" role="status">
                <Check size={16} aria-hidden="true" /> Confirmed!
              </p>
            )}

            <div className="spike__actions">
              <Dialog.Close className="spike__btn spike__btn--ghost">Cancel</Dialog.Close>
              <button
                className="spike__btn spike__btn--primary"
                onClick={() => setConfirmed(true)}
              >
                Place order
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
