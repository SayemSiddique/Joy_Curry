import { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, Leaf, ChefHat } from 'lucide-react';
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

function SpiceMeter({ level }: { level?: string }) {
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

export default function DishDetailModal() {
  const [item, setItem] = useState<MenuItem | null>(null);
  const [closing, setClosing] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((e: Event) => {
    const detail = (e as CustomEvent<MenuItem>).detail;
    setClosing(false);
    setItem(detail);
    setQty(1);
    setSelectedModIds([]);
    setEditingCartItemId(null);
  }, []);

  const openEdit = useCallback((e: Event) => {
    const detail = (e as CustomEvent<DishEditDetail>).detail;
    setClosing(false);
    setItem(detail.item);
    setQty(detail.qty);
    setSelectedModIds(detail.modIds);
    setEditingCartItemId(detail.cartItemId);
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    const wasEditing = editingCartItemId !== null;
    setTimeout(() => {
      setItem(null);
      setClosing(false);
      setEditingCartItemId(null);
      if (wasEditing) cartOpen.set(true);
    }, 300);
  }, [editingCartItemId]);

  useEffect(() => {
    window.addEventListener('dish:open', open);
    window.addEventListener('dish:edit', openEdit);
    return () => {
      window.removeEventListener('dish:open', open);
      window.removeEventListener('dish:edit', openEdit);
    };
  }, [open, openEdit]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, close]);

  if (!item) return null;

  const modifiers = item.modifiers ?? [];
  const selectedMods = modifiers.filter((m) => selectedModIds.includes(m.id));
  const unitPriceCents = item.basePriceCents + selectedMods.reduce((sum, m) => sum + m.priceDeltaCents, 0);
  const totalCents = unitPriceCents * qty;

  const toggleModifier = (id: string) => {
    setSelectedModIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleAdd = () => {
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
      close();
      return;
    }

    addToCart(payload);
    if (addBtnRef.current) flyToCart(addBtnRef.current);
    showToast('Added to your order', 'success');
    close();
  };

  const isVeg = item.isVegan || item.isVegetarian;

  return (
    <div
      className={`dish-modal-overlay${closing ? ' dish-modal-overlay--closing' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div className={`dish-modal${closing ? ' dish-modal--closing' : ''}`}>
        {/* Close button */}
        <button className="dish-modal__close" onClick={close} aria-label="Close dish detail">✕</button>

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
            <h2 className="dish-modal__name">{item.name}</h2>
            <p className="dish-modal__price">{formatPrice(item.basePriceCents)}</p>

            {item.description && (
              <p className="dish-modal__desc">{item.description}</p>
            )}

            {/* Spice meter */}
            <SpiceMeter level={item.spiceLevel} />

            {/* Badges */}
            <div className="dish-modal__badges">
              {item.isVegan && <span className="badge badge--vegan"><Leaf size={12} aria-hidden="true" /> Vegan</span>}
              {!item.isVegan && item.isVegetarian && <span className="badge badge--veg"><span className="badge__dot badge__dot--veg" aria-hidden="true" /> Vegetarian</span>}
              {!isVeg && <span className="badge badge--nonveg"><span className="badge__dot badge__dot--nonveg" aria-hidden="true" /> Non-Veg</span>}
              {item.isGlutenFree && <span className="badge badge--gf">GF</span>}
              {item.isHalal && <span className="badge badge--halal">Halal</span>}
              {(item.tags ?? []).includes('popular') && <span className="badge badge--popular"><Flame size={12} aria-hidden="true" /> Most Loved</span>}
              {(item.tags ?? []).includes('chefs-pick') && <span className="badge badge--chefs-pick"><ChefHat size={12} aria-hidden="true" /> Chef's Pick</span>}
            </div>

            {/* Served with */}
            {item.servedWith && (
              <p className="dish-modal__served-with">
                <strong>Served with:</strong> {item.servedWith}
              </p>
            )}

            {/* Allergens */}
            {item.allergens?.length > 0 && (
              <div className="dish-modal__allergens">
                <span className="dish-modal__allergens-label">⚠ Contains:</span>
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
      </div>
    </div>
  );
}
