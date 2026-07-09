import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Gift, Copy, Share2, Lock, ShoppingBag, Truck, MapPin, Tag, ChevronDown } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  cartItems,
  subtotalCents,
  taxCents,
  deliveryFeeCents,
  totalCents,
  checkoutOpen,
  orderType,
  deliveryAddress,
  orderGateOpen,
  scheduledFor,
  clearCart,
  type CartItem,
} from '@lib/core';
import { authState, authOpen } from '@lib/core';
import { ordersApi, slotsApi, paymentsApi, rewardsApi, type Order, type Slot, type RewardsSummary, type RewardMilestone, type RewardLine } from '@lib/core';
import { MIN_ORDER_CENTS } from '@lib/core';
import { formatPrice, formatSlotTime } from '@lib/core';
import { showToast } from '@lib/toast';
import { useFocusTrap } from '@lib/hooks';
import { getStripe, isStripeEnabled } from '@lib/stripe';
import PaymentRequestButton from '@components/islands/PaymentRequestButton';
import type { PaymentRequestPaymentMethodEvent, StripeElements } from '@stripe/stripe-js';

// Restaurant-local (America/New_York) date string, optionally offset by days.
function nyDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// "2026-06-22T11:00" → "11:00 AM"
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
// Delivery minimum comes from the shared constant (mirrors backend validate.js).
const DELIVERY_MIN_CENTS = MIN_ORDER_CENTS;

type DeliveryType = 'delivery' | 'pickup';
type Screen = 'form' | 'submitting' | 'payment' | 'confirmed';

interface Form {
  name: string;
  phone: string;
  email: string;
  address: string;
  apt: string;
  specialInstructions: string;
}

interface Errors {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

const EMPTY_FORM: Form = {
  name: '',
  phone: '',
  email: '',
  address: '',
  apt: '',
  specialInstructions: '',
};

export default function CheckoutModal() {
  const open = useNano(checkoutOpen);
  const items = useNano(cartItems);
  const subtotal = useNano(subtotalCents);
  const tax = useNano(taxCents);
  const fee = useNano(deliveryFeeCents);
  const total = useNano(totalCents);
  const auth = useNano(authState);
  // Order type is chosen upfront in OrderGate; default to delivery if somehow unset.
  const chosenType = useNano(orderType);
  const savedAddress = useNano(deliveryAddress);
  const deliveryType: DeliveryType = chosenType ?? 'delivery';

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [screen, setScreen] = useState<Screen>('form');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // ── Stripe payment step (Session 4) ──
  // Order is created UNPAID first; Stripe Payment Element collects the card;
  // the webhook flips it to paid/confirmed server-side.
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payElementReady, setPayElementReady] = useState(false);
  const elementsRef = useRef<StripeElements | null>(null);
  const payElRef = useRef<HTMLDivElement>(null);

  // ── Artisan Vault rewards ──
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummary | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<RewardMilestone | null>(null);
  const [appliedReward, setAppliedReward] = useState<RewardLine | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  // ── Promo code ──
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  // ── Scheduling (Phase 3-C) ──
  const [whenMode, setWhenMode] = useState<'asap' | 'later'>('asap');
  const [slotDate, setSlotDate] = useState<string>(nyDateStr(0));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Generated once per checkout session; refreshed after a successful order
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, open);

  // Pre-fill name/email from auth, address from the gate choice
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        name: f.name || (auth.user?.name ?? ''),
        email: f.email || (auth.user?.email ?? ''),
        address: f.address || savedAddress,
      }));
    }
  }, [open, auth.user, savedAddress]);

  // Fetch slots when the customer opts to schedule for later (or changes day)
  useEffect(() => {
    if (!open || whenMode !== 'later') return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    slotsApi
      .getSlots(slotDate)
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err instanceof Error ? err.message : 'Could not load times.');
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, whenMode, slotDate]);

  // Fetch rewards summary when checkout opens (requires auth)
  useEffect(() => {
    if (!open || !auth.token) return;
    let cancelled = false;
    rewardsApi.getMine(auth.token).then((res) => {
      if (!cancelled) setRewardsSummary(res.rewards);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, auth.token]);

  // P5-D: sync selected slot → cart store so CartDrawer header shows it
  useEffect(() => {
    scheduledFor.set(whenMode === 'later' ? selectedSlot : null);
  }, [whenMode, selectedSlot]);

  // After modal closes and user was on confirmed screen, reset for next use
  useEffect(() => {
    if (!open && screen === 'confirmed') {
      const t = setTimeout(() => {
        setScreen('form');
        setForm(EMPTY_FORM);
        setErrors({});
        setGlobalError(null);
        setConfirmedOrder(null);
        setWhenMode('asap');
        setSelectedSlot(null);
        scheduledFor.set(null);
        setPendingOrder(null);
        setClientSecret(null);
        setPaymentError(null);
        setPaying(false);
        setAppliedReward(null);
        setSelectedMilestone(null);
        setRewardError(null);
        setPromoCode('');
        setPromoMsg(null);
        setPromoExpanded(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [open, screen]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = 'Name must be at least 2 characters.';
    if (!form.phone.trim() || !PHONE_RE.test(form.phone.trim()))
      e.phone = 'Please enter a valid phone number.';
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim()))
      e.email = 'Please enter a valid email address.';
    if (deliveryType === 'delivery' && !form.address.trim())
      e.address = 'Delivery address is required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Orders are tied to an account (server requires a JWT), so guest
    // checkout isn't supported yet: send the customer to sign in/register
    // first rather than letting the request fail with a 401 at payment time.
    if (!auth.token) {
      checkoutOpen.set(false);
      authOpen.set(true);
      showToast('Please sign in to complete your order — your cart is saved.', 'info');
      return;
    }

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Mirror the backend's delivery minimum so we never reserve a slot for an
    // order the server will reject (avoids orphan slot reservations).
    if (deliveryType === 'delivery' && subtotal < DELIVERY_MIN_CENTS) {
      setGlobalError(`Minimum order for delivery is ${formatPrice(DELIVERY_MIN_CENTS)}.`);
      return;
    }

    // Scheduling guard: "later" requires a chosen slot.
    const scheduledFor = whenMode === 'later' ? selectedSlot : null;
    if (whenMode === 'later' && !scheduledFor) {
      setGlobalError('Please choose a time slot, or switch to "As Soon As Possible".');
      return;
    }

    setScreen('submitting');
    setGlobalError(null);

    // Reserve the kitchen slot before placing the order (Phase 3-B endpoint).
    if (scheduledFor) {
      try {
        await slotsApi.reserve(scheduledFor, auth.token ?? '');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'That time slot is no longer available.';
        setGlobalError(msg);
        showToast(msg, 'error');
        setScreen('form');
        setSelectedSlot(null);
        return;
      }
    }

    const addressFull = form.address.trim()
      ? `${form.address.trim()}${form.apt.trim() ? ', ' + form.apt.trim() : ''}`
      : undefined;

    const payload = {
      deliveryType,
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
      customerEmail: form.email.trim(),
      ...(deliveryType === 'delivery' && { deliveryAddress: addressFull }),
      ...(form.specialInstructions.trim() && {
        specialInstructions: form.specialInstructions.trim(),
      }),
      scheduledFor,
      idempotencyKey: idempotencyKey.current,
      items: [
        ...items.map((item: CartItem) => ({
          itemId: item.itemId,
          itemName: item.name,
          itemType: item.itemType,
          basePriceCents: item.basePriceCents,
          qty: item.qty,
          selectedOptions: item.selectedOptions ?? [],
          slotChoices: item.slotChoices ?? {},
        })),
        ...(appliedReward ? [{
          itemId: appliedReward.itemId,
          itemName: appliedReward.itemName,
          itemType: appliedReward.itemType,
          basePriceCents: 0,
          qty: 1,
          selectedOptions: [],
          slotChoices: {},
        }] : []),
      ],
    };

    try {
      const res = await ordersApi.place(payload, auth.token ?? '');

      // Stripe not configured (e.g. local dev without keys): fall back to the
      // pre-payments behavior so the flow still completes.
      if (!isStripeEnabled()) {
        finishOrder(res.order);
        return;
      }

      // Card required: create/reuse the PaymentIntent (amount computed
      // server-side from the stored order) and move to the payment step.
      // The cart is NOT cleared until payment succeeds.
      const intent = await paymentsApi.createIntent(res.order.id, auth.token ?? '');
      setPendingOrder(res.order);
      setClientSecret(intent.clientSecret);
      setPaymentError(null);
      setScreen('payment');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setGlobalError(msg);
      showToast(msg, 'error');
      setScreen('form');
    }
  };

  // Shared post-payment (or no-Stripe fallback) completion.
  const finishOrder = (order: Order) => {
    setConfirmedOrder(order);
    clearCart();
    idempotencyKey.current = crypto.randomUUID();
    setPendingOrder(null);
    setClientSecret(null);
    setPaying(false);
    setScreen('confirmed');
    window.dispatchEvent(new CustomEvent('order:confirmed', { detail: order }));
  };

  // Mount the Stripe Payment Element when the payment step opens.
  useEffect(() => {
    if (screen !== 'payment' || !clientSecret) return;
    let cancelled = false;
    setPayElementReady(false);
    (async () => {
      const stripe = await getStripe();
      if (!stripe || cancelled || !payElRef.current) return;
      const elements = stripe.elements({
        clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#b45309' } },
      });
      elementsRef.current = elements;
      const payEl = elements.create('payment');
      payEl.mount(payElRef.current);
      payEl.on('ready', () => {
        if (!cancelled) setPayElementReady(true);
      });
    })();
    return () => {
      cancelled = true;
      elementsRef.current = null;
    };
  }, [screen, clientSecret]);

  const handlePay = async () => {
    const stripe = await getStripe();
    const elements = elementsRef.current;
    if (!stripe || !elements || !pendingOrder) return;
    setPaying(true);
    setPaymentError(null);
    // redirect:'if_required' keeps card + wallet flows in-page; 3DS opens the
    // Stripe-hosted challenge in an iframe and resolves here.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      setPaymentError(error.message ?? 'Payment failed. Please try again.');
      setPaying(false);
      return;
    }
    if (paymentIntent && ['succeeded', 'processing'].includes(paymentIntent.status)) {
      finishOrder(pendingOrder);
    } else {
      setPaymentError('Payment was not completed. Please try again.');
      setPaying(false);
    }
  };

  const handleClose = () => checkoutOpen.set(false);

  const handleBackToMenu = () => {
    checkoutOpen.set(false);
    setTimeout(() => {
      setScreen('form');
      setForm(EMPTY_FORM);
      setErrors({});
      setGlobalError(null);
      setConfirmedOrder(null);
      setWhenMode('asap');
      setSelectedSlot(null);
      setPendingOrder(null);
      setClientSecret(null);
      setPaymentError(null);
      setPaying(false);
      setAppliedReward(null);
      setSelectedMilestone(null);
      setRewardError(null);
      setPromoCode('');
      setPromoMsg(null);
      setPromoExpanded(false);
    }, 350);
  };

  // Apple Pay / Google Pay via the Payment Request API. This handler owns the
  // full lifecycle including event.complete() — the sheet must be closed
  // promptly, before any 3DS challenge runs in-page.
  const handlePaymentRequest = async (event: PaymentRequestPaymentMethodEvent) => {
    let sheetClosed = false;
    try {
      if (!auth.token) {
        event.complete('fail');
        sheetClosed = true;
        throw new Error('Please sign in to complete your order.');
      }

      const errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length > 0) throw new Error('Please fill in all required fields.');

      if (deliveryType === 'delivery' && subtotal < DELIVERY_MIN_CENTS) {
        throw new Error(`Minimum order for delivery is ${formatPrice(DELIVERY_MIN_CENTS)}.`);
      }

      setScreen('submitting');
      setGlobalError(null);

      const addressFull = form.address.trim()
        ? `${form.address.trim()}${form.apt.trim() ? ', ' + form.apt.trim() : ''}`
        : undefined;

      const payload = {
        deliveryType,
        customerName: event.payerName ?? form.name.trim(),
        customerPhone: event.payerPhone ?? form.phone.trim(),
        customerEmail: event.payerEmail ?? form.email.trim(),
        ...(deliveryType === 'delivery' && { deliveryAddress: addressFull }),
        scheduledFor: null,
        idempotencyKey: idempotencyKey.current,
        items: [
          ...items.map((item: CartItem) => ({
            itemId: item.itemId,
            itemName: item.name,
            itemType: item.itemType,
            basePriceCents: item.basePriceCents,
            qty: item.qty,
            selectedOptions: item.selectedOptions ?? [],
            slotChoices: item.slotChoices ?? {},
          })),
          ...(appliedReward ? [{
            itemId: appliedReward.itemId,
            itemName: appliedReward.itemName,
            itemType: appliedReward.itemType,
            basePriceCents: 0,
            qty: 1,
            selectedOptions: [],
            slotChoices: {},
          }] : []),
        ],
      };

      const res = await ordersApi.place(payload, auth.token ?? '');
      const { clientSecret: secret } = await paymentsApi.createIntent(res.order.id, auth.token ?? '');
      const stripe = await getStripe();
      if (!stripe) throw new Error('Payments are unavailable right now.');

      // Confirm with the wallet's payment method; defer 3DS (handleActions:false)
      // so the wallet sheet can close first.
      const first = await stripe.confirmCardPayment(
        secret,
        { payment_method: event.paymentMethod.id },
        { handleActions: false },
      );
      if (first.error) {
        event.complete('fail');
        sheetClosed = true;
        throw new Error(first.error.message ?? 'Payment failed. Please try again.');
      }
      event.complete('success');
      sheetClosed = true;

      let intent = first.paymentIntent;
      if (intent && intent.status === 'requires_action') {
        const second = await stripe.confirmCardPayment(secret);
        if (second.error) throw new Error(second.error.message ?? 'Payment authentication failed.');
        intent = second.paymentIntent;
      }
      if (!intent || !['succeeded', 'processing'].includes(intent.status)) {
        throw new Error('Payment was not completed. Please try again.');
      }

      finishOrder(res.order);
    } catch (err) {
      if (!sheetClosed) event.complete('fail');
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setGlobalError(msg);
      showToast(msg, 'error');
      setScreen('form');
    }
  };

  // P6-B: Referral code derived from user ID or email
  const referralCode = auth.user
    ? `JCT-${auth.user.id}`
    : `JCT-${Math.abs(form.email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000 + 1000)}`;

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/order?ref=${referralCode}`
    : '';

  const [referralCopied, setReferralCopied] = useState(false);

  const handleCopyReferral = useCallback(() => {
    navigator.clipboard.writeText(referralUrl).catch(() => {});
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 3000);
  }, [referralUrl]);

  const handleShareReferral = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'Joy Curry & Tandoor — Order Online',
        text: `I just ordered from Joy Curry & Tandoor — best halal Indian in NYC! Use my link for your first order:`,
        url: referralUrl,
      }).catch(() => {});
    } else {
      handleCopyReferral();
    }
  }, [referralUrl, handleCopyReferral]);

  // P6-D: WhatsApp message builder
  const buildWhatsAppMessage = useCallback((order: Order) => {
    const itemLines = order.lineItems
      .map(li => `• ${li.qty}× ${li.itemName}`)
      .join('\n');
    const eta = order.estimatedWaitMin ? `ETA: ~${order.estimatedWaitMin} min` : '';
    const msg = [
      `Joy Curry & Tandoor — Order Confirmed!`,
      `Order #${order.id}`,
      ``,
      itemLines,
      ``,
      `Total: ${formatPrice(order.totalCents)}`,
      eta,
    ].filter(Boolean).join('\n');
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }, []);

  const handleApplyReward = async () => {
    if (!auth.token || !selectedMilestone) return;
    setRewardLoading(true);
    setRewardError(null);
    try {
      const res = await rewardsApi.redeem({ milestonePoints: selectedMilestone.points }, auth.token);
      setAppliedReward(res.reward);
      setRewardsSummary((prev) => prev ? { ...prev, balance: prev.balance - selectedMilestone.points } : prev);
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : 'Could not apply reward. Please try again.');
    } finally {
      setRewardLoading(false);
    }
  };

  const handleRemoveReward = () => {
    setAppliedReward(null);
    setSelectedMilestone(null);
    setRewardError(null);
  };

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMsg('Promo codes are coming soon!');
  };

  const fieldChange =
    (name: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [name]: e.target.value }));
      if (errors[name as keyof Errors])
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

  // Step indicator helper
  const stepIndex = screen === 'confirmed' ? 2 : screen === 'payment' ? 1 : 0;

  return (
    <div
      className={`modal-overlay${open ? ' modal-overlay--visible' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Step indicator ── */}
        {screen !== 'confirmed' && (
          <div className="checkout-steps" aria-label="Checkout progress">
            {['Details', 'Payment', 'Done'].map((label, i) => (
              <div
                key={label}
                className={`checkout-steps__step${i === stepIndex ? ' checkout-steps__step--active' : i < stepIndex ? ' checkout-steps__step--done' : ''}`}
              >
                <span className="checkout-steps__num">{i < stepIndex ? '✓' : i + 1}</span>
                <span className="checkout-steps__label">{label}</span>
              </div>
            ))}
          </div>
        )}

        {screen === 'confirmed' && confirmedOrder ? (
          /* ── Confirmation screen ─────────────────────────── */
          <>
            <div className="modal__header">
              <h2 className="modal__title">Order Confirmed</h2>
              <button
                className="modal__close"
                onClick={handleBackToMenu}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal__body">
              <div className="confirmation">
                <div className="confirmation__icon" aria-hidden="true">✓</div>
                <h3 className="confirmation__title">Order Placed!</h3>
                <p className="confirmation__order-id">Order #{confirmedOrder.id}</p>
                {confirmedOrder.estimatedWaitMin ? (
                  <p className="confirmation__detail">
                    Estimated wait:{' '}
                    <strong>{confirmedOrder.estimatedWaitMin} minutes</strong>
                  </p>
                ) : null}
                {whenMode === 'later' && selectedSlot && (
                  <p className="confirmation__detail confirmation__detail--scheduled">
                    ⏰ Scheduled for <strong>{formatSlotTime(selectedSlot)}</strong>
                  </p>
                )}
                <p className="confirmation__detail">
                  We'll send updates to <strong>{form.email}</strong>
                </p>

                <a
                  href={buildWhatsAppMessage(confirmedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--whatsapp"
                  style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'center' }}
                >
                  <MessageCircle size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> Send to WhatsApp
                </a>

                <div className="referral-card">
                  <p className="referral-card__heading">Share & Earn <Gift size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /></p>
                  <p className="referral-card__sub">Give a friend their first order discount — you'll both earn bonus Vault points when they order.</p>
                  <div className="referral-card__code">{referralCode}</div>
                  <div className="referral-card__actions">
                    <button
                      type="button"
                      className="referral-card__copy"
                      onClick={handleCopyReferral}
                    >
                      {referralCopied ? '✓ Copied!' : <><Copy size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Copy Link</>}
                    </button>
                    <button
                      type="button"
                      className="referral-card__share"
                      onClick={handleShareReferral}
                    >
                      <Share2 size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> Share
                    </button>
                  </div>
                </div>

                <button
                  className="btn btn--primary"
                  onClick={handleBackToMenu}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </>
        ) : screen === 'payment' ? (
          /* ── Payment step (Stripe Payment Element) ───────── */
          <>
            <div className="modal__header">
              <h2 className="modal__title">Payment</h2>
              <button
                className="modal__close"
                onClick={handleClose}
                aria-label="Close checkout"
              >
                ✕
              </button>
            </div>
            <div className="modal__body">
              {/* Mini order recap above the payment element */}
              <div className="payment-recap">
                <div className="payment-recap__items">
                  {items.map((item: CartItem) => (
                    <div key={item.cartItemId} className="payment-recap__row">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="payment-recap__thumb"
                          loading="lazy"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="payment-recap__thumb payment-recap__thumb--fallback" aria-hidden="true">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      <span className="payment-recap__name">
                        {item.qty}&times; {item.name}
                      </span>
                    </div>
                  ))}
                  {appliedReward && (
                    <div className="payment-recap__row">
                      <div className="payment-recap__thumb payment-recap__thumb--reward" aria-hidden="true">
                        <Gift size={16} />
                      </div>
                      <span className="payment-recap__name payment-recap__name--reward">
                        1&times; {appliedReward.itemName} <span className="payment-recap__free">Free</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="payment-recap__total">
                  <span>Total</span>
                  <span>{formatPrice(pendingOrder?.totalCents ?? total)}</span>
                </div>
              </div>

              <div ref={payElRef} />
              {!payElementReady && (
                <p className="form-hint">Loading secure payment form…</p>
              )}
              {paymentError && (
                <p
                  role="alert"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: 'var(--text-sm)',
                    marginTop: 'var(--space-3)',
                  }}
                >
                  {paymentError}
                </p>
              )}
            </div>
            <div className="modal__footer">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handlePay}
                disabled={paying || !payElementReady}
                style={{ width: '100%' }}
              >
                {paying
                  ? 'Processing payment…'
                  : `Pay ${formatPrice(pendingOrder?.totalCents ?? total)}`}
              </button>
              <p
                className="form-hint"
                style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}
              >
                <Lock size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> Payments are processed securely by Stripe.
              </p>
            </div>
          </>
        ) : (
          /* ── Checkout form ───────────────────────────────── */
          <>
            <div className="modal__header">
              <h2 className="modal__title">Checkout</h2>
              <button
                className="modal__close"
                onClick={handleClose}
                aria-label="Close checkout"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <div className="modal__body modal__body--two-col">
                {/* ── Left: form fields ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {/* Order type — chosen in OrderGate, shown read-only here */}
                  <div className="form-group">
                    <span className="form-label">Order Type</span>
                    <div className="checkout-ordertype">
                      <span className="checkout-ordertype__value">
                        {deliveryType === 'pickup'
                          ? <><ShoppingBag size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Pickup</>
                          : <><Truck size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Delivery</>}
                      </span>
                      <button type="button" className="checkout-ordertype__change" onClick={() => orderGateOpen.set(true)}>
                        Change
                      </button>
                    </div>

                    {/* Pickup confirmation card */}
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

                  {/* When? — ASAP vs scheduled */}
                  <div className="form-group">
                    <span className="form-label">When?</span>
                    <div className="bundle-slot__options">
                      <button
                        type="button"
                        className={`bundle-slot__option${whenMode === 'asap' ? ' bundle-slot__option--selected' : ''}`}
                        onClick={() => setWhenMode('asap')}
                      >
                        As Soon As Possible
                      </button>
                      <button
                        type="button"
                        className={`bundle-slot__option${whenMode === 'later' ? ' bundle-slot__option--selected' : ''}`}
                        onClick={() => setWhenMode('later')}
                      >
                        Schedule for Later
                      </button>
                    </div>

                    {whenMode === 'later' && (
                      <div className="schedule">
                        <div className="bundle-slot__options schedule__days">
                          <button
                            type="button"
                            className={`bundle-slot__option${slotDate === nyDateStr(0) ? ' bundle-slot__option--selected' : ''}`}
                            onClick={() => { setSlotDate(nyDateStr(0)); setSelectedSlot(null); }}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            className={`bundle-slot__option${slotDate === nyDateStr(1) ? ' bundle-slot__option--selected' : ''}`}
                            onClick={() => { setSlotDate(nyDateStr(1)); setSelectedSlot(null); }}
                          >
                            Tomorrow
                          </button>
                        </div>

                        {slotsLoading ? (
                          <p className="form-hint">Loading available times…</p>
                        ) : slotsError ? (
                          <p className="form-error" role="alert">{slotsError}</p>
                        ) : slots.length === 0 ? (
                          <p className="form-hint">No times available for this day.</p>
                        ) : (
                          <div className="bundle-slot__options schedule__grid">
                            {slots.map((slot) => (
                              <button
                                key={slot.slotTime}
                                type="button"
                                disabled={slot.soldOut}
                                className={
                                  'bundle-slot__option' +
                                  (selectedSlot === slot.slotTime ? ' bundle-slot__option--selected' : '') +
                                  (slot.soldOut ? ' bundle-slot__option--disabled' : '') +
                                  (slot.filling ? ' bundle-slot__option--filling' : '')
                                }
                                onClick={() => setSelectedSlot(slot.slotTime)}
                                aria-pressed={selectedSlot === slot.slotTime}
                              >
                                {formatSlot(slot.slotTime)}
                                {slot.filling && !slot.soldOut && (
                                  <span className="schedule__tag"> · {slot.remaining} left</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="form-group">
                    <label htmlFor="co-name" className="form-label form-label--required">Name</label>
                    <input
                      id="co-name" type="text"
                      className={`form-input${errors.name ? ' form-input--error' : ''}`}
                      value={form.name} onChange={fieldChange('name')}
                      autoComplete="name" placeholder="Your full name"
                    />
                    {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label htmlFor="co-phone" className="form-label form-label--required">Phone</label>
                    <input
                      id="co-phone" type="tel"
                      className={`form-input${errors.phone ? ' form-input--error' : ''}`}
                      value={form.phone} onChange={fieldChange('phone')}
                      autoComplete="tel" placeholder="(212) 555-0100"
                    />
                    {errors.phone && <span className="form-error" role="alert">{errors.phone}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="co-email" className="form-label form-label--required">Email</label>
                    <input
                      id="co-email" type="email"
                      className={`form-input${errors.email ? ' form-input--error' : ''}`}
                      value={form.email} onChange={fieldChange('email')}
                      autoComplete="email" placeholder="you@example.com"
                    />
                    {errors.email && <span className="form-error" role="alert">{errors.email}</span>}
                  </div>

                  {/* Delivery address (delivery only) */}
                  {deliveryType === 'delivery' && (
                    <>
                      <div className="form-group">
                        <label htmlFor="co-address" className="form-label form-label--required">Delivery Address</label>
                        <input
                          id="co-address" type="text"
                          className={`form-input${errors.address ? ' form-input--error' : ''}`}
                          value={form.address} onChange={fieldChange('address')}
                          autoComplete="street-address" placeholder="123 Main St, New York, NY"
                        />
                        {errors.address && <span className="form-error" role="alert">{errors.address}</span>}
                      </div>
                      <div className="form-group">
                        <label htmlFor="co-apt" className="form-label">
                          Apt / Floor <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
                        </label>
                        <input
                          id="co-apt" type="text" className="form-input"
                          value={form.apt} onChange={fieldChange('apt')}
                          autoComplete="address-line2" placeholder="Apt 4B"
                        />
                      </div>
                    </>
                  )}

                  {/* Special instructions */}
                  <div className="form-group">
                    <label htmlFor="co-notes" className="form-label">
                      Special Instructions <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
                    </label>
                    <textarea
                      id="co-notes" className="form-textarea"
                      value={form.specialInstructions} onChange={fieldChange('specialInstructions')}
                      placeholder="Allergies, spice preferences, extra napkins…" rows={3}
                    />
                  </div>
                </div>

                {/* ── Right: order summary ── */}
                <div className="order-summary">
                  <div className="order-summary__heading">Order Summary</div>

                  {items.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No items in cart.</p>
                  ) : (
                    items.map((item: CartItem) => (
                      <div key={item.cartItemId} className="order-summary__row order-summary__row--item">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="order-summary__thumb"
                            loading="lazy"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div className="order-summary__thumb order-summary__thumb--fallback" aria-hidden="true">
                            {item.name.charAt(0)}
                          </div>
                        )}
                        <span className="order-summary__item-name">
                          {item.qty}&times;&nbsp;{item.name}
                        </span>
                        <span className="order-summary__price">{formatPrice(item.lineTotalCents)}</span>
                      </div>
                    ))
                  )}

                  {/* Applied reward line */}
                  {appliedReward && (
                    <div className="order-summary__row order-summary__row--item order-summary__row--reward">
                      <div className="order-summary__thumb order-summary__thumb--reward" aria-hidden="true">
                        <Gift size={16} />
                      </div>
                      <span className="order-summary__item-name">
                        1&times;&nbsp;{appliedReward.itemName}
                      </span>
                      <span className="order-summary__price order-summary__price--free">Free</span>
                    </div>
                  )}

                  <div className="order-summary__row">
                    <span>Subtotal</span>
                    <span className="order-summary__price">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="order-summary__row">
                    <span>Tax (8.75%)</span>
                    <span className="order-summary__price">{formatPrice(tax)}</span>
                  </div>
                  <div className="order-summary__row">
                    <span>Delivery fee</span>
                    <span className="order-summary__price">{fee === 0 ? 'Free' : formatPrice(fee)}</span>
                  </div>
                  <div className="order-summary__row order-summary__row--total">
                    <span>Total</span>
                    <span className="order-summary__price">{formatPrice(total)}</span>
                  </div>

                  {/* ── Artisan Vault redemption ── */}
                  {auth.token && rewardsSummary && rewardsSummary.unlocked.length > 0 && !appliedReward && (
                    <div className="vault-section">
                      <div className="vault-section__header">
                        <Gift size={14} aria-hidden="true" />
                        <span className="vault-section__title">Artisan Vault</span>
                        <span className="vault-section__balance">{rewardsSummary.balance.toLocaleString()} pts</span>
                      </div>
                      <p className="vault-section__hint">Select a reward to apply to this order:</p>
                      <div className="vault-section__milestones">
                        {rewardsSummary.unlocked.map((m) => (
                          <button
                            key={m.points}
                            type="button"
                            className={`vault-milestone__pill${selectedMilestone?.points === m.points ? ' vault-milestone__pill--selected' : ''}`}
                            onClick={() => setSelectedMilestone(selectedMilestone?.points === m.points ? null : m)}
                          >
                            {m.label}
                            <span className="vault-milestone__pts">· {m.points.toLocaleString()} pts</span>
                          </button>
                        ))}
                      </div>
                      {rewardError && <p className="form-error" role="alert" style={{ marginTop: 'var(--space-2)' }}>{rewardError}</p>}
                      {selectedMilestone && (
                        <button
                          type="button"
                          className="btn btn--secondary vault-section__apply"
                          onClick={handleApplyReward}
                          disabled={rewardLoading}
                        >
                          {rewardLoading ? 'Applying…' : `Apply — ${selectedMilestone.label}`}
                        </button>
                      )}
                    </div>
                  )}

                  {appliedReward && (
                    <div className="vault-section vault-section--applied">
                      <Gift size={14} aria-hidden="true" />
                      <span className="vault-section__applied-label">Reward applied: {appliedReward.itemName}</span>
                      <button type="button" className="vault-section__remove" onClick={handleRemoveReward}>Remove</button>
                    </div>
                  )}

                  {/* ── Promo code ── */}
                  <div className="promo-section">
                    <button
                      type="button"
                      className="promo-section__toggle"
                      onClick={() => { setPromoExpanded((v) => !v); setPromoMsg(null); }}
                      aria-expanded={promoExpanded}
                    >
                      <Tag size={13} aria-hidden="true" />
                      Have a promo code?
                      <ChevronDown size={13} className={`promo-section__chevron${promoExpanded ? ' promo-section__chevron--open' : ''}`} aria-hidden="true" />
                    </button>
                    {promoExpanded && (
                      <form className="promo-section__form" onSubmit={handlePromoSubmit}>
                        <input
                          type="text"
                          className="form-input promo-section__input"
                          value={promoCode}
                          onChange={(e) => { setPromoCode(e.target.value); setPromoMsg(null); }}
                          placeholder="Enter code"
                          aria-label="Promo code"
                        />
                        <button type="submit" className="btn btn--secondary promo-section__btn">Apply</button>
                      </form>
                    )}
                    {promoMsg && <p className="promo-section__msg">{promoMsg}</p>}
                  </div>
                </div>
              </div>

              <div className="modal__footer">
                {globalError && (
                  <p role="alert" style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                    {globalError}
                  </p>
                )}
                <PaymentRequestButton totalCents={total} onPaymentMethod={handlePaymentRequest} />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={screen === 'submitting' || items.length === 0}
                  style={{ width: '100%' }}
                >
                  {screen === 'submitting'
                    ? 'Placing order…'
                    : isStripeEnabled()
                      ? `Continue to Payment · ${formatPrice(total)}`
                      : `Place Order · ${formatPrice(total)}`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
