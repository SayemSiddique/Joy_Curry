import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@joy-curry/ui';
import { ShoppingCart, CheckCircle2, Flame, Truck, Gift, Users, Sparkles, Trash2, Plus, Minus, X } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  cartItems,
  subtotalCents,
  taxCents,
  deliveryFeeCents,
  totalCents,
  cartOpen,
  orderType,
  deliveryRouting,
  scheduledFor,
  addToCart,
  updateQty,
  type CartItem,
} from '@lib/core';
import { authState, rewardsState, loadRewards } from '@lib/core';
import { rewardsApi, type RewardMilestone } from '@lib/core';
import { menuApi } from '@lib/core';
import { MIN_ORDER_CENTS, FREE_DELIVERY_THRESHOLD_CENTS } from '@lib/core';
import { formatPrice, formatSlotTime } from '@lib/core';
import { showToast } from '@lib/toast';
import { flyToCart } from '@lib/cartAnimation';
import { startGroupOrder, mergeGroupItems, getGroupSession, listenGroupUpdates } from '@lib/groupOrder';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

// P5-C: CSS confetti burst — renders N coloured dots that animate outward
function Confetti({ active }: { active: boolean }) {
  const colours = ['#D4AF37', '#874535', '#541C0D', '#F5EBDC', '#B87333'];
  if (!active) return null;
  return (
    <div className="confetti-burst" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="confetti-dot"
          style={{
            '--angle': `${(i / 12) * 360}deg`,
            '--color': colours[i % colours.length],
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function CartDrawer() {
  const items = useNano(cartItems);
  const subtotal = useNano(subtotalCents);
  const tax = useNano(taxCents);
  const fee = useNano(deliveryFeeCents);
  const total = useNano(totalCents);
  const open = useNano(cartOpen);
  const oType = useNano(orderType);
  const routing = useNano(deliveryRouting);
  const auth = useNano(authState);
  const rewards = useNano(rewardsState);
  const scheduled = useNano(scheduledFor);

  // ── P5-B: group order state ──────────────────────────────────
  const [groupUuid, setGroupUuid] = useState<string | null>(null);
  const [groupParticipantCount, setGroupParticipantCount] = useState(0);
  const [groupShareUrl, setGroupShareUrl] = useState<string | null>(null);
  const [groupCopied, setGroupCopied] = useState(false);

  // ── P5-C: confetti on milestone unlock ───────────────────────
  const [showConfetti, setShowConfetti] = useState(false);
  const prevProjectedPts = useRef<number>(0);

  // Total units in the cart — shown in the header so the drawer reads as a summary
  const itemCount = items.reduce((n: number, i: CartItem) => n + i.qty, 0);

  // ── Delivery nudges ─────────────────────────────────────────
  const isDelivery = oType !== 'pickup';
  const inHouse = !routing || routing.withinRadius;
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

  // Lock the page behind the drawer so scrolling stays inside the item list,
  // Scroll-lock, Escape-to-close, focus trap, and focus return are all handled
  // by Base UI's Dialog (see the render below) now that the drawer is a
  // Dialog-as-right-sheet — replacing the manual body-overflow + keydown effect.

  // Points this order will earn ($1 spent = 100 pts on the grand total)
  const pointsPreview = Math.floor(total / 100) * 100;
  // Highest milestone the customer can redeem right now (if any)
  const topUnlocked: RewardMilestone | null =
    rewards && rewards.unlocked.length > 0 ? rewards.unlocked[rewards.unlocked.length - 1] : null;

  // P5-C: detect when projected balance crosses a milestone threshold → confetti
  useEffect(() => {
    if (!rewards) return;
    const projected = rewards.balance + pointsPreview;
    const prev = prevProjectedPts.current;
    const milestones = rewards.milestones ?? [];
    const crossed = milestones.some(m => prev < m.points && projected >= m.points);
    if (crossed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    prevProjectedPts.current = projected;
  }, [pointsPreview, rewards]);

  // P5-B: listen for group updates if host
  useEffect(() => {
    if (!groupUuid) return;
    return listenGroupUpdates(groupUuid, (session) => {
      setGroupParticipantCount(session.participants.length);
    });
  }, [groupUuid]);

  const handleRedeem = async (milestone: RewardMilestone) => {
    const token = authState.get().token;
    if (!token) return;
    try {
      const { reward } = await rewardsApi.redeem({ milestonePoints: milestone.points }, token);
      addToCart({
        itemId: reward.itemId,
        name: `${reward.itemName} (Reward)`,
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

  // P5-B: start group order
  const handleStartGroupOrder = () => {
    const uuid = crypto.randomUUID();
    const hostName = auth.user?.name ?? 'Host';
    const url = startGroupOrder(uuid, hostName, items);
    setGroupUuid(uuid);
    setGroupShareUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
    setGroupCopied(true);
    setTimeout(() => setGroupCopied(false), 3000);
    showToast('Group order link copied! Share it with your group.', 'success');
  };

  // P5-B: merge all participant items into cart
  const handleMergeGroup = () => {
    if (!groupUuid) return;
    const session = getGroupSession(groupUuid);
    if (!session) return;
    const extra = mergeGroupItems(groupUuid).filter(
      i => !session.hostItems.some(h => h.itemId === i.itemId),
    );
    for (const item of extra) {
      addToCart({ ...item });
    }
    showToast(`Merged ${extra.length} item(s) from the group into your cart.`, 'success');
    setGroupUuid(null);
    setGroupShareUrl(null);
  };

  // Wire up menu card "Add to Order" buttons via event delegation
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.menu-card__add-btn') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;

      const itemId = btn.dataset.itemId ?? '';
      const name = btn.dataset.itemName ?? '';
      const priceCents = parseInt(btn.dataset.priceCents ?? '0', 10);
      if (!itemId || !name) return;

      let imageUrl: string | undefined;
      const card = btn.closest('[data-item-json]') as HTMLElement | null;
      if (card?.dataset.itemJson) {
        try { imageUrl = JSON.parse(card.dataset.itemJson).imageUrl; } catch {}
      }

      flyToCart(btn);
      addToCart({
        itemId,
        name,
        basePriceCents: priceCents,
        qty: 1,
        lineTotalCents: priceCents,
        imageUrl,
        itemType: 'regular',
      });
      showToast('Added to your order', 'success');
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleClose = () => cartOpen.set(false);
  const handleCheckout = () => {
    cartOpen.set(false);
    window.location.href = '/cart';
  };

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const handleEditItem = async (item: CartItem) => {
    if (item.itemType === 'bundle') {
      cartOpen.set(false);
      window.dispatchEvent(new CustomEvent('bundle:edit', {
        detail: {
          itemId: item.itemId,
          itemName: item.name,
          basePriceCents: item.basePriceCents,
          imageUrl: item.imageUrl,
          cartItemId: item.cartItemId,
          qty: item.qty,
          slotSelectionIds: item.slotSelectionIds,
        },
      }));
      return;
    }

    setEditingItemId(item.cartItemId);
    try {
      const { data } = await menuApi.getById(item.itemId);
      cartOpen.set(false);
      window.dispatchEvent(new CustomEvent('dish:edit', {
        detail: {
          item: data,
          cartItemId: item.cartItemId,
          qty: item.qty,
          modIds: (item.selectedOptions ?? []).map((o) => o.id),
        },
      }));
    } catch {
      showToast('This item is no longer available to edit.', 'error');
    } finally {
      setEditingItemId(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) cartOpen.set(false); }}>
      <Dialog.Portal>
        {/* Backdrop = dim + fade; Base UI closes on backdrop press. */}
        <Dialog.Backdrop unstyled className="cart-overlay cart-overlay--bui" />

        {/* Right-side sheet (bottom sheet on mobile). The .cart-drawer CSS
            positions it; Base UI supplies role=dialog, focus trap, ESC,
            scroll-lock, and aria-labelledby (via Dialog.Title). */}
        <Dialog.Popup
          unstyled
          className="cart-drawer cart-drawer--open"
        >
        <div className="cart-drawer__header">
          <div className="cart-drawer__heading">
            <Dialog.Title unstyled className="cart-drawer__title">Your Order</Dialog.Title>
            {itemCount > 0 && (
              <span className="cart-drawer__count" aria-live="polite">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
            {/* P5-D: scheduled time badge */}
            {scheduled && (
              <p className="cart-drawer__scheduled" aria-live="polite">
                ⏰ Scheduled for {formatSlotTime(scheduled)}
              </p>
            )}
          </div>
          <Dialog.Close
            unstyled
            className="cart-drawer__close"
            aria-label="Close cart"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </Dialog.Close>
        </div>

        <div className="cart-drawer__items">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <ShoppingCart size={48} className="cart-drawer__empty-icon" aria-hidden="true" />
              <p style={{ fontWeight: 700 }}>Your cart is empty</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Add something delicious from the menu!
              </p>
            </div>
          ) : (
            items.map((item: CartItem) => {
              const editable = item.itemType === 'bundle' || item.selectedOptions !== undefined;
              return (
              <div key={item.cartItemId} className="cart-item">
                <div className="cart-item__top">
                  {item.imageUrl ? (
                    <img className="cart-item__thumb" src={item.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="cart-item__thumb cart-item__thumb--fallback" aria-hidden="true">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div className="cart-item__info">
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
                    {editable && (
                      <button
                        type="button"
                        className="cart-item__edit"
                        onClick={() => handleEditItem(item)}
                        disabled={editingItemId === item.cartItemId}
                        aria-label={`Edit ${item.name}`}
                      >
                        {editingItemId === item.cartItemId ? 'Loading…' : 'Edit'}
                      </button>
                    )}
                  </div>
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
                      aria-label={item.qty <= 1 ? `Remove ${item.name}` : 'Decrease quantity'}
                    >
                      {item.qty <= 1
                        ? <Trash2 size={14} aria-hidden="true" />
                        : <Minus size={14} aria-hidden="true" />}
                    </button>
                    <span className="cart-item__qty-value" aria-live="polite">
                      {item.qty}
                    </span>
                    <button
                      className="cart-item__qty-btn"
                      onClick={() => updateQty(item.cartItemId, item.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <span className="cart-item__price">{formatPrice(item.lineTotalCents)}</span>
                </div>
              </div>
              );
            })
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
                    <><CheckCircle2 size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> You've unlocked <strong>free delivery</strong>!</>
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
                  <Truck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> You're {routing!.distanceMiles.toFixed(1)} mi away — delivered by our courier
                  partner{routing!.quoteCents > 0 ? <> · {formatPrice(routing!.quoteCents)} delivery</> : null}
                </p>
              </div>
            )}

            {/* P5-C: Vault progress + confetti */}
            {auth.user && rewards && (
              <div className="cart-vault" style={{ position: 'relative' }}>
                <Confetti active={showConfetti} />
                <div className="cart-vault__header">
                  <span className="cart-vault__title cart-vault__title--icon"><Sparkles size={15} strokeWidth={2} aria-hidden="true" /> Artisan Vault</span>
                  <span className="cart-vault__balance">{rewards.balance.toLocaleString()} pts</span>
                </div>
                {auth.user.birthday && auth.user.birthday === (() => {
                  const d = new Date();
                  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })() && (
                  <div className="cart-vault__birthday">
                    <Gift size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> It's your birthday! Free dish unlocked
                  </div>
                )}
                {(rewards.streak ?? 0) >= 1 && (
                  <div className={`cart-vault__streak${(rewards.streak ?? 0) >= 2 ? ' cart-vault__streak--animated' : ''}`}>
                    <Flame size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 3 }} /> {rewards.streak}-week streak
                  </div>
                )}
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

            {/* P5-B: Group order controls */}
            {!groupUuid ? (
              <button
                type="button"
                className="cart-group-btn cart-group-btn--compact"
                onClick={handleStartGroupOrder}
                aria-label="Start a group order and share a link"
              >
                <Users size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} /> Start Group Order
              </button>
            ) : (
              <div className="cart-group-active">
                <p className="cart-group-active__label">
                  Group link {groupCopied ? '✓ Copied!' : 'ready'}
                  {groupParticipantCount > 0 && (
                    <span className="cart-group-active__count">
                      {' '}· {groupParticipantCount} person{groupParticipantCount !== 1 ? 's' : ''} added items
                    </span>
                  )}
                </p>
                {groupShareUrl && (
                  <button
                    type="button"
                    className="cart-group-active__copy"
                    onClick={() => {
                      navigator.clipboard.writeText(groupShareUrl).catch(() => {});
                      setGroupCopied(true);
                      setTimeout(() => setGroupCopied(false), 3000);
                    }}
                  >
                    Copy Link
                  </button>
                )}
                {groupParticipantCount > 0 && (
                  <button
                    type="button"
                    className="cart-group-active__merge"
                    onClick={handleMergeGroup}
                  >
                    Merge All Items →
                  </button>
                )}
              </div>
            )}

            <button
              className="cart-drawer__checkout-btn"
              onClick={handleCheckout}
              aria-label={`Proceed to checkout, total ${formatPrice(total)}`}
            >
              <span>Proceed to Checkout</span>
              <span className="cart-drawer__checkout-total">{formatPrice(total)}</span>
            </button>

            <button
              type="button"
              className="cart-drawer__keep-shopping"
              onClick={handleClose}
            >
              Keep shopping
            </button>
          </div>
        ) : (
          <div className="cart-drawer__footer">
            <button
              className="cart-drawer__checkout-btn"
              onClick={handleClose}
            >
              Browse the Menu
            </button>
          </div>
        )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
