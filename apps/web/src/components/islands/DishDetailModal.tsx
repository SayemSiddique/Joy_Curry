import { useState, useEffect, useRef, useCallback } from 'react';
import type { MenuItem } from '@lib/api';
import { formatPrice } from '@lib/formatters';
import { addToCart } from '@stores/cart';
import { flyToCart } from '@lib/cartAnimation';
import ReviewGallery from './ReviewGallery';

function SpiceMeter({ level }: { level?: string }) {
  if (!level || level === 'Mild') return null;
  const lvl = level === 'Hot' ? 3 : level === 'Medium' ? 2 : 1;
  return (
    <span className="spice-meter" aria-label={`Spice level: ${level}`}>
      <span className="spice-meter__chilies">
        {[1, 2, 3].map(i => (
          <span key={i} className={`spice-meter__chili${i <= lvl ? ' spice-meter__chili--lit' : ''}`} aria-hidden="true">🌶</span>
        ))}
      </span>
      <span className="spice-meter__label">{level}</span>
    </span>
  );
}

export default function DishDetailModal() {
  const [item, setItem] = useState<MenuItem | null>(null);
  const [closing, setClosing] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((e: Event) => {
    const detail = (e as CustomEvent<MenuItem>).detail;
    setClosing(false);
    setItem(detail);
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setItem(null); setClosing(false); }, 300);
  }, []);

  useEffect(() => {
    window.addEventListener('dish:open', open);
    return () => window.removeEventListener('dish:open', open);
  }, [open]);

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

  const handleAdd = () => {
    addToCart({
      itemId: item.id,
      name: item.name,
      basePriceCents: item.basePriceCents,
      qty: 1,
      lineTotalCents: item.basePriceCents,
      itemType: 'regular',
    });
    if (addBtnRef.current) flyToCart(addBtnRef.current);
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
            <div className="dish-modal__img-placeholder">🍽️</div>
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
              {item.isVegan && <span className="badge badge--vegan">🌱 Vegan</span>}
              {!item.isVegan && item.isVegetarian && <span className="badge badge--veg">🟢 Vegetarian</span>}
              {!isVeg && <span className="badge badge--nonveg">🔴 Non-Veg</span>}
              {item.isGlutenFree && <span className="badge badge--gf">GF</span>}
              {item.isHalal && <span className="badge badge--halal">Halal</span>}
              {(item.tags ?? []).includes('popular') && <span className="badge badge--popular">🔥 Most Loved</span>}
              {(item.tags ?? []).includes('chefs-pick') && <span className="badge badge--chefs-pick">👨‍🍳 Chef's Pick</span>}
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
            {item.modifiers?.length > 0 && (
              <div className="dish-modal__modifiers">
                <span className="dish-modal__modifiers-label">Customise:</span>
                <div className="dish-modal__modifier-list">
                  {item.modifiers.map(m => (
                    <span key={m.id} className="dish-modal__modifier-chip">
                      {m.label}
                      {m.priceDeltaCents !== 0 && (
                        <span className="dish-modal__modifier-price">
                          {m.priceDeltaCents > 0 ? ' +' : ' '}{formatPrice(Math.abs(m.priceDeltaCents))}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <ReviewGallery itemId={item.id} />

            {/* Add to Order */}
            <button
              ref={addBtnRef}
              className="dish-modal__add-btn"
              disabled={!item.inStock}
              onClick={handleAdd}
            >
              {item.inStock ? `Add to Order · ${formatPrice(item.basePriceCents)}` : 'Sold Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
