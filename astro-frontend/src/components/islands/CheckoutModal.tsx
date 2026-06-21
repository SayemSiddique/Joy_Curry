import { useState, useEffect, useRef } from 'react';
import type { ReadableAtom } from 'nanostores';
import {
  cartItems,
  subtotalCents,
  taxCents,
  deliveryFeeCents,
  totalCents,
  checkoutOpen,
  clearCart,
  setDeliveryType,
  type CartItem,
} from '@stores/cart';
import { authState } from '@stores/auth';
import { ordersApi, type Order } from '@lib/api';
import { formatPrice } from '@lib/formatters';
import { showToast } from '@lib/toast';
import { useFocusTrap } from '@lib/hooks';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DeliveryType = 'delivery' | 'pickup';
type Screen = 'form' | 'submitting' | 'confirmed';

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

  const [deliveryType, setLocalDeliveryType] = useState<DeliveryType>('delivery');
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [screen, setScreen] = useState<Screen>('form');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  // Generated once per checkout session; refreshed after a successful order
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, open);

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setLocalDeliveryType(type);
    setDeliveryType(type);
  };

  // Pre-fill name/email from auth state if logged in
  useEffect(() => {
    if (open && auth.user) {
      setForm((f) => ({
        ...f,
        name: f.name || auth.user!.name,
        email: f.email || auth.user!.email,
      }));
    }
  }, [open, auth.user]);

  // After modal closes and user was on confirmed screen, reset for next use
  useEffect(() => {
    if (!open && screen === 'confirmed') {
      const t = setTimeout(() => {
        setScreen('form');
        setForm(EMPTY_FORM);
        setErrors({});
        setGlobalError(null);
        setConfirmedOrder(null);
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
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setScreen('submitting');
    setGlobalError(null);

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
      idempotencyKey: idempotencyKey.current,
      items: items.map((item: CartItem) => ({
        itemId: item.itemId,
        itemName: item.name,
        itemType: item.itemType,
        basePriceCents: item.basePriceCents,
        qty: item.qty,
        selectedOptions: item.selectedOptions ?? [],
        slotChoices: item.slotChoices ?? {},
      })),
    };

    try {
      const res = await ordersApi.place(payload, auth.token ?? '');
      setConfirmedOrder(res.order);
      clearCart();
      idempotencyKey.current = crypto.randomUUID();
      setScreen('confirmed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setGlobalError(msg);
      showToast(msg, 'error');
      setScreen('form');
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
    }, 350);
  };

  const fieldChange =
    (name: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [name]: e.target.value }));
      if (errors[name as keyof Errors])
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

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
                <p className="confirmation__detail">
                  We'll send updates to <strong>{form.email}</strong>
                </p>
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

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal__body modal__body--two-col">
                {/* ── Left: form fields ── */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-5)',
                  }}
                >
                  {/* Order type */}
                  <div className="form-group">
                    <span className="form-label">Order Type</span>
                    <div className="form-radio-group">
                      <label className="form-radio-label">
                        <input
                          type="radio"
                          name="deliveryType"
                          value="delivery"
                          checked={deliveryType === 'delivery'}
                          onChange={() => handleDeliveryTypeChange('delivery')}
                        />
                        Delivery
                      </label>
                      <label className="form-radio-label">
                        <input
                          type="radio"
                          name="deliveryType"
                          value="pickup"
                          checked={deliveryType === 'pickup'}
                          onChange={() => handleDeliveryTypeChange('pickup')}
                        />
                        Pickup
                      </label>
                    </div>
                    {deliveryType === 'pickup' && (
                      <p className="form-hint">
                        Pick up at 148 E 46th St, New York, NY 10017
                      </p>
                    )}
                  </div>

                  {/* Name */}
                  <div className="form-group">
                    <label htmlFor="co-name" className="form-label form-label--required">
                      Name
                    </label>
                    <input
                      id="co-name"
                      type="text"
                      className={`form-input${errors.name ? ' form-input--error' : ''}`}
                      value={form.name}
                      onChange={fieldChange('name')}
                      autoComplete="name"
                      placeholder="Your full name"
                    />
                    {errors.name && (
                      <span className="form-error" role="alert">
                        {errors.name}
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label htmlFor="co-phone" className="form-label form-label--required">
                      Phone
                    </label>
                    <input
                      id="co-phone"
                      type="tel"
                      className={`form-input${errors.phone ? ' form-input--error' : ''}`}
                      value={form.phone}
                      onChange={fieldChange('phone')}
                      autoComplete="tel"
                      placeholder="(212) 555-0100"
                    />
                    {errors.phone && (
                      <span className="form-error" role="alert">
                        {errors.phone}
                      </span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="co-email" className="form-label form-label--required">
                      Email
                    </label>
                    <input
                      id="co-email"
                      type="email"
                      className={`form-input${errors.email ? ' form-input--error' : ''}`}
                      value={form.email}
                      onChange={fieldChange('email')}
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                    {errors.email && (
                      <span className="form-error" role="alert">
                        {errors.email}
                      </span>
                    )}
                  </div>

                  {/* Delivery address (delivery only) */}
                  {deliveryType === 'delivery' && (
                    <>
                      <div className="form-group">
                        <label
                          htmlFor="co-address"
                          className="form-label form-label--required"
                        >
                          Delivery Address
                        </label>
                        <input
                          id="co-address"
                          type="text"
                          className={`form-input${errors.address ? ' form-input--error' : ''}`}
                          value={form.address}
                          onChange={fieldChange('address')}
                          autoComplete="street-address"
                          placeholder="123 Main St, New York, NY"
                        />
                        {errors.address && (
                          <span className="form-error" role="alert">
                            {errors.address}
                          </span>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="co-apt" className="form-label">
                          Apt / Floor{' '}
                          <span
                            style={{
                              fontWeight: 400,
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            (optional)
                          </span>
                        </label>
                        <input
                          id="co-apt"
                          type="text"
                          className="form-input"
                          value={form.apt}
                          onChange={fieldChange('apt')}
                          autoComplete="address-line2"
                          placeholder="Apt 4B"
                        />
                      </div>
                    </>
                  )}

                  {/* Special instructions */}
                  <div className="form-group">
                    <label htmlFor="co-notes" className="form-label">
                      Special Instructions{' '}
                      <span
                        style={{
                          fontWeight: 400,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="co-notes"
                      className="form-textarea"
                      value={form.specialInstructions}
                      onChange={fieldChange('specialInstructions')}
                      placeholder="Allergies, spice preferences, extra napkins…"
                      rows={3}
                    />
                  </div>
                </div>

                {/* ── Right: order summary ── */}
                <div className="order-summary">
                  <div className="order-summary__heading">Order Summary</div>

                  {items.length === 0 ? (
                    <p
                      style={{
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      No items in cart.
                    </p>
                  ) : (
                    items.map((item: CartItem) => (
                      <div key={item.cartItemId} className="order-summary__row">
                        <span>
                          {item.qty}&times;&nbsp;{item.name}
                        </span>
                        <span className="order-summary__price">
                          {formatPrice(item.lineTotalCents)}
                        </span>
                      </div>
                    ))
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
                    <span className="order-summary__price">
                      {fee === 0 ? 'Free' : formatPrice(fee)}
                    </span>
                  </div>
                  <div className="order-summary__row order-summary__row--total">
                    <span>Total</span>
                    <span className="order-summary__price">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <div className="modal__footer">
                {globalError && (
                  <p
                    role="alert"
                    style={{
                      color: 'var(--color-error)',
                      fontSize: 'var(--text-sm)',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    {globalError}
                  </p>
                )}
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={screen === 'submitting' || items.length === 0}
                  style={{ width: '100%' }}
                >
                  {screen === 'submitting'
                    ? 'Placing order…'
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
