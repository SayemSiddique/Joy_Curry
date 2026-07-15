// Order tracking — native parity with web's OrderTrackPage. Polls
// ordersApi.getById every 30s, maps order.status to 4 stages, and stops polling
// once the order reaches a terminal state (completed / cancelled). Reached with
// ?id=<orderId> from the checkout confirmation and the order-history list.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { authState, formatPrice, ordersApi, type Order } from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';

const PICKUP_ADDRESS = '148 E 46th St, New York, NY 10017';

function stages(deliveryType: 'delivery' | 'pickup') {
  return [
    { id: 'placed', label: 'Order Placed', glyph: '✓' },
    { id: 'kitchen', label: 'In the Kitchen', glyph: '👨‍🍳' },
    { id: 'ready', label: 'Ready', glyph: '🔔' },
    {
      id: 'final',
      label: deliveryType === 'delivery' ? 'Out for Delivery' : 'Ready to Collect',
      glyph: deliveryType === 'delivery' ? '🛵' : '🛍',
    },
  ];
}

function statusToStageIdx(status: Order['status']): number {
  switch (status) {
    case 'pending':   return 0;
    case 'confirmed': return 1;
    case 'ready':     return 2;
    case 'completed': return 3;
    case 'cancelled': return -1;
    default:          return 0;
  }
}

export default function TrackScreen() {
  const router = useRouter();
  const auth = useNano(authState);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const token = authState.get().token;
    if (!token) {
      router.replace('/signin?next=/orders');
      return;
    }
    if (!id) {
      setError('No order specified.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchOrder() {
      try {
        const res = await ordersApi.getById(id!, token!);
        if (cancelled) return;
        setOrder(res.order);
        setError(null);
        if (res.order.status === 'completed' || res.order.status === 'cancelled') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        if (!cancelled) setError('Unable to load order. Pull to retry or check back soon.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrder();
    intervalRef.current = setInterval(fetchOrder, 30_000);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auth.token, id, router]);

  if (!auth.token) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Track Order' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading your order…</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Track Order' }} />
        <View style={styles.center}>
          <Text style={styles.centerText}>{error ?? 'Order not found.'}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/orders')}>
            <Text style={styles.primaryBtnLabel}>View order history</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const list = stages(order.deliveryType);
  const stageIdx = statusToStageIdx(order.status);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Track Order' }} />
      <ScrollView contentContainerStyle={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isCancelled ? 'Order Cancelled' : list[stageIdx]?.label ?? 'Tracking'}
          </Text>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          {!isCancelled && !!order.estimatedWaitMin && stageIdx < 3 && (
            <Text style={styles.eta}>
              Est. wait: <Text style={styles.bold}>{order.estimatedWaitMin} min</Text>
            </Text>
          )}
          {stageIdx === 3 && !isCancelled && (
            <Text style={styles.finalMsg}>
              {order.deliveryType === 'delivery'
                ? 'Your food is on its way!'
                : "Your order is ready at the counter — see you soon!"}
            </Text>
          )}
        </View>

        {/* Stage progress (vertical stepper) */}
        {!isCancelled && (
          <View style={styles.stages}>
            {list.map((stage, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx;
              return (
                <View key={stage.id} style={styles.stageRow}>
                  <View style={styles.stageRail}>
                    <View
                      style={[
                        styles.stageDot,
                        done && styles.stageDotDone,
                        active && styles.stageDotActive,
                      ]}
                    >
                      <Text style={styles.stageDotGlyph}>
                        {done ? '✓' : active ? '●' : ''}
                      </Text>
                    </View>
                    {i < list.length - 1 && (
                      <View style={[styles.connector, done && styles.connectorDone]} />
                    )}
                  </View>
                  <View style={styles.stageBody}>
                    <Text
                      style={[
                        styles.stageLabel,
                        (done || active) && styles.stageLabelOn,
                      ]}
                    >
                      {stage.glyph}  {stage.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Summary */}
        <View style={styles.summary}>
          <Row label="Total paid" value={formatPrice(order.totalCents)} strong />
          <Row
            label="Order type"
            value={order.deliveryType === 'delivery' ? '🛵 Delivery' : '🛍 Pickup'}
          />
          {order.deliveryType === 'delivery' && order.deliveryAddress ? (
            <Row label="Delivering to" value={order.deliveryAddress} />
          ) : order.deliveryType === 'pickup' ? (
            <Row label="Pickup at" value={PICKUP_ADDRESS} />
          ) : null}
          {!!order.dropOffInstructions && (
            <Row label="Drop-off" value={order.dropOffInstructions} />
          )}
        </View>

        <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/orders')}>
          <Text style={styles.secondaryBtnLabel}>View order history</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]} numberOfLines={2}>
        {value}
      </Text>
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
  body: {
    gap: spacePx[5],
    padding: spacePx[4],
  },

  header: {
    alignItems: 'center',
    gap: spacePx[1],
    paddingTop: spacePx[2],
  },
  title: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx['2xl'],
    textAlign: 'center',
  },
  orderId: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  eta: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
  },
  finalMsg: {
    color: colors.primary,
    fontFamily: font.medium,
    fontSize: fontSizePx.base,
    marginTop: spacePx[1],
    textAlign: 'center',
  },
  bold: {
    fontFamily: font.bold,
  },

  stages: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    padding: spacePx[4],
  },
  stageRow: {
    flexDirection: 'row',
    gap: spacePx[3],
  },
  stageRail: {
    alignItems: 'center',
    width: 32,
  },
  stageDot: {
    alignItems: 'center',
    backgroundColor: colors.bgAlt,
    borderColor: colors.border,
    borderRadius: radiusPx.full,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stageDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stageDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stageDotGlyph: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  connector: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 28,
    width: 2,
  },
  connectorDone: {
    backgroundColor: colors.success,
  },
  stageBody: {
    flex: 1,
    paddingBottom: spacePx[4],
    paddingTop: spacePx[1],
  },
  stageLabel: {
    color: colors.textMuted,
    fontFamily: font.medium,
    fontSize: fontSizePx.base,
  },
  stageLabelOn: {
    color: colors.textPrimary,
    fontFamily: font.bold,
  },

  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[2],
    padding: spacePx[4],
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacePx[3],
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  summaryValue: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
    textAlign: 'right',
  },
  summaryValueStrong: {
    fontFamily: font.bold,
  },

  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[2],
    minHeight: 48,
    paddingHorizontal: spacePx[6],
  },
  primaryBtnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtnLabel: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
});
