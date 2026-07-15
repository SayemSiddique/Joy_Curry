// S9 cart screen — driven entirely by the SHARED cart store, so subtotal/tax/
// fee/total are the same computed values the web drawer and checkout show:
// cent-exact parity by construction. Checkout itself lands in S10.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  addToCart,
  authState,
  cartItems,
  deliveryFeeCents,
  formatPrice,
  getUpsells,
  subtotalCents,
  taxCents,
  totalCents,
  updateQty,
  type CartItem,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { imageUri } from '../src/lib/menu';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';
import { QtyStepper } from '../src/ui/QtyStepper';
import { showToast } from '../src/ui/Toast';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useNano(cartItems);
  const subtotal = useNano(subtotalCents);
  const tax = useNano(taxCents);
  const fee = useNano(deliveryFeeCents);
  const total = useNano(totalCents);

  const handleEdit = (item: CartItem) => {
    if (item.itemType === 'bundle') {
      router.push({
        pathname: '/bundle/[id]',
        params: {
          id: item.itemId,
          cartItemId: item.cartItemId,
          qty: String(item.qty),
          sel: JSON.stringify(item.slotSelectionIds ?? {}),
        },
      });
      return;
    }
    router.push({
      pathname: '/dish/[id]',
      params: {
        id: item.itemId,
        cartItemId: item.cartItemId,
        qty: String(item.qty),
        sel: (item.selectedOptions ?? []).map((o) => o.id).join(','),
      },
    });
  };

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyGlyph}>🛍</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add something delicious from the menu!</Text>
        <Pressable style={styles.emptyBtn} onPress={() => router.back()}>
          <Text style={styles.emptyBtnLabel}>Browse the menu</Text>
        </Pressable>
      </View>
    );
  }

  const upsells = getUpsells(items);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body}>
        {items.map((item) => {
          const editable = item.itemType === 'bundle' || item.selectedOptions !== undefined;
          const uri = imageUri(item.imageUrl);
          const subParts: string[] = [];
          if (item.selectedOptions?.length)
            subParts.push(item.selectedOptions.map((o) => o.label).join(', '));
          if (item.slotChoices && Object.keys(item.slotChoices).length > 0)
            subParts.push(Object.values(item.slotChoices).flat().join(', '));
          return (
            <View key={item.cartItemId} style={styles.line}>
              <View style={styles.lineTop}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.thumb}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={item.cartItemId}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text>🍛</Text>
                  </View>
                )}
                <View style={styles.lineInfo}>
                  <Text style={styles.lineName}>{item.name}</Text>
                  {subParts.map((p, i) => (
                    <Text key={i} style={styles.lineSub} numberOfLines={2}>
                      {p}
                    </Text>
                  ))}
                  {editable && (
                    <Pressable
                      onPress={() => handleEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.name}`}
                      hitSlop={8}
                    >
                      <Text style={styles.editLink}>Edit</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              <View style={styles.lineBottom}>
                <QtyStepper
                  qty={item.qty}
                  min={0}
                  onChange={(q) => updateQty(item.cartItemId, q)}
                  label={`Quantity for ${item.name}`}
                />
                <Text style={styles.linePrice}>{formatPrice(item.lineTotalCents)}</Text>
              </View>
            </View>
          );
        })}

        {/* Smart upsells (shared rule table) */}
        {upsells.length > 0 && (
          <View style={styles.upsells}>
            <Text style={styles.upsellsHeading}>Pairs perfectly with your order</Text>
            {upsells.map((u) => (
              <View key={u.itemId} style={styles.upsellRow}>
                <Text style={styles.upsellEmoji}>{u.emoji}</Text>
                <View style={styles.upsellInfo}>
                  <Text style={styles.upsellName}>{u.name}</Text>
                  <Text style={styles.upsellReason}>{u.reason}</Text>
                </View>
                <Pressable
                  style={styles.upsellAdd}
                  onPress={() => {
                    addToCart({
                      itemId: u.itemId,
                      name: u.name,
                      basePriceCents: u.priceCents,
                      qty: 1,
                      lineTotalCents: u.priceCents,
                      itemType: 'regular',
                    });
                    showToast('Added to your order');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${u.name} to cart`}
                >
                  <Text style={styles.upsellAddLabel}>+ Add · {formatPrice(u.priceCents)}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Totals — same computed stores as web */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (8.75%)</Text>
            <Text style={styles.totalValue}>{formatPrice(tax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery fee</Text>
            <Text style={styles.totalValue}>{fee === 0 ? 'Free' : formatPrice(fee)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowGrand]}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacePx[4]) }]}>
        <Pressable
          style={styles.checkoutBtn}
          onPress={() =>
            authState.get().token
              ? router.push('/checkout')
              : router.push('/signin?next=/checkout')
          }
          accessibilityRole="button"
        >
          <Text style={styles.checkoutLabel}>Checkout · {formatPrice(total)}</Text>
        </Pressable>
        <Text style={styles.checkoutNote}>🔒 Secure checkout · pay by card</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    gap: spacePx[3],
    justifyContent: 'center',
    padding: spacePx[6],
  },
  emptyGlyph: {
    fontSize: 48,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[3],
    minHeight: 48,
    paddingHorizontal: spacePx[8],
  },
  emptyBtnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },

  body: {
    gap: spacePx[3],
    padding: spacePx[4],
    paddingBottom: spacePx[8],
  },
  line: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[3],
    padding: spacePx[3],
  },
  lineTop: {
    flexDirection: 'row',
    gap: spacePx[3],
  },
  thumb: {
    borderRadius: radiusPx.lg,
    height: 64,
    width: 64,
  },
  thumbFallback: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
  },
  lineInfo: {
    flex: 1,
    gap: 2,
  },
  lineName: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  lineSub: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  editLink: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
    marginTop: 2,
    paddingVertical: spacePx[1],
    textDecorationLine: 'underline',
  },
  lineBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linePrice: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },

  upsells: {
    backgroundColor: colors.bgAlt,
    borderRadius: radiusPx.xl,
    gap: spacePx[2],
    padding: spacePx[3],
  },
  upsellsHeading: {
    color: colors.textSecondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  upsellRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacePx[3],
  },
  upsellEmoji: {
    fontSize: fontSizePx.lg,
  },
  upsellInfo: {
    flex: 1,
  },
  upsellName: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  upsellReason: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
  },
  upsellAdd: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacePx[3],
  },
  upsellAddLabel: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
  },

  totals: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[2],
    padding: spacePx[4],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  totalValue: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  totalRowGrand: {
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    marginTop: spacePx[1],
    paddingTop: spacePx[2],
  },
  grandLabel: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx.md,
  },
  grandValue: {
    color: colors.primary,
    fontFamily: font.black,
    fontSize: fontSizePx.md,
  },

  footer: {
    backgroundColor: colors.bg,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    gap: spacePx[1],
    paddingHorizontal: spacePx[4],
    paddingTop: spacePx[3],
  },
  checkoutBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minHeight: 54,
  },
  checkoutLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  checkoutNote: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
    textAlign: 'center',
  },
});
