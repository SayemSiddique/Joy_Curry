import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import {
  cartItems,
  cartCount,
  subtotalCents,
  taxCents,
  deliveryFeeCents,
  totalCents,
  cartOpen,
  checkoutOpen,
  orderType,
  deliveryRouting,
  addToCart,
  removeFromCart,
  updateQty,
  type CartItem,
} from '@stores/cart';
import { authState, rewardsState, loadRewards } from '@stores/auth';
import { rewardsApi, type RewardMilestone } from '@lib/api';
import { MIN_ORDER_CENTS, FREE_DELIVERY_THRESHOLD_CENTS } from '@lib/constants';
import { formatPrice } from '@lib/formatters';
import { showToast } from '@lib/toast';

// Workaround: useSyncExternalStore (used by @nanostores/react useStore) has a
// compatibility issue with React 19 + Astro SSR. Subscribe manually instead.
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

export default function CartDrawer() {
  const items = useNano(cartItems);
  const count = useNano(cartCount);
  const subtotal = useNano(subtotalCents);
  const tax = useNano(taxCents);
  const fee = useNano(deliveryFeeCents);
  const total = useNano(totalCents);
  const open = useNano(cartOpen);
  const oType = useNano(orderType);
  const routing = useNano(deliveryRouting);
  const auth = useNano(authState);
  const rewards = useNano(rewardsState);

  // ── Delivery nudges ─────────────────────────────────────────
  // For delivery orders, surface (in priority): the $10 minimum (validate.js),
  // then the in-house free-delivery threshold ($30), then — out of zone — a
  // courier-partner note (free delivery doesn't apply there).
  const isDelivery = oType !== 'pickup';
  const inHouse = !routing || routing.withinRadius; // unknown routing → in-house
  const minMet = subtotal >= MIN_ORDER_CENTS;
  const freeMet = subtotal >= FREE_DELIVERY_THRESHOLD_CENTS;
  const minPct = Math.min(100, Math.round((subtotal / MIN_ORDER_CENTS) * 100));
  const freePct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD_CENTS) * 100));
  const remainingToMin = Math.max(0, MIN_ORDER_CENTS - subtotal);
  const remainingToFree = Math.max(0, FREE_DELIVERY_THRESHOLD_CENTS - subtotal);

  // Refresh the vault balance whenever the drawer opens for a signed-in user
  useEffect(() => {
    if (open && auth.token) loadRewards();
  }, [open, auth.token]);

  // Points this order will earn ($1 spent = 100 pts on the grand total)
  const pointsPreview = Math.floor(total / 100) * 100;
  // Highest milestone the customer can redeem right now (if any)
  const topUnlocked: RewardMilestone | null =
    rewards && rewards.unlocked.length > 0 ? rewards.unlocked[rewards.unlocked.length - 1] : null;

  const handleRedeem = async (milestone: RewardMilestone) => {
    const token = authState.get().token;
    if (!token) return;
    try {
      const { reward } = await rewardsApi.redeem({ milestonePoints: milestone.points }, token);
      addToCart({
        itemId: reward.itemId,
        name: `🎁 ${reward.itemName} (Reward)`,
        basePriceCents: 0,
        qty: 1,
        lineTotalCents: 0,
        itemType: 'regular',
      });
      showToast(`Reward added: ${reward.itemName}`, 'success');
      loadRewards();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not redeem reward.', 'error');
    }
  };

  // Wire up the static Navbar cart button
  useEffect(() => {
    const btn = document.getElementById('navbar-cart-btn');
    const handler = () => cartOpen.set(true);
    btn?.addEventListener('click', handler);
    return () => btn?.removeEventListener('click', handler);
  }, []);

  // Wire up menu card "Add to Order" buttons via event delegation
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.menu-card__add-btn') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;

      const itemId = btn.dataset.itemId ?? '';
      const name = btn.dataset.itemName ?? '';
      const priceCents = parseInt(btn.dataset.priceCents ?? '0', 10);
      if (!itemId || !name) return;

      addToCart({
        itemId,
        name,
        basePriceCents: priceCents,
        qty: 1,
        lineTotalCents: priceCents,
        itemType: 'regular',
      });
      cartOpen.set(true);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Keep the Navbar cart count badge in sync
  useEffect(() => {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }, [count]);

  const handleClose = () => cartOpen.set(false);
  const handleCheckout = () => {
    cartOpen.set(false);
    checkoutOpen.set(true);
  };

  return (
    <>
      {/* Persistent mobile cart bar — always one tap from the drawer.
          Mobile-only (CSS), hidden while the drawer itself is open. */}
      {count > 0 && !open && (
        <button
          type="button"
          className="cart-bar"
          onClick={() => cartOpen.set(true)}
          aria-label={`View cart — ${count} ${count === 1 ? 'item' : 'items'}, subtotal ${formatPrice(subtotal)}`}
        >
          <span className="cart-bar__left">
            <span className="cart-bar__icon" aria-hidden="true">🛒</span>
            <span className="cart-bar__count">{count > 99 ? '99+' : count}</span>
            <span className="cart-bar__text">View Order</span>
          </span>
          <span className="cart-bar__right" aria-hidden="true">
            {formatPrice(subtotal)} <span className="cart-bar__chev">→</span>
          </span>
        </button>
      )}

      {/* Backdrop */}
      <div
        className={`cart-overlay${open ? ' cart-overlay--visible' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`cart-drawer${open ? ' cart-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your order"
      >
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">Your Order</h2>
          <button
            className="cart-drawer__close"
            onClick={handleClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-drawer__items">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <span className="cart-drawer__empty-icon" aria-hidden="true">🛒</span>
              <p style={{ fontWeight: 700 }}>Your cart is empty</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Add something delicious from the menu!
              </p>
            </div>
          ) : (
            items.map((item: CartItem) => (
              <div key={item.cartItemId} className="cart-item">
                <div className="cart-item__top">
                  <div>
                    <div className="cart-item__name">{item.name}</div>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="cart-item__sub">
                        {item.selectedOptions.map((o) => o.label).join(', ')}
                      </div>
                    )}
                    {item.slotChoices && Object.keys(item.slotChoices).length > 0 && (
                      <div className="cart-item__sub">
                        {Object.values(item.slotChoices).flat().join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    className="cart-item__remove"
                    onClick={() => removeFromCart(item.cartItemId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </div>

                <div className="cart-item__bottom">
                  <div
                    className="cart-item__qty"
                    role="group"
                    aria-label={`Quantity for ${item.name}`}
                  >
                    <button
                      className="cart-item__qty-btn"
                      onClick={() => updateQty(item.cartItemId, item.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="cart-item__qty-value" aria-live="polite">
                      {item.qty}
                    </span>
                    <button
                      className="cart-item__qty-btn"
                      onClick={() => updateQty(item.cartItemId, item.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="cart-item__price">{formatPrice(item.lineTotalCents)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 ? (
          <div className="cart-drawer__footer">
            {isDelivery && !minMet && (
              <div className="cart-nudge">
                <p className="cart-nudge__label" role="status" aria-live="polite">
                  Add <strong>{formatPrice(remainingToMin)}</strong> more to meet the{' '}
                  {formatPrice(MIN_ORDER_CENTS)} delivery minimum
                </p>
                <div
                  className="cart-nudge__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={MIN_ORDER_CENTS}
                  aria-valuenow={Math.min(subtotal, MIN_ORDER_CENTS)}
                  aria-label="Progress toward delivery minimum"
                >
                  <div className="cart-nudge__fill" style={{ width: `${minPct}%` }} />
                </div>
              </div>
            )}

            {isDelivery && minMet && inHouse && (
              <div className={`cart-nudge${freeMet ? ' cart-nudge--met' : ''}`}>
                <p className="cart-nudge__label" role="status" aria-live="polite">
                  {freeMet ? (
                    <>🎉 You’ve unlocked <strong>free delivery</strong>!</>
                  ) : (
                    <>
                      Add <strong>{formatPrice(remainingToFree)}</strong> more for{' '}
                      <strong>FREE delivery</strong>
                    </>
                  )}
                </p>
                <div
                  className="cart-nudge__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={FREE_DELIVERY_THRESHOLD_CENTS}
                  aria-valuenow={Math.min(subtotal, FREE_DELIVERY_THRESHOLD_CENTS)}
                  aria-label="Progress toward free delivery"
                >
                  <div className="cart-nudge__fill" style={{ width: `${freePct}%` }} />
                </div>
              </div>
            )}

            {isDelivery && minMet && !inHouse && (
              <div className="cart-nudge cart-nudge--courier">
                <p className="cart-nudge__label" role="status" aria-live="polite">
                  🛵 You’re {routing!.distanceMiles.toFixed(1)} mi away — delivered by our courier
                  partner{routing!.quoteCents > 0 ? <> · {formatPrice(routing!.quoteCents)} delivery</> : null}
                </p>
              </div>
            )}
            {auth.user && rewards && (
              <div className="cart-vault">
                <div className="cart-vault__header">
                  <span className="cart-vault__title">✦ Artisan Vault</span>
                  <span className="cart-vault__balance">{rewards.balance.toLocaleString()} pts</span>
                </div>
                {rewards.nextMilestone ? (
                  <>
                    <div
                      className="vault-progress__bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(rewards.progressPct)}
                      aria-label={`${rewards.pointsToNext.toLocaleString()} points to ${rewards.nextMilestone.label}`}
                    >
                      <div
                        className="vault-progress__fill"
                        style={{ width: `${rewards.progressPct}%` }}
                      />
                    </div>
                    <p className="cart-vault__next">
                      {rewards.pointsToNext.toLocaleString()} pts to{' '}
                      <strong>{rewards.nextMilestone.label}</strong>
                    </p>
                  </>
                ) : (
                  <p className="cart-vault__next">All rewards unlocked — redeem below!</p>
                )}
                <p className="cart-vault__preview">+{pointsPreview.toLocaleString()} pts with this order</p>
                {topUnlocked && (
                  <button
                    className="cart-vault__redeem"
                    onClick={() => handleRedeem(topUnlocked)}
                    type="button"
                  >
                    Redeem: {topUnlocked.label}
                  </button>
                )}
              </div>
            )}
            <div className="cart-drawer__totals">
              <div className="cart-drawer__total-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-drawer__total-row">
                <span>Tax (8.75%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="cart-drawer__total-row">
                <span>Delivery fee</span>
                <span>{fee === 0 ? 'Free' : formatPrice(fee)}</span>
              </div>
              <div className="cart-drawer__total-row cart-drawer__total-row--grand">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            <button
              className="cart-drawer__checkout-btn"
              onClick={handleCheckout}
              aria-label="Proceed to checkout"
            >
              Proceed to Checkout →
            </button>
          </div>
        ) : (
          <div className="cart-drawer__footer">
            <button
              className="cart-drawer__checkout-btn"
              disabled
              aria-label="Cart is empty"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
