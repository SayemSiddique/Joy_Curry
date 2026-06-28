import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import { addToCart } from '@stores/cart';
import { flyToCart } from '@lib/cartAnimation';
import { formatPrice } from '@lib/formatters';
import { API_BASE_URL } from '@lib/constants';
import { useRef } from 'react';

interface Special {
  itemId: string;
  name: string;
  description: string;
  imageUrl?: string;
  validUntil: string;
  discountPct: number;
}

export default function SpecialsBanner() {
  const [special, setSpecial] = useState<Special | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/specials`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { special: Special }) => {
        const key = `specials-dismissed-${data.special.itemId}`;
        if (sessionStorage.getItem(key)) return;
        setSpecial(data.special);
      })
      .catch(() => {});
  }, []);

  if (!special || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(`specials-dismissed-${special.itemId}`, '1');
    setDismissed(true);
  };

  const handleAdd = () => {
    addToCart({
      itemId: special.itemId,
      name: special.name,
      basePriceCents: 0,
      qty: 1,
      lineTotalCents: 0,
      itemType: 'regular',
    });
    if (addBtnRef.current) flyToCart(addBtnRef.current);
    handleDismiss();
  };

  return (
    <div className="specials-banner" role="complementary" aria-label="This week's special">
      {special.imageUrl && (
        <img className="specials-banner__img" src={special.imageUrl} alt={special.name} loading="lazy" />
      )}
      <div className="specials-banner__body">
        <span className="specials-banner__eyebrow">This Week's Special</span>
        <strong className="specials-banner__name">{special.name}</strong>
        {special.description && (
          <p className="specials-banner__desc">{special.description}</p>
        )}
        <span className="specials-banner__discount">{special.discountPct}% OFF</span>
      </div>
      <div className="specials-banner__actions">
        <button ref={addBtnRef} className="specials-banner__add" onClick={handleAdd} type="button">
          Add to Order
        </button>
        <button className="specials-banner__dismiss" onClick={handleDismiss} aria-label="Dismiss special" type="button">
          ✕
        </button>
      </div>
    </div>
  );
}
