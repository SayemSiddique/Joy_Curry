/**
 * Fly-to-cart micro-animation (P1-B).
 * A small dot springs from the clicked card button to the navbar cart icon,
 * then the cart jiggles and the badge pops. Pure DOM animation — no deps.
 */
export function flyToCart(sourceEl: HTMLElement): void {
  const cartBtn = document.getElementById('navbar-cart-btn');
  if (!cartBtn) return;

  const src = sourceEl.getBoundingClientRect();
  const tgt = cartBtn.getBoundingClientRect();

  const dot = document.createElement('div');
  dot.className = 'cart-fly-dot';
  dot.style.left = `${src.left + src.width / 2 - 7}px`;
  dot.style.top  = `${src.top  + src.height / 2 - 7}px`;
  document.body.appendChild(dot);

  const dx = tgt.left + tgt.width  / 2 - (src.left + src.width  / 2);
  const dy = tgt.top  + tgt.height / 2 - (src.top  + src.height / 2);

  // Arc via a midpoint keyframe above the straight line
  const anim = dot.animate(
    [
      { transform: 'translate(0,0) scale(1)',           opacity: 1  },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) scale(0.85)`, opacity: 0.9, offset: 0.45 },
      { transform: `translate(${dx}px,${dy}px) scale(0.3)`, opacity: 0  },
    ],
    { duration: 520, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' }
  );

  anim.onfinish = () => {
    dot.remove();
    // Jiggle the cart button
    cartBtn.classList.add('cart-added');
    cartBtn.addEventListener('animationend', () => cartBtn.classList.remove('cart-added'), { once: true });

    // Pop the badge
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.classList.add('badge-pop');
      badge.addEventListener('animationend', () => badge.classList.remove('badge-pop'), { once: true });
    }
  };
}
