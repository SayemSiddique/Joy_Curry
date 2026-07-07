import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ReadableAtom } from 'nanostores';
import type { MenuItem } from '@lib/api';
import {
  BUNDLE_MAP,
  buildDefaultSelections,
  type BundleDefinition,
  type BundleSlot,
} from '@lib/bundleData';
import { cartOpen, addToCart } from '@stores/cart';
import { formatPrice } from '@lib/formatters';

// Same useNano pattern used by all other islands — avoids @nanostores/react
// React 19 + Astro SSR compatibility issue.
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

// Emoji fallback when an option has no imageUrl (mirrors MenuCard.astro).
const CATEGORY_EMOJI: Record<string, string> = {
  appetizer: '🥗',
  salad: '🥗',
  soup: '🍲',
  'vegetable-entree': '🥦',
  'vegan-entree': '🌱',
  'chicken-entree': '🍗',
  'meat-entree': '🥩',
  'fish-shrimp': '🦐',
  tandoori: '🔥',
  'rice-biryani': '🍚',
  'express-lunch': '⚡',
  bread: '🫓',
  side: '🍛',
  condiment: '🧄',
  dessert: '🍮',
  beverage: '🥤',
  'dinner-special': '🍽️',
  combo: '🥘',
};

// Title-case a subcategory slug for use as a sub-group heading.
function prettyLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
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
  // Set true once the user tries to add — gates aria-invalid + inline errors so
  // a freshly-opened (valid-by-default) bundle isn't pre-littered with errors.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Full id→MenuItem lookup from the SSR list (image, name, subcategory…).
  const itemMap = useMemo(
    () => new Map<string, MenuItem>(menuItems.map((m) => [m.id, m])),
    [menuItems],
  );
  const nameOf = useCallback(
    (id: string) => itemMap.get(id)?.name ?? id,
    [itemMap],
  );

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

      lastFocusedRef.current = btn;
      setActiveBundle({ itemId, itemName, basePriceCents, definition });
      setSlotSelections(buildDefaultSelections(definition)); // smart defaults
      setQty(1);
      setAttemptedSubmit(false);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleClose = useCallback(() => {
    setActiveBundle(null);
    setAttemptedSubmit(false);
    // Restore focus to the launcher that opened the modal.
    lastFocusedRef.current?.focus();
    lastFocusedRef.current = null;
  }, []);

  // Escape to close + focus trap (Tab cycles within the modal).
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const root = modalRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // Move focus into the modal on open.
  useEffect(() => {
    if (!open) return;
    const root = modalRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>('.modal__close');
    target?.focus();
  }, [open]);

  const handleSlotChange = (
    slotId: string,
    optionId: string,
    choose: number,
    checked: boolean,
  ) => {
    setSlotSelections((prev) => {
      const current = prev[slotId] ?? [];
      if (choose === 1) {
        return { ...prev, [slotId]: [optionId] };
      }
      if (checked) {
        if (current.includes(optionId)) return prev;
        if (current.length >= choose) return prev;
        return { ...prev, [slotId]: [...current, optionId] };
      }
      return { ...prev, [slotId]: current.filter((id) => id !== optionId) };
    });
  };

  // ── Live validity ──
  const slotIsComplete = useCallback(
    (slot: BundleSlot) => (slotSelections[slot.id]?.length ?? 0) === slot.choose,
    [slotSelections],
  );
  const definition = activeBundle?.definition;
  const incompleteSlots = definition
    ? definition.slots.filter((s) => !slotIsComplete(s))
    : [];
  const isValid = incompleteSlots.length === 0;

  const handleSubmit = () => {
    if (!activeBundle) return;
    setAttemptedSubmit(true);

    if (!isValid) {
      // Focus the first incomplete slot for keyboard + screen-reader users.
      const first = incompleteSlots[0];
      const el = modalRef.current?.querySelector<HTMLElement>(
        `[data-slot-id="${first.id}"]`,
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input')?.focus();
      return;
    }

    const { definition: def, itemId, itemName, basePriceCents } = activeBundle;

    // Build slotChoices Record<slotLabel, itemName[]> for cart display.
    const slotChoices: Record<string, string[]> = {};
    for (const slot of def.slots) {
      const ids = slotSelections[slot.id] ?? [];
      slotChoices[slot.label] = ids.map(nameOf);
    }
    if (def.fixedItemIds.length > 0) {
      slotChoices['Included'] = def.fixedItemIds.map(nameOf);
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

  const { itemName, basePriceCents } = activeBundle;
  const priceCents = basePriceCents * qty;
  const remainingChoices = incompleteSlots.reduce(
    (sum, s) => sum + (s.choose - (slotSelections[s.id]?.length ?? 0)),
    0,
  );

  return (
    <div
      className={`modal-overlay${open ? ' modal-overlay--visible' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={modalRef}
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
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal__body bundle-modal__body">
          {/* Always-included items */}
          {definition!.includes.length > 0 && (
            <div className="bundle-modal__includes">
              <span className="bundle-modal__includes-label">Always included:</span>
              {definition!.includes.map((item) => (
                <span key={item} className="bundle-modal__includes-tag">{item}</span>
              ))}
            </div>
          )}

          {/* Fixed items */}
          {definition!.fixedItemIds.length > 0 && (
            <div className="bundle-modal__fixed">
              <p className="bundle-modal__fixed-label">Fixed items included</p>
              {definition!.fixedItemIds.map((id) => (
                <div key={id} className="bundle-modal__fixed-item">
                  ✓ {nameOf(id)}
                </div>
              ))}
            </div>
          )}

          {/* Slots */}
          {definition!.slots.map((slot) => (
            <SlotSection
              key={slot.id}
              slot={slot}
              selections={slotSelections[slot.id] ?? []}
              itemMap={itemMap}
              invalid={attemptedSubmit && !slotIsComplete(slot)}
              onChange={(optionId, checked) =>
                handleSlotChange(slot.id, optionId, slot.choose, checked)
              }
            />
          ))}

          {/* No slots — purely fixed */}
          {definition!.slots.length === 0 && definition!.fixedItemIds.length > 0 && (
            <p className="bundle-modal__fixed-note">
              No choices needed — all items are included above.
            </p>
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

          <div className="bundle-modal__action">
            {/* Live validity readout */}
            <p
              className={`bundle-modal__validity${isValid ? ' bundle-modal__validity--ok' : ''}`}
              role="status"
              aria-live="polite"
            >
              {isValid
                ? '✓ Your combo is ready'
                : `Select ${remainingChoices} more ${remainingChoices === 1 ? 'item' : 'items'} to continue`}
            </p>
            <button
              className="bundle-modal__add-btn"
              onClick={handleSubmit}
              type="button"
              aria-disabled={!isValid}
            >
              Add to Order — {formatPrice(priceCents)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Option thumbnail — falls back to the category emoji if the image is missing
// or fails to load (real photos aren't all in place yet).
function OptionMedia({ imageUrl, emoji }: { imageUrl?: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = imageUrl && !failed;
  return (
    <span className="bundle-option__media" aria-hidden="true">
      {showImg ? (
        <img
          className="bundle-option__img"
          src={imageUrl}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="bundle-option__emoji">{emoji}</span>
      )}
    </span>
  );
}

// ── Slot section sub-component ──────────────────────────────────────────────

interface SlotSectionProps {
  slot: BundleSlot;
  selections: string[];
  itemMap: Map<string, MenuItem>;
  invalid: boolean;
  onChange: (optionId: string, checked: boolean) => void;
}

function SlotSection({ slot, selections, itemMap, invalid, onChange }: SlotSectionProps) {
  const isRadio = slot.choose === 1;
  const filled = selections.length;
  const complete = filled === slot.choose;

  // Group option ids by subcategory, preserving definition order.
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const id of slot.optionIds) {
      const sub = itemMap.get(id)?.subcategory ?? '';
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(id);
    }
    return [...map.entries()];
  }, [slot.optionIds, itemMap]);
  const showGroupHeadings = groups.length > 1;

  const errorId = `slot-error-${slot.id}`;

  return (
    <fieldset
      className={`bundle-slot${invalid ? ' bundle-slot--invalid' : ''}`}
      data-slot-id={slot.id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
    >
      <legend className="bundle-slot__legend">
        <span className="bundle-slot__legend-label">{slot.label}</span>
        <span
          className={`bundle-slot__progress${complete ? ' bundle-slot__progress--done' : ''}`}
        >
          {complete ? `✓ ${filled} of ${slot.choose}` : `${filled} of ${slot.choose} chosen`}
        </span>
      </legend>

      {invalid && (
        <p className="bundle-slot__error" id={errorId} role="alert">
          Choose {slot.choose - filled} more from {slot.label}.
        </p>
      )}

      {groups.map(([sub, ids]) => (
        <div key={sub || '_'} className="bundle-slot__group">
          {showGroupHeadings && sub && (
            <p className="bundle-slot__group-heading">{prettyLabel(sub)}</p>
          )}
          <div className="bundle-slot__options">
            {ids.map((id) => {
              const item = itemMap.get(id);
              const name = item?.name ?? id;
              const checked = selections.includes(id);
              const atLimit = !isRadio && !checked && filled >= slot.choose;
              const emoji = CATEGORY_EMOJI[item?.category ?? ''] ?? '🍽️';

              return (
                <label
                  key={id}
                  className={`bundle-option${checked ? ' bundle-option--selected' : ''}${atLimit ? ' bundle-option--disabled' : ''}`}
                >
                  <input
                    type={isRadio ? 'radio' : 'checkbox'}
                    name={`slot-${slot.id}`}
                    value={id}
                    checked={checked}
                    disabled={atLimit}
                    onChange={(e) => onChange(id, e.target.checked)}
                    className="bundle-option__input"
                  />
                  <OptionMedia imageUrl={item?.imageUrl} emoji={emoji} />
                  <span className="bundle-option__name">{name}</span>
                  <span className="bundle-option__check" aria-hidden="true">✓</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
