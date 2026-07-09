import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, MessageCircle, Gift, Copy, Share2, Lock,
  ShoppingBag, Truck, MapPin, Tag, ChevronDown, X, Plus, Minus, DoorOpen,
} from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  cartItems, subtotalCents, taxCents, deliveryFeeCents, totalCents,
  orderType, deliveryAddress, orderGateOpen, scheduledFor,
  clearCart, updateCartItem, type CartItem,
} from '@lib/core';
import { authState } from '@lib/core';
import {
  ordersApi, slotsApi, paymentsApi, rewardsApi, menuApi,
  type Order, type Slot, type MenuItem,
  type RewardsSummary, type RewardMilestone, type RewardLine,
} from '@lib/core';
import { MIN_ORDER_CENTS, formatPrice, formatSlotTime } from '@lib/core';
import { showToast } from '@lib/toast';
import { getStripe, isStripeEnabled } from '@lib/stripe';
import PaymentRequestButton from '@components/islands/PaymentRequestButton';
import type { PaymentRequestPaymentMethodEvent, StripeElements } from '@stripe/stripe-js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function nyDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

function formatSlot(slotTime: string): string {
  const t = slotTime.split('T')[1] ?? '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELIVERY_MIN_CENTS = MIN_ORDER_CENTS;

type Step = 'cart' | 'details' | 'payment' | 'confirmed';
type DeliveryType = 'delivery' | 'pickup';

interface Form {
  name: string; phone: string; email: string;
  address: string; apt: string; specialInstructions: string; dropOffInstructions: string;
}
interface Errors { name?: string; phone?: string; email?: string; address?: string; }
const EMPTY_FORM: Form = { name: '', phone: '', email: '', address: '', apt: '', specialInstructions: '', dropOffInstructions: '' };

// ── Suggestion config ─────────────────────────────────────────────────────────

interface SuggestionGroup {
  key: string;
  headline: string;
  subline: string;
  categories: string[];
  items: MenuItem[];
}

function buildSuggestions(allMenu: MenuItem[], cartCategorySet: Set<string>): SuggestionGroup[] {
  const inStock = allMenu.filter((m) => m.inStock && m.isActive);
  const pick = (cats: string[], limit = 4) =>
    inStock.filter((m) => cats.includes(m.category)).slice(0, limit);

  const groups: Omit<SuggestionGroup, 'items'>[] = [
    { key: 'beverages', headline: 'Fill your thirst', subline: 'Drinks that go perfectly with your order', categories: ['beverage', 'beverages'] },
    { key: 'starters', headline: 'Goes well with your order', subline: 'Popular starters our customers love', categories: ['appetizer', 'appetizers'] },
    { key: 'sides', headline: 'Complete your meal', subline: 'Rice, bread & sides to round it out', categories: ['bread', 'breads', 'rice-biryani', 'sides'] },
    { key: 'desserts', headline: 'Finish on a sweet note', subline: 'Save room for something sweet', categories: ['dessert', 'desserts'] },
  ];

  const result: SuggestionGroup[] = [];
  for (const g of groups) {
    const alreadyHas = g.categories.some((c) => cartCategorySet.has(c));
    if (alreadyHas) continue;
    const items = pick(g.categories);
    if (items.length === 0) continue;
    result.push({ ...g, items });
    if (result.length >= 2) break; // at most 2 groups at a time
  }

  // Fallback: if all categories covered, show popular chicken items
  if (result.length === 0) {
    const popular = inStock.filter((m) => m.category === 'chicken-entree').slice(0, 4);
    if (popular.length > 0) {
      result.push({ key: 'popular', headline: 'Our customers love these', subline: 'Top picks from our kitchen', categories: ['chicken-entree'], items: popular });
    }
  }

  return result;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CartPage() {
  const items       = useNano(cartItems);
  const subtotal    = useNano(subtotalCents);
  const tax         = useNano(taxCents);
  const fee         = useNano(deliveryFeeCents);
  const total       = useNano(totalCents);
  const auth        = useNano(authState);
  const chosenType  = useNano(orderType);
  const savedAddress = useNano(deliveryAddress);
  const deliveryType: DeliveryType = chosenType ?? 'pickup';

  const [step, setStep] = useState<Step>('cart');
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Stripe
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payElementReady, setPayElementReady] = useState(false);
  const elementsRef = useRef<StripeElements | null>(null);
  const payElRef = useRef<HTMLDivElement>(null);

  // Scheduling
  const [whenMode, setWhenMode] = useState<'asap' | 'later'>('asap');
  const [slotDate, setSlotDate] = useState<string>(nyDateStr(0));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Rewards
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummary | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<RewardMilestone | null>(null);
  const [appliedReward, setAppliedReward] = useState<RewardLine | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  // Promo
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  // Suggestions
  const [allMenu, setAllMenu] = useState<MenuItem[]>([]);
  const [dismissedGroups, setDismissedGroups] = useState<Set<string>>(new Set());

  // Referral
  const [referralCopied, setReferralCopied] = useState(false);

  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const topRef = useRef<HTMLDivElement>(null);

  // ── Fetch menu for suggestions ──
  useEffect(() => {
    menuApi.getAll().then((res) => setAllMenu(res.data)).catch(() => {});
  }, []);

  // ── Fetch rewards on mount if logged in ──
  useEffect(() => {
    if (!auth.token) return;
    rewardsApi.getMine(auth.token).then((res) => setRewardsSummary(res.rewards)).catch(() => {});
  }, [auth.token]);

  // ── Pre-fill form from auth + saved address ──
  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: f.name || (auth.user?.name ?? ''),
      email: f.email || (auth.user?.email ?? ''),
      address: f.address || savedAddress,
    }));
  }, [auth.user, savedAddress]);

  // ── Fetch slots when scheduling ──
  useEffect(() => {
    if (step !== 'details' || whenMode !== 'later') return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    slotsApi.getSlots(slotDate)
      .then((res) => { if (!cancelled) setSlots(res.slots); })
      .catch((err) => { if (!cancelled) setSlotsError(err instanceof Error ? err.message : 'Could not load times.'); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [step, whenMode, slotDate]);

  // ── Sync slot to store ──
  useEffect(() => {
    scheduledFor.set(whenMode === 'later' ? selectedSlot : null);
  }, [whenMode, selectedSlot]);

  // ── Mount Stripe element when on payment step ──
  useEffect(() => {
    if (step !== 'payment' || !clientSecret) return;
    let cancelled = false;
    setPayElementReady(false);
    (async () => {
      const stripe = await getStripe();
      if (!stripe || cancelled || !payElRef.current) return;
      const elements = stripe.elements({
        clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#541C0D' } },
      });
      elementsRef.current = elements;
      const payEl = elements.create('payment');
      payEl.mount(payElRef.current);
      payEl.on('ready', () => { if (!cancelled) setPayElementReady(true); });
    })();
    return () => { cancelled = true; elementsRef.current = null; };
  }, [step, clientSecret]);

  // ── Scroll to top on step change ──
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  // ── Computed ──
  const cartCategorySet = new Set(
    items.flatMap((item) => {
      const found = allMenu.find((m) => m.id === item.itemId);
      return found ? [found.category] : [];
    })
  );
  const suggestionGroups = buildSuggestions(allMenu, cartCategorySet)
    .filter((g) => !dismissedGroups.has(g.key));

  // ── Validation ──
  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.phone.trim() || !PHONE_RE.test(form.phone.trim())) e.phone = 'Please enter a valid phone number.';
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    if (deliveryType === 'delivery' && !form.address.trim()) e.address = 'Delivery address is required.';
    return e;
  };

  // ── Build order items array ──
  const buildOrderItems = () => [
    ...items.map((item: CartItem) => ({
      itemId: item.itemId, itemName: item.name, itemType: item.itemType,
      basePriceCents: item.basePriceCents, qty: item.qty,
      selectedOptions: item.selectedOptions ?? [], slotChoices: item.slotChoices ?? {},
    })),
    ...(appliedReward ? [{
      itemId: appliedReward.itemId, itemName: appliedReward.itemName,
      itemType: appliedReward.itemType, basePriceCents: 0, qty: 1,
      selectedOptions: [], slotChoices: {},
    }] : []),
  ];

  // ── Finish order (shared) ──
  const finishOrder = (order: Order) => {
    setConfirmedOrder(order);
    clearCart();
    idempotencyKey.current = crypto.randomUUID();
    setPendingOrder(null);
    setClientSecret(null);
    setPaying(false);
    setStep('confirmed');
    window.dispatchEvent(new CustomEvent('order:confirmed', { detail: order }));
  };

  // ── Submit details → payment ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) {
      showToast('Please sign in to complete your order — your cart is saved.', 'info');
      window.location.href = '/signin?next=/cart';
      return;
    }
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (deliveryType === 'delivery' && subtotal < DELIVERY_MIN_CENTS) {
      setGlobalError(`Minimum order for delivery is ${formatPrice(DELIVERY_MIN_CENTS)}.`);
      return;
    }
    const slot = whenMode === 'later' ? selectedSlot : null;
    if (whenMode === 'later' && !slot) {
      setGlobalError('Please choose a time slot, or switch to "As Soon As Possible".');
      return;
    }
    setSubmitting(true);
    setGlobalError(null);
    if (slot) {
      try { await slotsApi.reserve(slot, auth.token ?? ''); }
      catch (err) {
        const msg = err instanceof Error ? err.message : 'That time slot is no longer available.';
        setGlobalError(msg); showToast(msg, 'error');
        setSubmitting(false); setSelectedSlot(null); return;
      }
    }
    const addressFull = form.address.trim()
      ? `${form.address.trim()}${form.apt.trim() ? ', ' + form.apt.trim() : ''}` : undefined;
    const payload = {
      deliveryType, customerName: form.name.trim(), customerPhone: form.phone.trim(),
      customerEmail: form.email.trim(),
      ...(deliveryType === 'delivery' && { deliveryAddress: addressFull }),
      ...(form.specialInstructions.trim() && { specialInstructions: form.specialInstructions.trim() }),
      ...(deliveryType === 'delivery' && form.dropOffInstructions.trim() && { dropOffInstructions: form.dropOffInstructions.trim() }),
      scheduledFor: slot, idempotencyKey: idempotencyKey.current, items: buildOrderItems(),
    };
    try {
      const res = await ordersApi.place(payload, auth.token ?? '');
      if (!isStripeEnabled()) { finishOrder(res.order); return; }
      const intent = await paymentsApi.createIntent(res.order.id, auth.token ?? '');
      setPendingOrder(res.order);
      setClientSecret(intent.clientSecret);
      setPaymentError(null);
      setStep('payment');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setGlobalError(msg); showToast(msg, 'error');
    } finally { setSubmitting(false); }
  };

  // ── Pay ──
  const handlePay = async () => {
    const stripe = await getStripe();
    const elements = elementsRef.current;
    if (!stripe || !elements || !pendingOrder) return;
    setPaying(true); setPaymentError(null);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (error) { setPaymentError(error.message ?? 'Payment failed. Please try again.'); setPaying(false); return; }
    if (paymentIntent && ['succeeded', 'processing'].includes(paymentIntent.status)) {
      finishOrder(pendingOrder);
    } else { setPaymentError('Payment was not completed. Please try again.'); setPaying(false); }
  };

  // ── Apple/Google Pay ──
  const handlePaymentRequest = async (event: PaymentRequestPaymentMethodEvent) => {
    let sheetClosed = false;
    try {
      if (!auth.token) { event.complete('fail'); sheetClosed = true; throw new Error('Please sign in to complete your order.'); }
      const errs = validate(); setErrors(errs);
      if (Object.keys(errs).length > 0) throw new Error('Please fill in all required fields.');
      if (deliveryType === 'delivery' && subtotal < DELIVERY_MIN_CENTS)
        throw new Error(`Minimum order for delivery is ${formatPrice(DELIVERY_MIN_CENTS)}.`);
      setSubmitting(true); setGlobalError(null);
      const addressFull = form.address.trim()
        ? `${form.address.trim()}${form.apt.trim() ? ', ' + form.apt.trim() : ''}` : undefined;
      const payload = {
        deliveryType, customerName: event.payerName ?? form.name.trim(),
        customerPhone: event.payerPhone ?? form.phone.trim(),
        customerEmail: event.payerEmail ?? form.email.trim(),
        ...(deliveryType === 'delivery' && { deliveryAddress: addressFull }),
        scheduledFor: null, idempotencyKey: idempotencyKey.current, items: buildOrderItems(),
      };
      const res = await ordersApi.place(payload, auth.token ?? '');
      const { clientSecret: secret } = await paymentsApi.createIntent(res.order.id, auth.token ?? '');
      const stripe = await getStripe();
      if (!stripe) throw new Error('Payments are unavailable right now.');
      const first = await stripe.confirmCardPayment(secret, { payment_method: event.paymentMethod.id }, { handleActions: false });
      if (first.error) { event.complete('fail'); sheetClosed = true; throw new Error(first.error.message ?? 'Payment failed.'); }
      event.complete('success'); sheetClosed = true;
      let intent = first.paymentIntent;
      if (intent?.status === 'requires_action') {
        const second = await stripe.confirmCardPayment(secret);
        if (second.error) throw new Error(second.error.message ?? 'Payment authentication failed.');
        intent = second.paymentIntent;
      }
      if (!intent || !['succeeded', 'processing'].includes(intent.status))
        throw new Error('Payment was not completed. Please try again.');
      finishOrder(res.order);
    } catch (err) {
      if (!sheetClosed) event.complete('fail');
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setGlobalError(msg); showToast(msg, 'error');
    } finally { setSubmitting(false); }
  };

  // ── Rewards ──
  const handleApplyReward = async () => {
    if (!auth.token || !selectedMilestone) return;
    setRewardLoading(true); setRewardError(null);
    try {
      const res = await rewardsApi.redeem({ milestonePoints: selectedMilestone.points }, auth.token);
      setAppliedReward(res.reward);
      setRewardsSummary((prev) => prev ? { ...prev, balance: prev.balance - selectedMilestone.points } : prev);
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : 'Could not apply reward. Please try again.');
    } finally { setRewardLoading(false); }
  };

  // ── Promo ──
  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMsg('Promo codes are coming soon!');
  };

  // ── Referral ──
  const referralCode = auth.user ? `JCT-${auth.user.id}`
    : `JCT-${Math.abs(form.email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000 + 1000)}`;
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}/order?ref=${referralCode}` : '';
  const handleCopyReferral = useCallback(() => {
    navigator.clipboard.writeText(referralUrl).catch(() => {});
    setReferralCopied(true); setTimeout(() => setReferralCopied(false), 3000);
  }, [referralUrl]);
  const handleShareReferral = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: 'Joy Curry & Tandoor — Order Online', text: 'I just ordered from Joy Curry & Tandoor!', url: referralUrl }).catch(() => {});
    } else handleCopyReferral();
  }, [referralUrl, handleCopyReferral]);

  const buildWhatsAppMessage = useCallback((order: Order) => {
    const itemLines = order.lineItems.map((li) => `• ${li.qty}× ${li.itemName}`).join('\n');
    const msg = [`Joy Curry & Tandoor — Order Confirmed!`, `Order #${order.id}`, '', itemLines, '',
      `Total: ${formatPrice(order.totalCents)}`, order.estimatedWaitMin ? `ETA: ~${order.estimatedWaitMin} min` : ''].filter(Boolean).join('\n');
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }, []);

  const fieldChange = (name: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    if (errors[name as keyof Errors]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // ── Qty helpers ──
  const changeQty = (item: CartItem, delta: number) => {
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      updateCartItem(item.cartItemId, { qty: 0 }); // triggers removal in store
    } else {
      updateCartItem(item.cartItemId, { qty: newQty, lineTotalCents: (item.basePriceCents + (item.selectedOptions?.reduce((s, o) => s + o.priceDeltaCents, 0) ?? 0)) * newQty });
    }
  };

  // Step index for indicator
  const stepIndex = step === 'confirmed' ? 3 : step === 'payment' ? 2 : step === 'details' ? 1 : 0;

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="cart-page">
        <div className="cart-page__inner">
          <a href="/order" className="cart-page__back">
            <ArrowLeft size={18} aria-hidden="true" /> Back to Menu
          </a>
          <div className="cart-page__empty">
            <ShoppingBag size={48} aria-hidden="true" />
            <h2>Your cart is empty</h2>
            <p>Add some items from the menu to get started.</p>
            <a href="/order" className="btn btn--primary">Browse Menu</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page" ref={topRef}>
      <div className="cart-page__inner">
        {/* Back button */}
        <div className="cart-page__topbar">
          {step === 'cart' || step === 'confirmed' ? (
            <a href="/order" className="cart-page__back">
              <ArrowLeft size={18} aria-hidden="true" /> Back to Menu
            </a>
          ) : (
            <button type="button" className="cart-page__back" onClick={() => setStep(step === 'payment' ? 'details' : 'cart')}>
              <ArrowLeft size={18} aria-hidden="true" /> Back
            </button>
          )}

          {/* Step indicator */}
          {step !== 'confirmed' && (
            <div className="cart-steps" aria-label="Checkout progress">
              {['Cart', 'Details', 'Payment', 'Done'].map((label, i) => (
                <div key={label} className={`cart-steps__step${i === stepIndex ? ' cart-steps__step--active' : i < stepIndex ? ' cart-steps__step--done' : ''}`}>
                  <span className="cart-steps__num">{i < stepIndex ? '✓' : i + 1}</span>
                  <span className="cart-steps__label">{label}</span>
                  {i < 3 && <span className="cart-steps__sep" aria-hidden="true" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── STEP: Cart ─────────────────────────────────── */}
        {step === 'cart' && (
          <div className="cart-page__layout">
            {/* Left: items + suggestions */}
            <div className="cart-page__main">
              <h1 className="cart-page__title">Your Order</h1>

              {/* Cart items */}
              <div className="cp-items">
                {items.map((item) => (
                  <div key={item.cartItemId} className="cp-item">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="cp-item__img" width={72} height={72} loading="lazy" />
                    ) : (
                      <div className="cp-item__img cp-item__img--fallback" aria-hidden="true">{item.name.charAt(0)}</div>
                    )}
                    <div className="cp-item__info">
                      <span className="cp-item__name">{item.name}</span>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <span className="cp-item__opts">{item.selectedOptions.map((o) => o.label).join(', ')}</span>
                      )}
                      <span className="cp-item__price">{formatPrice(item.lineTotalCents)}</span>
                    </div>
                    <div className="cp-item__qty">
                      <button type="button" className="cp-item__qty-btn" onClick={() => changeQty(item, -1)} aria-label="Decrease quantity">
                        <Minus size={14} />
                      </button>
                      <span className="cp-item__qty-val">{item.qty}</span>
                      <button type="button" className="cp-item__qty-btn" onClick={() => changeQty(item, 1)} aria-label="Increase quantity">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {appliedReward && (
                  <div className="cp-item cp-item--reward">
                    <div className="cp-item__img cp-item__img--reward" aria-hidden="true"><Gift size={24} /></div>
                    <div className="cp-item__info">
                      <span className="cp-item__name">{appliedReward.itemName}</span>
                      <span className="cp-item__opts">Artisan Vault reward</span>
                      <span className="cp-item__price cp-item__price--free">Free</span>
                    </div>
                    <button type="button" className="cp-item__remove" onClick={() => { setAppliedReward(null); setSelectedMilestone(null); }} aria-label="Remove reward">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {suggestionGroups.length > 0 && (
                <div className="cp-suggestions">
                  {suggestionGroups.map((group) => (
                    <div key={group.key} className="cp-suggestions__group">
                      <div className="cp-suggestions__header">
                        <div>
                          <h3 className="cp-suggestions__headline">{group.headline}</h3>
                          <p className="cp-suggestions__subline">{group.subline}</p>
                        </div>
                        <button
                          type="button"
                          className="cp-suggestions__dismiss"
                          onClick={() => setDismissedGroups((s) => new Set([...s, group.key]))}
                          aria-label={`Dismiss ${group.headline}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="cp-suggestions__rail">
                        {group.items.map((menuItem) => (
                          <button
                            key={menuItem.id}
                            type="button"
                            className="cp-sugg-card"
                            onClick={() => window.dispatchEvent(new CustomEvent('dish:open', { detail: menuItem }))}
                          >
                            {menuItem.imageUrl ? (
                              <img src={menuItem.imageUrl} alt="" className="cp-sugg-card__img" width={90} height={70} loading="lazy" />
                            ) : (
                              <div className="cp-sugg-card__img cp-sugg-card__img--fallback" aria-hidden="true">{menuItem.name.charAt(0)}</div>
                            )}
                            <div className="cp-sugg-card__body">
                              <span className="cp-sugg-card__name">{menuItem.name}</span>
                              <span className="cp-sugg-card__price">{formatPrice(menuItem.basePriceCents)}</span>
                            </div>
                            <span className="cp-sugg-card__add" aria-hidden="true">+</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: summary + CTA */}
            <div className="cart-page__sidebar">
              <div className="cp-summary">
                <div className="cp-summary__heading">Order Total</div>

                {/* Order type toggle */}
                <div className="cp-summary__type-toggle">
                  <button
                    type="button"
                    className={`cp-summary__type-btn${deliveryType === 'pickup' ? ' cp-summary__type-btn--active' : ''}`}
                    onClick={() => orderType.set('pickup')}
                  >
                    <ShoppingBag size={13} aria-hidden="true" /> Pickup
                  </button>
                  <button
                    type="button"
                    className={`cp-summary__type-btn${deliveryType === 'delivery' ? ' cp-summary__type-btn--active' : ''}`}
                    onClick={() => orderType.set('delivery')}
                  >
                    <Truck size={13} aria-hidden="true" /> Delivery
                  </button>
                </div>

                {deliveryType === 'pickup' && (
                  <div className="cp-summary__pickup">
                    <MapPin size={13} aria-hidden="true" />
                    <span>148 E 46th St, New York, NY 10017</span>
                  </div>
                )}

                <div className="cp-summary__rows">
                  <div className="cp-summary__row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="cp-summary__row"><span>Tax (8.75%)</span><span>{formatPrice(tax)}</span></div>
                  <div className="cp-summary__row"><span>Delivery fee</span><span>{fee === 0 ? 'Free' : formatPrice(fee)}</span></div>
                  {appliedReward && <div className="cp-summary__row cp-summary__row--reward"><span>Reward discount</span><span>Applied</span></div>}
                  <div className="cp-summary__row cp-summary__row--total"><span>Total</span><span>{formatPrice(total)}</span></div>
                </div>

                {/* Vault redemption */}
                {auth.token && rewardsSummary && rewardsSummary.unlocked.length > 0 && !appliedReward && (
                  <div className="cp-vault">
                    <div className="cp-vault__header">
                      <Gift size={14} aria-hidden="true" />
                      <span>Artisan Vault</span>
                      <span className="cp-vault__bal">{rewardsSummary.balance.toLocaleString()} pts</span>
                    </div>
                    <div className="cp-vault__pills">
                      {rewardsSummary.unlocked.map((m) => (
                        <button key={m.points} type="button"
                          className={`cp-vault__pill${selectedMilestone?.points === m.points ? ' cp-vault__pill--on' : ''}`}
                          onClick={() => setSelectedMilestone(selectedMilestone?.points === m.points ? null : m)}
                        >
                          {m.label} · {m.points.toLocaleString()} pts
                        </button>
                      ))}
                    </div>
                    {rewardError && <p className="form-error" role="alert">{rewardError}</p>}
                    {selectedMilestone && (
                      <button type="button" className="btn btn--secondary cp-vault__apply" onClick={handleApplyReward} disabled={rewardLoading}>
                        {rewardLoading ? 'Applying…' : `Apply — ${selectedMilestone.label}`}
                      </button>
                    )}
                  </div>
                )}

                {/* Promo code */}
                <div className="cp-promo">
                  <button type="button" className="cp-promo__toggle" onClick={() => { setPromoExpanded((v) => !v); setPromoMsg(null); }} aria-expanded={promoExpanded}>
                    <Tag size={13} aria-hidden="true" /> Have a promo code?
                    <ChevronDown size={13} className={`cp-promo__chevron${promoExpanded ? ' cp-promo__chevron--open' : ''}`} aria-hidden="true" />
                  </button>
                  {promoExpanded && (
                    <form className="cp-promo__form" onSubmit={handlePromoSubmit}>
                      <input type="text" className="form-input cp-promo__input" value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoMsg(null); }}
                        placeholder="Enter code" aria-label="Promo code" />
                      <button type="submit" className="btn btn--secondary">Apply</button>
                    </form>
                  )}
                  {promoMsg && <p className="cp-promo__msg">{promoMsg}</p>}
                </div>

                <button
                  type="button"
                  className="btn btn--primary cp-summary__cta"
                  onClick={() => setStep('details')}
                  disabled={items.length === 0}
                >
                  Continue to Checkout →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Details ──────────────────────────────── */}
        {step === 'details' && (
          <div className="cart-page__layout">
            <form onSubmit={handleSubmit} noValidate className="cart-page__main">
              <h1 className="cart-page__title">Your Details</h1>

              {/* Order type */}
              <div className="form-group">
                <span className="form-label">Order Type</span>
                <div className="cp-summary__type-toggle">
                  <button
                    type="button"
                    className={`cp-summary__type-btn${deliveryType === 'pickup' ? ' cp-summary__type-btn--active' : ''}`}
                    onClick={() => orderType.set('pickup')}
                  >
                    <ShoppingBag size={13} aria-hidden="true" /> Pickup
                  </button>
                  <button
                    type="button"
                    className={`cp-summary__type-btn${deliveryType === 'delivery' ? ' cp-summary__type-btn--active' : ''}`}
                    onClick={() => orderType.set('delivery')}
                  >
                    <Truck size={13} aria-hidden="true" /> Delivery
                  </button>
                </div>
                {deliveryType === 'pickup' && (
                  <div className="checkout-pickup-card">
                    <MapPin size={15} className="checkout-pickup-card__icon" aria-hidden="true" />
                    <div className="checkout-pickup-card__info">
                      <strong className="checkout-pickup-card__address">148 E 46th St, New York, NY 10017</strong>
                      <span className="checkout-pickup-card__hours">Mon–Sun · 11:30 AM – 10:00 PM</span>
                    </div>
                  </div>
                )}
              </div>

              {/* When */}
              <div className="form-group">
                <span className="form-label">When?</span>
                <div className="bundle-slot__options">
                  <button type="button" className={`bundle-slot__option${whenMode === 'asap' ? ' bundle-slot__option--selected' : ''}`} onClick={() => setWhenMode('asap')}>As Soon As Possible</button>
                  <button type="button" className={`bundle-slot__option${whenMode === 'later' ? ' bundle-slot__option--selected' : ''}`} onClick={() => setWhenMode('later')}>Schedule for Later</button>
                </div>
                {whenMode === 'later' && (
                  <div className="schedule" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="bundle-slot__options schedule__days">
                      <button type="button" className={`bundle-slot__option${slotDate === nyDateStr(0) ? ' bundle-slot__option--selected' : ''}`} onClick={() => { setSlotDate(nyDateStr(0)); setSelectedSlot(null); }}>Today</button>
                      <button type="button" className={`bundle-slot__option${slotDate === nyDateStr(1) ? ' bundle-slot__option--selected' : ''}`} onClick={() => { setSlotDate(nyDateStr(1)); setSelectedSlot(null); }}>Tomorrow</button>
                    </div>
                    {slotsLoading ? <p className="form-hint">Loading available times…</p>
                      : slotsError ? <p className="form-error" role="alert">{slotsError}</p>
                      : slots.length === 0 ? <p className="form-hint">No times available for this day.</p>
                      : (
                        <div className="bundle-slot__options schedule__grid" style={{ marginTop: 'var(--space-3)' }}>
                          {slots.map((slot) => (
                            <button key={slot.slotTime} type="button" disabled={slot.soldOut}
                              className={'bundle-slot__option' + (selectedSlot === slot.slotTime ? ' bundle-slot__option--selected' : '') + (slot.soldOut ? ' bundle-slot__option--disabled' : '') + (slot.filling ? ' bundle-slot__option--filling' : '')}
                              onClick={() => setSelectedSlot(slot.slotTime)} aria-pressed={selectedSlot === slot.slotTime}>
                              {formatSlot(slot.slotTime)}
                              {slot.filling && !slot.soldOut && <span className="schedule__tag"> · {slot.remaining} left</span>}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="form-group">
                <label htmlFor="cp-name" className="form-label form-label--required">Name</label>
                <input id="cp-name" type="text" className={`form-input${errors.name ? ' form-input--error' : ''}`} value={form.name} onChange={fieldChange('name')} autoComplete="name" placeholder="Your full name" />
                {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label htmlFor="cp-phone" className="form-label form-label--required">Phone</label>
                <input id="cp-phone" type="tel" className={`form-input${errors.phone ? ' form-input--error' : ''}`} value={form.phone} onChange={fieldChange('phone')} autoComplete="tel" placeholder="(212) 555-0100" />
                {errors.phone && <span className="form-error" role="alert">{errors.phone}</span>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="cp-email" className="form-label form-label--required">Email</label>
                <input id="cp-email" type="email" className={`form-input${errors.email ? ' form-input--error' : ''}`} value={form.email} onChange={fieldChange('email')} autoComplete="email" placeholder="you@example.com" />
                {errors.email && <span className="form-error" role="alert">{errors.email}</span>}
              </div>

              {/* Delivery address */}
              {deliveryType === 'delivery' && (
                <>
                  <div className="form-group">
                    <label htmlFor="cp-address" className="form-label form-label--required">Delivery Address</label>
                    <input id="cp-address" type="text" className={`form-input${errors.address ? ' form-input--error' : ''}`} value={form.address} onChange={fieldChange('address')} autoComplete="street-address" placeholder="123 Main St, New York, NY" />
                    {errors.address && <span className="form-error" role="alert">{errors.address}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="cp-apt" className="form-label">Apt / Floor <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="cp-apt" type="text" className="form-input" value={form.apt} onChange={fieldChange('apt')} autoComplete="address-line2" placeholder="Apt 4B" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cp-dropoff" className="form-label">Drop-off Instructions <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                    <input id="cp-dropoff" type="text" className="form-input" value={form.dropOffInstructions} onChange={fieldChange('dropOffInstructions')} placeholder="Leave at door, ring buzzer 4B…" />
                  </div>
                </>
              )}

              {/* Special instructions */}
              <div className="form-group">
                <label htmlFor="cp-notes" className="form-label">Special Instructions <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <textarea id="cp-notes" className="form-textarea" value={form.specialInstructions} onChange={fieldChange('specialInstructions')} placeholder="Allergies, spice preferences, extra napkins…" rows={3} />
              </div>

              {globalError && <p role="alert" className="form-error" style={{ marginTop: 'var(--space-3)' }}>{globalError}</p>}

              <div className="cp-detail-actions">
                <PaymentRequestButton totalCents={total} onPaymentMethod={handlePaymentRequest} />
                <button type="submit" className="btn btn--primary" disabled={submitting} style={{ width: '100%' }}>
                  {submitting ? 'Placing order…' : isStripeEnabled() ? `Continue to Payment · ${formatPrice(total)}` : `Place Order · ${formatPrice(total)}`}
                </button>
              </div>
            </form>

            {/* Right: order summary */}
            <div className="cart-page__sidebar">
              <div className="cp-summary">
                <div className="cp-summary__heading">Order Summary</div>
                {items.map((item) => (
                  <div key={item.cartItemId} className="order-summary__row order-summary__row--item">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" className="order-summary__thumb" loading="lazy" width={40} height={40} />
                      : <div className="order-summary__thumb order-summary__thumb--fallback" aria-hidden="true">{item.name.charAt(0)}</div>}
                    <span className="order-summary__item-name">{item.qty}&times;&nbsp;{item.name}</span>
                    <span className="order-summary__price">{formatPrice(item.lineTotalCents)}</span>
                  </div>
                ))}
                {appliedReward && (
                  <div className="order-summary__row order-summary__row--item order-summary__row--reward">
                    <div className="order-summary__thumb order-summary__thumb--reward" aria-hidden="true"><Gift size={16} /></div>
                    <span className="order-summary__item-name">1&times;&nbsp;{appliedReward.itemName}</span>
                    <span className="order-summary__price order-summary__price--free">Free</span>
                  </div>
                )}
                <div className="cp-summary__rows">
                  <div className="cp-summary__row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="cp-summary__row"><span>Tax (8.75%)</span><span>{formatPrice(tax)}</span></div>
                  <div className="cp-summary__row"><span>Delivery fee</span><span>{fee === 0 ? 'Free' : formatPrice(fee)}</span></div>
                  <div className="cp-summary__row cp-summary__row--total"><span>Total</span><span>{formatPrice(total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Payment ──────────────────────────────── */}
        {step === 'payment' && (
          <div className="cart-page__payment">
            <h1 className="cart-page__title">Payment</h1>

            {/* Mini recap */}
            <div className="payment-recap" style={{ maxWidth: 560, margin: '0 auto var(--space-6)' }}>
              <div className="payment-recap__items">
                {items.map((item) => (
                  <div key={item.cartItemId} className="payment-recap__row">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" className="payment-recap__thumb" loading="lazy" width={40} height={40} />
                      : <div className="payment-recap__thumb payment-recap__thumb--fallback" aria-hidden="true">{item.name.charAt(0)}</div>}
                    <span className="payment-recap__name">{item.qty}&times; {item.name}</span>
                  </div>
                ))}
                {appliedReward && (
                  <div className="payment-recap__row">
                    <div className="payment-recap__thumb payment-recap__thumb--reward" aria-hidden="true"><Gift size={16} /></div>
                    <span className="payment-recap__name payment-recap__name--reward">1&times; {appliedReward.itemName} <span className="payment-recap__free">Free</span></span>
                  </div>
                )}
              </div>
              {form.dropOffInstructions.trim() && (
                <div className="payment-recap__dropoff">
                  <span className="payment-recap__dropoff-label"><DoorOpen size={15} strokeWidth={2} aria-hidden="true" /> Drop-off</span>
                  <span className="payment-recap__dropoff-value">{form.dropOffInstructions.trim()}</span>
                </div>
              )}
              <div className="payment-recap__total"><span>Total</span><span>{formatPrice(pendingOrder?.totalCents ?? total)}</span></div>
            </div>

            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <div ref={payElRef} />
              {!payElementReady && <p className="form-hint">Loading secure payment form…</p>}
              {paymentError && <p role="alert" style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>{paymentError}</p>}

              <button type="button" className="btn btn--primary" onClick={handlePay} disabled={paying || !payElementReady} style={{ width: '100%', marginTop: 'var(--space-5)' }}>
                {paying ? 'Processing payment…' : `Pay ${formatPrice(pendingOrder?.totalCents ?? total)}`}
              </button>
              <p className="form-hint" style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
                <Lock size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> Payments are processed securely by Stripe.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: Confirmed ────────────────────────────── */}
        {step === 'confirmed' && confirmedOrder && (
          <div className="cart-page__confirmed">
            <div className="confirmation">
              <div className="confirmation__icon" aria-hidden="true">✓</div>
              <h2 className="confirmation__title">Order Placed!</h2>
              <p className="confirmation__order-id">Order #{confirmedOrder.id}</p>
              {confirmedOrder.estimatedWaitMin && (
                <p className="confirmation__detail">Estimated wait: <strong>{confirmedOrder.estimatedWaitMin} minutes</strong></p>
              )}
              {whenMode === 'later' && selectedSlot && (
                <p className="confirmation__detail confirmation__detail--scheduled">⏰ Scheduled for <strong>{formatSlotTime(selectedSlot)}</strong></p>
              )}
              <p className="confirmation__detail">We'll send updates to <strong>{form.email}</strong></p>

              <a href={buildWhatsAppMessage(confirmedOrder)} target="_blank" rel="noopener noreferrer" className="btn btn--whatsapp"
                style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'center' }}>
                <MessageCircle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> Send to WhatsApp
              </a>

              <div className="referral-card">
                <p className="referral-card__heading">Share & Earn <Gift size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /></p>
                <p className="referral-card__sub">Give a friend their first order discount — you'll both earn bonus Vault points when they order.</p>
                <div className="referral-card__code">{referralCode}</div>
                <div className="referral-card__actions">
                  <button type="button" className="referral-card__copy" onClick={handleCopyReferral}>
                    {referralCopied ? '✓ Copied!' : <><Copy size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Copy Link</>}
                  </button>
                  <button type="button" className="referral-card__share" onClick={handleShareReferral}>
                    <Share2 size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> Share
                  </button>
                </div>
              </div>

              <a href={`/track?id=${confirmedOrder.id}`} className="btn btn--primary" style={{ marginTop: 'var(--space-4)', display: 'block', textAlign: 'center' }}>Track your order →</a>
              <a href="/order" className="btn btn--secondary" style={{ marginTop: 'var(--space-3)', display: 'block', textAlign: 'center' }}>Back to Menu</a>
              <a href="/help" className="confirmation__help-link">Need help with your order?</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
