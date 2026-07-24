import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactElement } from 'react';
import { Dialog, Tooltip } from '@joy-curry/ui';
import { Flame, Leaf, ChefHat, AlertTriangle } from 'lucide-react';
import type { MenuItem } from '@lib/core';
import { formatPrice } from '@lib/core';
import { addToCart, updateCartItem, cartOpen } from '@lib/core';
import { flyToCart } from '@lib/cartAnimation';
import { showToast } from '@lib/toast';
import ReviewGallery from './ReviewGallery';

interface DishEditDetail {
  item: MenuItem;
  cartItemId: string;
  qty: number;
  modIds: string[];
}

function SpiceMeter({ level }: { level?: string | null }) {
  if (!level || level === 'Mild') return null;
  const lvl = level === 'Hot' ? 3 : level === 'Medium' ? 2 : 1;
  return (
    <span className="spice-meter" aria-label={`Spice level: ${level}`}>
      <span className="spice-meter__dots" aria-hidden="true">
        {[1, 2, 3].map(i => (
          <span key={i} className={`spice-dot${i <= lvl ? ' spice-dot--lit' : ''}`} />
        ))}
      </span>
      <span className="spice-meter__label">{level}</span>
    </span>
  );
}

/**
 * BadgeTip — wraps a dietary/quality badge with a Base UI tooltip that expands
 * its meaning on hover/focus. Base UI renders the badge itself as the trigger
 * (no extra tab stop for these non-interactive spans) and wires the
 * `aria-describedby` link; screen-reader users already hear the badge text, so
 * the tooltip is a progressive enhancement for pointer users.
 */
function BadgeTip({ tip, children }: { tip: string; children: ReactElement }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6}>
          <Tooltip.Popup>{tip}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export default function DishDetailModal() {
  const [item, setItem] = useState<MenuItem | null>(null);
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const open_ = useCallback((e: Event) => {
    const detail = (e as CustomEvent<MenuItem>).detail;
    setItem(detail);
    setQty(1);
    setSelectedModIds([]);
    setEditingCartItemId(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((e: Event) => {
    const detail = (e as CustomEvent<DishEditDetail>).detail;
    setItem(detail.item);
    setQty(detail.qty);
    setSelectedModIds(detail.modIds);
    setEditingCartItemId(detail.cartItemId);
    setOpen(true);
  }, []);

  // Single close path: Base UI drives it (ESC / backdrop / close button) via
  // onOpenChange, and handleAdd calls it directly. Reopening the cart when we
  // were editing a line item is preserved here so every close route behaves the
  // same. Base UI keeps the popup mounted through its exit animation, so we no
  // longer null `item` on a timer — leftover state is overwritten on next open.
  const closeModal = useCallback(() => {
    if (editingCartItemId !== null) cartOpen.set(true);
    setOpen(false);
  }, [editingCartItemId]);

  useEffect(() => {
    window.addEventListener('dish:open', open_);
    window.addEventListener('dish:edit', openEdit);
    return () => {
      window.removeEventListener('dish:open', open_);
      window.removeEventListener('dish:edit', openEdit);
    };
  }, [open_, openEdit]);

  const modifiers = item?.modifiers ?? [];
  const selectedMods = modifiers.filter((m) => selectedModIds.includes(m.id));
  const unitPriceCents = (item?.basePriceCents ?? 0) + selectedMods.reduce((sum, m) => sum + m.priceDeltaCents, 0);
  const totalCents = unitPriceCents * qty;

  const toggleModifier = (id: string) => {
    setSelectedModIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleAdd = () => {
    if (!item) return;
    const payload = {
      itemId: item.id,
      name: item.name,
      basePriceCents: item.basePriceCents,
      qty,
      lineTotalCents: totalCents,
      imageUrl: item.imageUrl,
      itemType: 'regular' as const,
      ...(modifiers.length > 0
        ? { selectedOptions: selectedMods.map((m) => ({ id: m.id, label: m.label, priceDeltaCents: m.priceDeltaCents })) }
        : {}),
    };

    if (editingCartItemId) {
      updateCartItem(editingCartItemId, payload);
      closeModal();
      return;
    }

    addToCart(payload);
    if (addBtnRef.current) flyToCart(addBtnRef.current);
    showToast('Added to your order', 'success');
    closeModal();
  };

  const isVeg = item ? (item.isVegan || item.isVegetarian) : false;

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeModal(); }}>
      {item && (
        <Dialog.Portal>
          <Dialog.Backdrop unstyled className="dish-modal__backdrop" />
          <div className="dish-modal__positioner">
            <Dialog.Popup unstyled className="dish-modal">
              {/* Close button */}
              <Dialog.Close className="dish-modal__close" aria-label="Close dish detail">✕</Dialog.Close>

              {/* Hero image — 60% left on desktop */}
              <div className="dish-modal__image-col">
                {item.imageUrl ? (
                  <img
                    className="dish-modal__img"
                    src={item.imageUrl}
                    alt={item.name}
                    loading="eager"
                  />
                ) : (
                  <div className="dish-modal__img-placeholder" aria-hidden="true"><Flame size={48} strokeWidth={1.5} /></div>
                )}
              </div>

              {/* Right detail panel */}
              <div className="dish-modal__detail-col">
                <div className="dish-modal__scroll">
                  <Dialog.Title unstyled className="dish-modal__name">{item.name}</Dialog.Title>
                  <p className="dish-modal__price">{formatPrice(item.basePriceCents)}</p>

                  {item.description && (
                    <Dialog.Description unstyled className="dish-modal__desc">{item.description}</Dialog.Description>
                  )}

                  {/* Spice meter */}
                  <SpiceMeter level={item.spiceLevel} />

                  {/* Badges */}
                  <Tooltip.Provider delay={150}>
                    <div className="dish-modal__badges">
                      {item.isVegan && <BadgeTip tip="Contains no animal products"><span className="badge badge--vegan"><Leaf size={12} aria-hidden="true" /> Vegan</span></BadgeTip>}
                      {!item.isVegan && item.isVegetarian && <BadgeTip tip="No meat, poultry, or fish"><span className="badge badge--veg"><span className="badge__dot badge__dot--veg" aria-hidden="true" /> Vegetarian</span></BadgeTip>}
                      {!isVeg && <BadgeTip tip="Contains meat, poultry, or fish"><span className="badge badge--nonveg"><span className="badge__dot badge__dot--nonveg" aria-hidden="true" /> Non-Veg</span></BadgeTip>}
                      {item.isGlutenFree && <BadgeTip tip="Gluten-free"><span className="badge badge--gf">GF</span></BadgeTip>}
                      {item.isHalal && <BadgeTip tip="Halal-certified"><span className="badge badge--halal">Halal</span></BadgeTip>}
                      {(item.tags ?? []).includes('popular') && <BadgeTip tip="A customer favourite"><span className="badge badge--popular"><Flame size={12} aria-hidden="true" /> Most Loved</span></BadgeTip>}
                      {(item.tags ?? []).includes('chefs-pick') && <BadgeTip tip="Recommended by our chef"><span className="badge badge--chefs-pick"><ChefHat size={12} aria-hidden="true" /> Chef's Pick</span></BadgeTip>}
                    </div>
                  </Tooltip.Provider>

                  {/* Served with */}
                  {item.servedWith && (
                    <p className="dish-modal__served-with">
                      <strong>Served with:</strong> {item.servedWith}
                    </p>
                  )}

                  {/* Allergens */}
                  {item.allergens?.length > 0 && (
                    <div className="dish-modal__allergens">
                      <span className="dish-modal__allergens-label"><AlertTriangle size={14} strokeWidth={2} aria-hidden="true" /> Contains:</span>
                      {item.allergens.map(a => (
                        <span key={a} className="dish-modal__allergen-chip">{a}</span>
                      ))}
                    </div>
                  )}

                  {/* Modifiers */}
                  {modifiers.length > 0 && (
                    <fieldset className="dish-modal__modifiers">
                      <legend className="dish-modal__modifiers-label">Customise:</legend>
                      <div className="dish-modal__modifier-list">
                        {modifiers.map(m => {
                          const checked = selectedModIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`dish-modal__modifier-option${checked ? ' dish-modal__modifier-option--selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                className="dish-modal__modifier-input"
                                checked={checked}
                                onChange={() => toggleModifier(m.id)}
                              />
                              <span className="dish-modal__modifier-name">{m.label}</span>
                              {m.priceDeltaCents !== 0 && (
                                <span className="dish-modal__modifier-price">
                                  {m.priceDeltaCents > 0 ? '+' : ''}{formatPrice(m.priceDeltaCents)}
                                </span>
                              )}
                              <span className="dish-modal__modifier-check" aria-hidden="true">✓</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  <ReviewGallery itemId={item.id} />

                  {/* Quantity */}
                  <div className="bundle-modal__qty-row">
                    <span className="bundle-modal__qty-label">Qty</span>
                    <div className="cart-item__qty" role="group" aria-label="Quantity">
                      <button
                        className="cart-item__qty-btn"
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        aria-label="Decrease quantity"
                        type="button"
                      >
                        −
                      </button>
                      <span className="cart-item__qty-value" aria-live="polite">{qty}</span>
                      <button
                        className="cart-item__qty-btn"
                        onClick={() => setQty(q => Math.min(10, q + 1))}
                        aria-label="Increase quantity"
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Add to Order */}
                  <button
                    ref={addBtnRef}
                    className="dish-modal__add-btn"
                    disabled={!item.inStock}
                    onClick={handleAdd}
                  >
                    {item.inStock
                      ? `${editingCartItemId ? 'Save Changes' : 'Add to Order'} · ${formatPrice(totalCents)}`
                      : 'Sold Out'}
                  </button>
                </div>
              </div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
