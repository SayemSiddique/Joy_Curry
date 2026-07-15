// Order history — shared ordersApi.myOrders. Expandable cards show line items +
// price breakdown; Reorder pushes the lines back into the shared cart store and
// routes to the cart (same store the web /orders page reorders into).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  addToCart,
  authState,
  formatDateTime,
  formatPrice,
  ordersApi,
  type CartItem,
  type Order,
  type OrderLineItem,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';
import { showToast } from '../src/ui/Toast';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[] };

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningLight, fg: colors.warning, label: 'Pending' },
  confirmed: { bg: colors.primaryLight, fg: colors.primary, label: 'Confirmed' },
  ready: { bg: colors.successLight, fg: colors.success, label: 'Ready' },
  completed: { bg: colors.bgAlt, fg: colors.textSecondary, label: 'Completed' },
  cancelled: { bg: colors.errorLight, fg: colors.error, label: 'Cancelled' },
};

// The line item's selectedOptions/slotChoices are typed loosely in the shared
// schema (z.record) but at runtime carry the same shapes the cart persisted.
function lineOptions(li: OrderLineItem): NonNullable<CartItem['selectedOptions']> {
  return Array.isArray(li.selectedOptions)
    ? (li.selectedOptions as NonNullable<CartItem['selectedOptions']>)
    : [];
}

export default function OrdersScreen() {
  const router = useRouter();
  const auth = useNano(authState);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = authState.get().token;
    if (!token) {
      router.replace('/signin?next=/orders');
      return;
    }
    setState({ status: 'loading' });
    try {
      const { orders } = await ordersApi.myOrders(token);
      setState({ status: 'ready', orders });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : "Couldn't load your orders.",
      });
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const reorder = (order: Order) => {
    for (const li of order.lineItems) {
      const opts = lineOptions(li);
      addToCart({
        itemId: li.itemId,
        name: li.itemName,
        basePriceCents: li.basePriceCents,
        qty: li.qty,
        lineTotalCents: li.lineTotalCents,
        itemType: li.itemType,
        ...(opts.length > 0 ? { selectedOptions: opts } : {}),
        ...(li.slotChoices ? { slotChoices: li.slotChoices as Record<string, string[]> } : {}),
      });
    }
    showToast('Added to your order');
    router.push('/cart');
  };

  if (!auth.token) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Order History' }} />

      {state.status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading your orders…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.center}>
          <Text style={styles.centerText}>{state.message}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'ready' && state.orders.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyGlyph}>🧾</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.centerText}>Your past orders will show up here.</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.dismissTo('/')}>
            <Text style={styles.retryLabel}>Browse the menu</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'ready' && state.orders.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {state.orders.map((order) => {
            const open = expanded === order.id;
            const badge = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
            return (
              <View key={order.id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => setExpanded(open ? null : order.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Order ${order.id}, ${badge.label}, ${formatPrice(order.totalCents)}`}
                >
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardOrderId}>Order #{order.id}</Text>
                    <Text style={styles.cardDate}>{formatDateTime(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                  </View>
                </Pressable>

                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta}>
                    {order.deliveryType === 'delivery' ? '🛵 Delivery' : '🛍 Pickup'} ·{' '}
                    {order.lineItems.reduce((n, li) => n + li.qty, 0)} item
                    {order.lineItems.reduce((n, li) => n + li.qty, 0) === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.cardTotal}>{formatPrice(order.totalCents)}</Text>
                </View>

                {open && (
                  <View style={styles.detail}>
                    {order.lineItems.map((li) => {
                      const opts = lineOptions(li);
                      return (
                        <View key={li.id} style={styles.detailRow}>
                          <Text style={styles.detailItem} numberOfLines={2}>
                            {li.qty}× {li.itemName}
                            {opts.length > 0 ? `  (${opts.map((o) => o.label).join(', ')})` : ''}
                          </Text>
                          <Text style={styles.detailPrice}>{formatPrice(li.lineTotalCents)}</Text>
                        </View>
                      );
                    })}
                    <View style={styles.detailDivider} />
                    <Breakdown label="Subtotal" value={formatPrice(order.subtotalCents)} />
                    <Breakdown label="Tax" value={formatPrice(order.taxCents)} />
                    <Breakdown
                      label="Delivery fee"
                      value={order.deliveryFeeCents === 0 ? 'Free' : formatPrice(order.deliveryFeeCents)}
                    />
                    <Breakdown label="Total" value={formatPrice(order.totalCents)} grand />
                  </View>
                )}

                <View style={styles.actions}>
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <Pressable
                      style={[styles.actionBtn, styles.trackBtn]}
                      onPress={() => router.push({ pathname: '/track', params: { id: order.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`Track order ${order.id}`}
                    >
                      <Text style={styles.trackLabel}>Track</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.actionBtn, styles.reorderBtn]}
                    onPress={() => reorder(order)}
                    accessibilityRole="button"
                    accessibilityLabel={`Reorder items from order ${order.id}`}
                  >
                    <Text style={styles.reorderLabel}>Reorder</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function Breakdown({ label, value, grand }: { label: string; value: string; grand?: boolean }) {
  return (
    <View style={[styles.breakdownRow, grand && styles.breakdownGrand]}>
      <Text style={[styles.breakdownLabel, grand && styles.breakdownGrandText]}>{label}</Text>
      <Text style={[styles.breakdownValue, grand && styles.breakdownGrandText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacePx[3],
    justifyContent: 'center',
    padding: spacePx[6],
  },
  centerText: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    textAlign: 'center',
  },
  emptyGlyph: {
    fontSize: 48,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.lg,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[2],
    minHeight: 48,
    paddingHorizontal: spacePx[6],
  },
  retryLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },

  list: {
    gap: spacePx[3],
    padding: spacePx[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[2],
    padding: spacePx[4],
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderInfo: {
    gap: 2,
  },
  cardOrderId: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  cardDate: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
  },
  badge: {
    borderRadius: radiusPx.full,
    paddingHorizontal: spacePx[3],
    paddingVertical: spacePx[1],
  },
  badgeText: {
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
  },
  cardMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  cardTotal: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },

  detail: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    gap: spacePx[1],
    paddingTop: spacePx[2],
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacePx[3],
    justifyContent: 'space-between',
  },
  detailItem: {
    color: colors.textSecondary,
    flex: 1,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  detailPrice: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  detailDivider: {
    backgroundColor: colors.borderLight,
    height: 1,
    marginVertical: spacePx[1],
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  breakdownValue: {
    color: colors.textSecondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  breakdownGrand: {
    marginTop: spacePx[1],
  },
  breakdownGrandText: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx.base,
  },

  actions: {
    flexDirection: 'row',
    gap: spacePx[2],
    marginTop: spacePx[1],
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: radiusPx.full,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  trackBtn: {
    backgroundColor: colors.primary,
  },
  trackLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  reorderBtn: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  reorderLabel: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
});
