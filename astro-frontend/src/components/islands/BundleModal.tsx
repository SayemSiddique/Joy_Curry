import { useState, useEffect, useCallback } from 'react';
import type { ReadableAtom } from 'nanostores';
import type { MenuItem } from '@lib/api';
import { BUNDLE_MAP, type BundleDefinition, type BundleSlot } from '@lib/bundleData';
import { cartOpen, addToCart } from '@stores/cart';
import { formatPrice } from '@lib/formatters';

// Same useNano pattern used by all other islands — avoids @nanostores/react
// React 19 + Astro SSR compatibility issue.
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

interface ActiveBundle {
  itemId: string;
  itemName: string;
  basePriceCents: number;
  definition: BundleDefinition;
}

interface Props {
  menuItems: MenuItem[];
}

export default function BundleModal({ menuItems }: Props) {
  const [activeBundle, setActiveBundle] = useState<ActiveBundle | null>(null);
  // slotSelections: slotId -> array of selected optionIds
  const [slotSelections, setSlotSelections] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Build id→name lookup from the full menu items list passed from SSR
  const nameMap = new Map<string, string>(menuItems.map((m) => [m.id, m.name]));

  const open = activeBundle !== null;

  // Listen for clicks on bundle configure buttons (event delegation)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(
        '.menu-card__configure-btn',
      ) as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;

      const itemId = btn.dataset.bundleId ?? '';
      const itemName = btn.dataset.bundleName ?? '';
      const basePriceCents = parseInt(btn.dataset.priceCents ?? '0', 10);
      const definition = BUNDLE_MAP.get(itemId);
      if (!itemId || !definition) return;

      setActiveBundle({ itemId, itemName, basePriceCents, definition });
      setSlotSelections({});
      setQty(1);
      setValidationError(null);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleClose = useCallback(() => {
    setActiveBundle(null);
    setValidationError(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  const handleSlotChange = (slotId: string, optionId: string, choose: number, checked: boolean) => {
    setValidationError(null);
    setSlotSelections((prev) => {
      const current = prev[slotId] ?? [];
      if (choose === 1) {
        return { ...prev, [slotId]: [optionId] };
      }
      if (checked) {
        // Don't exceed choose limit
        if (current.includes(optionId)) return prev;
        if (current.length >= choose) return prev;
        return { ...prev, [slotId]: [...current, optionId] };
      } else {
        return { ...prev, [slotId]: current.filter((id) => id !== optionId) };
      }
    });
  };

  const handleSubmit = () => {
    if (!activeBundle) return;
    const { definition, itemId, itemName, basePriceCents } = activeBundle;

    // Validate all slots are fully filled
    for (const slot of definition.slots) {
      const selected = slotSelections[slot.id] ?? [];
      if (selected.length !== slot.choose) {
        const needed = slot.choose - selected.length;
        setValidationError(
          `Please select ${needed} more from "${slot.label}"`,
        );
        return;
      }
    }

    // Build slotChoices Record<slotId, itemName[]>
    const slotChoices: Record<string, string[]> = {};
    for (const slot of definition.slots) {
      const ids = slotSelections[slot.id] ?? [];
      slotChoices[slot.label] = ids.map((id) => nameMap.get(id) ?? id);
    }

    // Also include fixed item names in slotChoices for display in cart
    if (definition.fixedItemIds.length > 0) {
      slotChoices['Included'] = definition.fixedItemIds.map(
        (id) => nameMap.get(id) ?? id,
      );
    }

    const lineTotalCents = basePriceCents * qty;

    addToCart({
      itemId,
      name: itemName,
      basePriceCents,
      qty,
      lineTotalCents,
      slotChoices,
      itemType: 'bundle',
    });

    cartOpen.set(true);
    handleClose();
  };

  if (!activeBundle) return null;

  const { itemName, basePriceCents, definition } = activeBundle;
  const priceCents = basePriceCents * qty;

  return (
    <div
      className={`modal-overlay${open ? ' modal-overlay--visible' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      {/* Modal — stop propagation so clicks inside don't close the overlay */}
      <div
        className={`modal modal--wide bundle-modal${open ? ' bundle-modal--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bundle-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title" id="bundle-modal-title">
            {itemName}
          </h2>
          <button
            className="modal__close"
            onClick={handleClose}
            aria-label="Close bundle options"
          >
            ✕
          </button>
        </div>

        <div className="modal__body bundle-modal__body">
          {/* Always-included items */}
          {definition.includes.length > 0 && (
            <div className="bundle-modal__includes">
              <span className="bundle-modal__includes-label">Always included:</span>
              {definition.includes.map((item) => (
                <span key={item} className="bundle-modal__includes-tag">{item}</span>
              ))}
            </div>
          )}

          {/* Fixed items */}
          {definition.fixedItemIds.length > 0 && (
            <div className="bundle-modal__fixed">
              <p className="bundle-modal__fixed-label">Fixed items included</p>
              {definition.fixedItemIds.map((id) => (
                <div key={id} className="bundle-modal__fixed-item">
                  ✓ {nameMap.get(id) ?? id}
                </div>
              ))}
            </div>
          )}

          {/* Slots */}
          {definition.slots.map((slot) => (
            <SlotSection
              key={slot.id}
              slot={slot}
              selections={slotSelections[slot.id] ?? []}
              nameMap={nameMap}
              onChange={(optionId, checked) =>
                handleSlotChange(slot.id, optionId, slot.choose, checked)
              }
            />
          ))}

          {/* No slots and no choices — purely fixed */}
          {definition.slots.length === 0 && definition.fixedItemIds.length > 0 && (
            <p className="bundle-modal__fixed-note">
              No choices needed — all items are included above.
            </p>
          )}

          {/* Validation error */}
          {validationError && (
            <div className="bundle-modal__error" role="alert">
              {validationError}
            </div>
          )}
        </div>

        <div className="modal__footer bundle-modal__footer">
          {/* Qty stepper */}
          <div className="bundle-modal__qty-row">
            <span className="bundle-modal__qty-label">Qty</span>
            <div className="cart-item__qty" role="group" aria-label="Quantity">
              <button
                className="cart-item__qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                type="button"
              >
                −
              </button>
              <span className="cart-item__qty-value" aria-live="polite">
                {qty}
              </span>
              <button
                className="cart-item__qty-btn"
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                aria-label="Increase quantity"
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <button
            className="bundle-modal__add-btn"
            onClick={handleSubmit}
            type="button"
          >
            Add to Order — {formatPrice(priceCents)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Slot section sub-component ──────────────────────────────────────────────

interface SlotSectionProps {
  slot: BundleSlot;
  selections: string[];
  nameMap: Map<string, string>;
  onChange: (optionId: string, checked: boolean) => void;
}

function SlotSection({ slot, selections, nameMap, onChange }: SlotSectionProps) {
  const isRadio = slot.choose === 1;
  const legend =
    slot.choose === 1
      ? `Choose 1 — ${slot.label}`
      : `Choose ${slot.choose} — ${slot.label}`;

  const remaining = slot.choose - selections.length;

  return (
    <fieldset className="bundle-slot">
      <legend className="bundle-slot__legend">
        {legend}
        {remaining > 0 && (
          <span className="bundle-slot__remaining"> ({remaining} remaining)</span>
        )}
      </legend>
      <div className="bundle-slot__options">
        {slot.optionIds.map((id) => {
          const name = nameMap.get(id) ?? id;
          const checked = selections.includes(id);
          const atLimit = !isRadio && !checked && selections.length >= slot.choose;

          return (
            <label
              key={id}
              className={`bundle-slot__option${checked ? ' bundle-slot__option--selected' : ''}${atLimit ? ' bundle-slot__option--disabled' : ''}`}
            >
              <input
                type={isRadio ? 'radio' : 'checkbox'}
                name={`slot-${slot.id}`}
                value={id}
                checked={checked}
                disabled={atLimit}
                onChange={(e) => onChange(id, e.target.checked)}
                className="bundle-slot__input"
              />
              {name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
