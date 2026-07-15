// Checkout — parity with web's CartPage details→payment→confirmed steps, but
// with the native Stripe PaymentSheet instead of the web Payment Element.
//
// Flow (identical server contract to web):
//   1. ordersApi.place()      → order row created UNPAID (server computes total)
//   2. paymentsApi.createIntent(order.id) → PaymentIntent clientSecret
//   3. initPaymentSheet + presentPaymentSheet → card entry (test-mode)
//   4. on success the Stripe webhook flips the order to paid/confirmed
// The client never sends an amount; the charge is the stored total_cents.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { PaymentSheetError, useStripe } from '@stripe/stripe-react-native';
import {
  authState,
  cartItems,
  clearCart,
  deliveryFeeCents,
  formatPrice,
  formatSlotTime,
  generateId,
  MIN_ORDER_CENTS,
  orderType,
  deliveryAddress as deliveryAddressStore,
  loadRewards,
  ordersApi,
  paymentsApi,
  rewardsApi,
  scheduledFor,
  slotsApi,
  subtotalCents,
  taxCents,
  totalCents,
  type CartItem,
  type Order,
  type RewardLine,
  type RewardMilestone,
  type RewardsSummary,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { maybePromptAfterFirstOrder } from '../src/lib/notifications';
import { isStripeEnabled, STRIPE_URL_SCHEME } from '../src/lib/stripe';
import { useNano } from '../src/lib/useNano';
import { Field } from '../src/ui/Field';
import { font } from '../src/ui/font';
import { SlotPicker } from '../src/ui/SlotPicker';
import { showToast } from '../src/ui/Toast';

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Form {
  name: string;
  phone: string;
  email: string;
  address: string;
  apt: string;
  specialInstructions: string;
  dropOffInstructions: string;
}
interface Errors {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const auth = useNano(authState);
  const items = useNano(cartItems);
  const subtotal = useNano(subtotalCents);
  const tax = useNano(taxCents);
  const fee = useNano(deliveryFeeCents);
  const total = useNano(totalCents);
  const chosenType = useNano(orderType);
  const savedAddress = useNano(deliveryAddressStore);
  const deliveryType: 'pickup' | 'delivery' = chosenType ?? 'pickup';

  const [form, setForm] = useState<Form>({
    name: '',
    phone: '',
    email: '',
    address: '',
    apt: '',
    specialInstructions: '',
    dropOffInstructions: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Scheduling
  const [whenMode, setWhenMode] = useState<'asap' | 'later'>('asap');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Artisan Vault redemption (parity with web's CartPage vault).
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummary | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<RewardMilestone | null>(null);
  const [appliedReward, setAppliedReward] = useState<RewardLine | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  // Payment / confirmation
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const idempotencyKey = useRef(generateId());

  // Auth guard — checkout is reached signed-in via the cart, but a deep link
  // could land here signed-out.
  useEffect(() => {
    if (!auth.token) router.replace('/signin?next=/checkout');
  }, [auth.token, router]);

  // Pre-fill from the signed-in profile + saved delivery address.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: f.name || (auth.user?.name ?? ''),
      email: f.email || (auth.user?.email ?? ''),
      address: f.address || savedAddress,
    }));
  }, [auth.user, savedAddress]);

  // Fetch the Vault summary once, if signed in, so unlocked rewards can be applied.
  useEffect(() => {
    if (!auth.token) return;
    let cancelled = false;
    rewardsApi
      .getMine(auth.token)
      .then((res) => {
        if (!cancelled) setRewardsSummary(res.rewards);
      })
      .catch(() => {
        /* vault is optional at checkout — silently skip on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Please enter a valid phone number.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    if (deliveryType === 'delivery' && !form.address.trim()) e.address = 'Delivery address is required.';
    return e;
  };

  const buildOrderItems = () => [
    ...items.map((item: CartItem) => ({
      itemId: item.itemId,
      itemName: item.name,
      itemType: item.itemType,
      basePriceCents: item.basePriceCents,
      qty: item.qty,
      selectedOptions: item.selectedOptions ?? [],
      slotChoices: item.slotChoices ?? {},
    })),
    // Redeemed Vault reward rides along as a $0 line (server already debited the
    // points in rewardsApi.redeem) — same shape web appends in CartPage.
    ...(appliedReward
      ? [{
          itemId: appliedReward.itemId,
          itemName: appliedReward.itemName,
          itemType: appliedReward.itemType,
          basePriceCents: 0,
          qty: 1,
          selectedOptions: [],
          slotChoices: {},
        }]
      : []),
  ];

  // Redeem an unlocked milestone → a free reward line. Points are debited
  // server-side immediately (mirrors web); the reward is added to the order.
  const handleApplyReward = async () => {
    if (!auth.token || !selectedMilestone) return;
    setRewardLoading(true);
    setRewardError(null);
    try {
      const res = await rewardsApi.redeem({ milestonePoints: selectedMilestone.points }, auth.token);
      setAppliedReward(res.reward);
      setRewardsSummary((prev) =>
        prev ? { ...prev, balance: prev.balance - selectedMilestone.points } : prev,
      );
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : 'Could not apply reward. Please try again.');
    } finally {
      setRewardLoading(false);
    }
  };

  const finishOrder = (order: Order) => {
    clearCart();
    scheduledFor.set(null);
    setConfirmedOrder(order);
    setPendingOrder(null);
    idempotencyKey.current = generateId();
    // Refresh the global Vault store so the rewards screen reflects the debit
    // (redemption) and any points earned once the order is paid.
    loadRewards();
    // First-order moment: ask to enable push so the customer gets status pushes
    // (confirmed / ready / out-for-delivery). Prompts only once, ever.
    maybePromptAfterFirstOrder();
  };

  // Present the native sheet for an already-created order + intent. Reused for
  // retry after the customer dismisses the sheet (no new order row).
  const presentAndFinish = async (order: Order) => {
    setSubmitting(true);
    setGlobalError(null);
    const { error } = await presentPaymentSheet();
    setSubmitting(false);
    if (error) {
      if (error.code === PaymentSheetError.Canceled) return; // keep order, allow retry
      setGlobalError(error.message ?? 'Payment failed. Please try again.');
      return;
    }
    finishOrder(order);
  };

  const handlePlaceOrder = async () => {
    if (!auth.token) {
      router.replace('/signin?next=/checkout');
      return;
    }
    if (!isStripeEnabled()) {
      setGlobalError('Online payment is temporarily unavailable. Please try again later.');
      return;
    }
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (deliveryType === 'delivery' && subtotal < MIN_ORDER_CENTS) {
      setGlobalError(`Minimum order for delivery is ${formatPrice(MIN_ORDER_CENTS)}.`);
      return;
    }
    const slot = whenMode === 'later' ? selectedSlot : null;
    if (whenMode === 'later' && !slot) {
      setGlobalError('Please choose a time slot, or switch to "As soon as possible".');
      return;
    }

    setSubmitting(true);
    setGlobalError(null);

    // Reserve the slot first (releases if the rest fails).
    if (slot) {
      try {
        await slotsApi.reserve(slot, auth.token);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'That time slot is no longer available.';
        setGlobalError(msg);
        setSelectedSlot(null);
        setSubmitting(false);
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
      ...(form.specialInstructions.trim() && { specialInstructions: form.specialInstructions.trim() }),
      ...(deliveryType === 'delivery' &&
        form.dropOffInstructions.trim() && { dropOffInstructions: form.dropOffInstructions.trim() }),
      scheduledFor: slot,
      idempotencyKey: idempotencyKey.current,
      items: buildOrderItems(),
    };

    try {
      const { order } = await ordersApi.place(payload, auth.token);
      const intent = await paymentsApi.createIntent(order.id, auth.token);
      const initRes = await initPaymentSheet({
        merchantDisplayName: 'Joy Curry & Tandoor',
        paymentIntentClientSecret: intent.clientSecret,
        returnURL: `${STRIPE_URL_SCHEME}://stripe-redirect`,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
      });
      if (initRes.error) {
        setGlobalError(initRes.error.message ?? 'Could not start payment. Please try again.');
        setSubmitting(false);
        return;
      }
      setPendingOrder(order);
      await presentAndFinish(order);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (!auth.token) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Empty cart with no confirmed order (e.g. reached via a stale deep link) —
  // send the customer back to the menu rather than allow a zero-item order.
  if (items.length === 0 && !confirmedOrder) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Checkout' }} />
        <Text style={styles.hint}>Your cart is empty.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.dismissTo('/')}>
          <Text style={styles.primaryBtnLabel}>Browse the menu</Text>
        </Pressable>
      </View>
    );
  }

  // ── Confirmed ──────────────────────────────────────────────────────────────
  if (confirmedOrder) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Order Confirmed', headerBackVisible: false }} />
        <ScrollView contentContainerStyle={styles.confirmBody}>
          <View style={styles.confirmIcon}>
            <Text style={styles.confirmIconGlyph}>✓</Text>
          </View>
          <Text style={styles.confirmTitle}>Order placed!</Text>
          <Text style={styles.confirmOrderId}>Order #{confirmedOrder.id}</Text>
          {!!confirmedOrder.estimatedWaitMin && (
            <Text style={styles.confirmDetail}>
              Estimated wait: <Text style={styles.bold}>{confirmedOrder.estimatedWaitMin} minutes</Text>
            </Text>
          )}
          {whenMode === 'later' && selectedSlot && (
            <Text style={styles.confirmDetail}>
              ⏰ Scheduled for <Text style={styles.bold}>{formatSlotTime(selectedSlot)}</Text>
            </Text>
          )}
          <Text style={styles.confirmDetail}>
            We'll email updates to <Text style={styles.bold}>{form.email.trim()}</Text>
          </Text>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace({ pathname: '/track', params: { id: confirmedOrder.id } })}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnLabel}>Track your order</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.replace('/orders')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnLabel}>View order history</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.dismissTo('/')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnLabel}>Back to menu</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── Details + payment ──────────────────────────────────────────────────────
  const canRetry = pendingOrder !== null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Order type */}
          <Text style={styles.sectionLabel}>Order type</Text>
          <View style={styles.toggle}>
            {(['pickup', 'delivery'] as const).map((t) => {
              const active = deliveryType === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                  onPress={() => orderType.set(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                    {t === 'pickup' ? 'Pickup' : 'Delivery'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {deliveryType === 'pickup' && (
            <View style={styles.pickupCard}>
              <Text style={styles.pickupAddress}>148 E 46th St, New York, NY 10017</Text>
              <Text style={styles.pickupHours}>Mon–Sun · 11:30 AM – 10:00 PM</Text>
            </View>
          )}

          {/* When */}
          <Text style={styles.sectionLabel}>When?</Text>
          <View style={styles.toggle}>
            {(['asap', 'later'] as const).map((m) => {
              const active = whenMode === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                  onPress={() => setWhenMode(m)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                    {m === 'asap' ? 'As soon as possible' : 'Schedule for later'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {whenMode === 'later' && (
            <SlotPicker selected={selectedSlot} onSelect={setSelectedSlot} />
          )}

          {/* Contact */}
          <Text style={styles.sectionLabel}>Your details</Text>
          <Field
            label="Name"
            required
            value={form.name}
            onChangeText={(t) => {
              setForm((f) => ({ ...f, name: t }));
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder="Your full name"
            autoComplete="name"
            error={errors.name}
            editable={!submitting}
          />
          <Field
            label="Phone"
            required
            value={form.phone}
            onChangeText={(t) => {
              setForm((f) => ({ ...f, phone: t }));
              setErrors((e) => ({ ...e, phone: undefined }));
            }}
            placeholder="(212) 555-0100"
            keyboardType="phone-pad"
            autoComplete="tel"
            error={errors.phone}
            editable={!submitting}
          />
          <Field
            label="Email"
            required
            value={form.email}
            onChangeText={(t) => {
              setForm((f) => ({ ...f, email: t }));
              setErrors((e) => ({ ...e, email: undefined }));
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={errors.email}
            editable={!submitting}
          />

          {deliveryType === 'delivery' && (
            <>
              <Field
                label="Delivery address"
                required
                value={form.address}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, address: t }));
                  setErrors((e) => ({ ...e, address: undefined }));
                }}
                placeholder="123 Main St, New York, NY"
                autoComplete="street-address"
                error={errors.address}
                editable={!submitting}
              />
              <Field
                label="Apt / Floor (optional)"
                value={form.apt}
                onChangeText={(t) => setForm((f) => ({ ...f, apt: t }))}
                placeholder="Apt 4B"
                editable={!submitting}
              />
              <Field
                label="Drop-off instructions (optional)"
                value={form.dropOffInstructions}
                onChangeText={(t) => setForm((f) => ({ ...f, dropOffInstructions: t }))}
                placeholder="Leave at door, ring buzzer 4B…"
                editable={!submitting}
              />
            </>
          )}
          <Field
            label="Special instructions (optional)"
            value={form.specialInstructions}
            onChangeText={(t) => setForm((f) => ({ ...f, specialInstructions: t }))}
            placeholder="Allergies, spice preferences, extra napkins…"
            multiline
            style={styles.textarea}
            editable={!submitting}
          />

          {/* Artisan Vault redemption */}
          {rewardsSummary && rewardsSummary.unlocked.length > 0 && (
            <View style={styles.vault}>
              <View style={styles.vaultHeader}>
                <Text style={styles.vaultTitle}>🎁 Artisan Vault</Text>
                <Text style={styles.vaultBalance}>{rewardsSummary.balance.toLocaleString()} pts</Text>
              </View>
              {appliedReward ? (
                <View style={styles.rewardApplied}>
                  <Text style={styles.rewardAppliedName} numberOfLines={1}>
                    {appliedReward.itemName} · Free
                  </Text>
                  <Pressable
                    onPress={() => {
                      setAppliedReward(null);
                      setSelectedMilestone(null);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove reward"
                    disabled={submitting}
                  >
                    <Text style={styles.rewardRemove}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.vaultPills}>
                    {rewardsSummary.unlocked.map((m) => {
                      const on = selectedMilestone?.points === m.points;
                      return (
                        <Pressable
                          key={m.points}
                          style={[styles.vaultPill, on && styles.vaultPillOn]}
                          onPress={() => setSelectedMilestone(on ? null : m)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                        >
                          <Text style={[styles.vaultPillLabel, on && styles.vaultPillLabelOn]}>
                            {m.label} · {m.points.toLocaleString()} pts
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {!!rewardError && <Text style={styles.error}>{rewardError}</Text>}
                  {selectedMilestone && (
                    <Pressable
                      style={[styles.vaultApply, rewardLoading && styles.payBtnDisabled]}
                      onPress={handleApplyReward}
                      disabled={rewardLoading}
                      accessibilityRole="button"
                    >
                      <Text style={styles.vaultApplyLabel}>
                        {rewardLoading ? 'Applying…' : `Apply — ${selectedMilestone.label}`}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}

          {/* Summary */}
          <View style={styles.summary}>
            {items.map((item) => (
              <View key={item.cartItemId} style={styles.summaryRow}>
                <Text style={styles.summaryItem} numberOfLines={1}>
                  {item.qty}× {item.name}
                </Text>
                <Text style={styles.summaryPrice}>{formatPrice(item.lineTotalCents)}</Text>
              </View>
            ))}
            {appliedReward && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryItem} numberOfLines={1}>
                  1× {appliedReward.itemName}
                </Text>
                <Text style={styles.summaryFree}>Free</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (8.75%)</Text>
              <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>{fee === 0 ? 'Free' : formatPrice(fee)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryGrandRow]}>
              <Text style={styles.summaryGrandLabel}>Total</Text>
              <Text style={styles.summaryGrandValue}>{formatPrice(total)}</Text>
            </View>
          </View>

          {!!globalError && <Text style={styles.error}>{globalError}</Text>}
        </ScrollView>

        {/* Sticky pay button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacePx[4]) }]}>
          <Pressable
            style={[styles.payBtn, submitting && styles.payBtnDisabled]}
            onPress={() => (canRetry ? presentAndFinish(pendingOrder) : handlePlaceOrder())}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.payLabel}>
                {canRetry ? 'Retry payment' : 'Pay'} · {formatPrice(total)}
              </Text>
            )}
          </Pressable>
          <Text style={styles.secure}>🔒 Payments are processed securely by Stripe</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
  },
  body: {
    gap: spacePx[3],
    padding: spacePx[4],
    paddingBottom: spacePx[8],
  },

  sectionLabel: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
    marginTop: spacePx[2],
  },
  toggle: {
    flexDirection: 'row',
    gap: spacePx[2],
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacePx[2],
  },
  toggleBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: colors.primary,
    fontFamily: font.bold,
  },
  pickupCard: {
    backgroundColor: colors.bgAlt,
    borderRadius: radiusPx.lg,
    gap: 2,
    padding: spacePx[3],
  },
  pickupAddress: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  pickupHours: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
  },

  vault: {
    backgroundColor: colors.bgAlt,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[2],
    marginTop: spacePx[2],
    padding: spacePx[4],
  },
  vaultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vaultTitle: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  vaultBalance: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  vaultPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacePx[2],
  },
  vaultPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacePx[3],
  },
  vaultPillOn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  vaultPillLabel: {
    color: colors.textSecondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
  },
  vaultPillLabelOn: {
    color: colors.primary,
    fontFamily: font.bold,
  },
  vaultApply: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minHeight: 44,
  },
  vaultApplyLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  rewardApplied: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rewardAppliedName: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  rewardRemove: {
    color: colors.error,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },

  textarea: {
    minHeight: 80,
    paddingTop: spacePx[3],
    textAlignVertical: 'top',
  },

  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[2],
    marginTop: spacePx[2],
    padding: spacePx[4],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  summaryPrice: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  summaryFree: {
    color: colors.success,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  summaryDivider: {
    backgroundColor: colors.borderLight,
    height: 1,
    marginVertical: spacePx[1],
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  summaryGrandRow: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    marginTop: spacePx[1],
    paddingTop: spacePx[2],
  },
  summaryGrandLabel: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx.md,
  },
  summaryGrandValue: {
    color: colors.primary,
    fontFamily: font.black,
    fontSize: fontSizePx.md,
  },

  hint: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  error: {
    color: colors.error,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  bold: {
    fontFamily: font.bold,
  },

  footer: {
    backgroundColor: colors.bg,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    gap: spacePx[1],
    paddingHorizontal: spacePx[4],
    paddingTop: spacePx[3],
  },
  payBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minHeight: 54,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  secure: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
    textAlign: 'center',
  },

  confirmBody: {
    alignItems: 'center',
    gap: spacePx[2],
    padding: spacePx[6],
    paddingTop: spacePx[8],
  },
  confirmIcon: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radiusPx.full,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacePx[2],
    width: 72,
  },
  confirmIconGlyph: {
    color: colors.textInverse,
    fontFamily: font.black,
    fontSize: 40,
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx['2xl'],
  },
  confirmOrderId: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  confirmDetail: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    textAlign: 'center',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[5],
    minHeight: 52,
    paddingHorizontal: spacePx[8],
  },
  primaryBtnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacePx[2],
    minHeight: 48,
    paddingHorizontal: spacePx[8],
  },
  secondaryBtnLabel: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
});
