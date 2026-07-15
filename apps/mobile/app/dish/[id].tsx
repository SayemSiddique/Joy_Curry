// S9 dish detail (modal): modifiers + size options + qty, with the SAME price
// math as the web DishDetailModal — unit = base + selected option deltas,
// lineTotal = unit × qty. Also serves as the cart's edit screen (cartItemId
// param), updating the line in place like the web dish:edit flow.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  addToCart,
  formatPrice,
  updateCartItem,
  type MenuItem,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { getItem, imageUri, loadMenu } from '../../src/lib/menu';
import { DietBadges, SpiceMeter } from '../../src/ui/Badges';
import { font } from '../../src/ui/font';
import { QtyStepper } from '../../src/ui/QtyStepper';
import { showToast } from '../../src/ui/Toast';

// A non-default size is carried through the cart as a selectedOption whose
// delta re-bases the unit price (size.priceCents − basePriceCents), so the
// shared CartItem shape and cart math stay unchanged. Default size = no
// option = web-identical payload.
const SIZE_OPTION_PREFIX = 'size:';

export default function DishDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    cartItemId?: string;
    qty?: string;
    sel?: string;
  }>();
  const editingCartItemId = params.cartItemId ?? null;

  const [item, setItem] = useState<MenuItem | null>(() => getItem(params.id) ?? null);
  const [failed, setFailed] = useState(false);
  const [qty, setQty] = useState(() => Math.max(1, parseInt(params.qty ?? '1', 10) || 1));
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    params.sel ? params.sel.split(',').filter(Boolean) : [],
  );

  useEffect(() => {
    if (item) return;
    loadMenu()
      .then(() => {
        const found = getItem(params.id);
        if (found) setItem(found);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [item, params.id]);

  const modifiers = item?.modifiers ?? [];
  const sizeOptions = item?.sizeOptions ?? [];

  // Default size = the option priced at basePriceCents (what web charges).
  const defaultSizeIdx = useMemo(() => {
    if (!item || sizeOptions.length === 0) return -1;
    const match = sizeOptions.findIndex((s) => s.priceCents === item.basePriceCents);
    return match >= 0 ? match : 0;
  }, [item, sizeOptions]);

  const selectedSizeIdx = useMemo(() => {
    const sel = selectedIds.find((id) => id.startsWith(SIZE_OPTION_PREFIX));
    if (!sel) return defaultSizeIdx;
    const idx = sizeOptions.findIndex((s) => SIZE_OPTION_PREFIX + s.label === sel);
    return idx >= 0 ? idx : defaultSizeIdx;
  }, [selectedIds, sizeOptions, defaultSizeIdx]);

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>This dish is no longer available.</Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryLabel}>Back to menu</Text>
        </Pressable>
      </View>
    );
  }
  if (!item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedMods = modifiers.filter((m) => selectedIds.includes(m.id));
  const sizeDeltaCents =
    selectedSizeIdx >= 0 && selectedSizeIdx !== defaultSizeIdx
      ? sizeOptions[selectedSizeIdx].priceCents - item.basePriceCents
      : 0;
  const unitPriceCents =
    item.basePriceCents +
    sizeDeltaCents +
    selectedMods.reduce((sum, m) => sum + m.priceDeltaCents, 0);
  const totalCents = unitPriceCents * qty;

  const toggleModifier = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );

  const chooseSize = (idx: number) =>
    setSelectedIds((prev) => {
      const rest = prev.filter((id) => !id.startsWith(SIZE_OPTION_PREFIX));
      // Default size adds no option — keeps the payload identical to web.
      if (idx === defaultSizeIdx) return rest;
      return [...rest, SIZE_OPTION_PREFIX + sizeOptions[idx].label];
    });

  const handleAdd = () => {
    const optionPayload = [
      ...(sizeDeltaCents !== 0 || selectedSizeIdx !== defaultSizeIdx
        ? [
            {
              id: SIZE_OPTION_PREFIX + sizeOptions[selectedSizeIdx].label,
              label: `Size: ${sizeOptions[selectedSizeIdx].label}`,
              priceDeltaCents: sizeDeltaCents,
            },
          ]
        : []),
      ...selectedMods.map((m) => ({
        id: m.id,
        label: m.label,
        priceDeltaCents: m.priceDeltaCents,
      })),
    ];

    const payload = {
      itemId: item.id,
      name: item.name,
      basePriceCents: item.basePriceCents,
      qty,
      lineTotalCents: totalCents,
      imageUrl: item.imageUrl,
      itemType: 'regular' as const,
      // Same rule as web: only customizable items carry selectedOptions
      // (its presence is what marks a cart line as editable).
      ...(modifiers.length > 0 || sizeOptions.length > 0
        ? { selectedOptions: optionPayload }
        : {}),
    };

    if (editingCartItemId) {
      updateCartItem(editingCartItemId, payload);
      router.back();
      return;
    }
    addToCart(payload);
    showToast('Added to your order');
    router.back();
  };

  const uri = imageUri(item.imageUrl);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View>
          {uri ? (
            <Image source={{ uri }} style={styles.hero} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.hero, styles.heroFallback]}>
              <Text style={styles.heroGlyph}>🍛</Text>
            </View>
          )}
          <Pressable
            style={[styles.closeBtn, { top: spacePx[3] }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close dish detail"
            hitSlop={8}
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>{formatPrice(item.basePriceCents)}</Text>
          {!!item.description && <Text style={styles.desc}>{item.description}</Text>}

          <SpiceMeter level={item.spiceLevel} />
          <DietBadges item={item} />

          {!!item.servedWith && (
            <Text style={styles.servedWith}>
              <Text style={styles.servedWithLabel}>Served with: </Text>
              {item.servedWith}
            </Text>
          )}

          {item.allergens?.length > 0 && (
            <View style={styles.allergens}>
              <Text style={styles.allergensLabel}>⚠ Contains:</Text>
              {item.allergens.map((a) => (
                <View key={a} style={styles.allergenChip}>
                  <Text style={styles.allergenText}>{a}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Size options */}
          {sizeOptions.length > 0 && (
            <View style={styles.optionGroup}>
              <Text style={styles.optionGroupLabel}>Size</Text>
              {sizeOptions.map((s, idx) => {
                const checked = idx === selectedSizeIdx;
                return (
                  <Pressable
                    key={s.label}
                    style={[styles.option, checked && styles.optionSelected]}
                    onPress={() => chooseSize(idx)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked }}
                  >
                    <View style={[styles.radio, checked && styles.radioChecked]}>
                      {checked && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.optionName}>{s.label}</Text>
                    <Text style={styles.optionPrice}>{formatPrice(s.priceCents)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Modifiers */}
          {modifiers.length > 0 && (
            <View style={styles.optionGroup}>
              <Text style={styles.optionGroupLabel}>Customise</Text>
              {modifiers.map((m) => {
                const checked = selectedIds.includes(m.id);
                return (
                  <Pressable
                    key={m.id}
                    style={[styles.option, checked && styles.optionSelected]}
                    onPress={() => toggleModifier(m.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.optionName}>{m.label}</Text>
                    {m.priceDeltaCents !== 0 && (
                      <Text style={styles.optionPrice}>
                        {m.priceDeltaCents > 0 ? '+' : ''}
                        {formatPrice(m.priceDeltaCents)}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Quantity */}
          <View style={styles.qtyRow}>
            <Text style={styles.optionGroupLabel}>Qty</Text>
            <QtyStepper qty={qty} onChange={setQty} label={`Quantity for ${item.name}`} />
          </View>
        </View>
      </ScrollView>

      {/* Sticky add/save button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacePx[4]) }]}>
        <Pressable
          style={[styles.addBtn, !item.inStock && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!item.inStock}
          accessibilityRole="button"
        >
          <Text style={styles.addBtnLabel}>
            {item.inStock
              ? `${editingCartItemId ? 'Save Changes' : 'Add to Order'} · ${formatPrice(totalCents)}`
              : 'Sold Out'}
          </Text>
        </Pressable>
      </View>
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
    backgroundColor: colors.bg,
    flex: 1,
    gap: spacePx[4],
    justifyContent: 'center',
    padding: spacePx[6],
  },
  centerText: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radiusPx.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacePx[6],
  },
  retryLabel: {
    color: colors.textInverse,
    fontFamily: font.medium,
    fontSize: fontSizePx.base,
  },

  hero: {
    height: 240,
    width: '100%',
  },
  heroFallback: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
  },
  heroGlyph: {
    fontSize: 64,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radiusPx.full,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: spacePx[3],
    width: 36,
  },
  closeGlyph: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },

  body: {
    gap: spacePx[3],
    padding: spacePx[4],
  },
  name: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx['2xl'],
  },
  price: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.lg,
  },
  desc: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    lineHeight: 22,
  },
  servedWith: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  servedWithLabel: {
    fontFamily: font.bold,
  },
  allergens: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacePx[2],
  },
  allergensLabel: {
    color: colors.warning,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  allergenChip: {
    backgroundColor: colors.warningLight,
    borderRadius: radiusPx.full,
    paddingHorizontal: spacePx[2],
    paddingVertical: 2,
  },
  allergenText: {
    color: colors.warning,
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
  },

  optionGroup: {
    gap: spacePx[2],
    marginTop: spacePx[2],
  },
  optionGroupLabel: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacePx[3],
    minHeight: 52,
    paddingHorizontal: spacePx[4],
    paddingVertical: spacePx[2],
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radiusPx.sm,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
  },
  radio: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radiusPx.full,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioChecked: {
    borderColor: colors.primary,
  },
  radioDot: {
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    height: 10,
    width: 10,
  },
  optionName: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: font.medium,
    fontSize: fontSizePx.base,
  },
  optionPrice: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },

  qtyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacePx[2],
  },

  footer: {
    backgroundColor: colors.bg,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacePx[4],
    paddingTop: spacePx[3],
    position: 'absolute',
    right: 0,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minHeight: 54,
  },
  addBtnDisabled: {
    backgroundColor: colors.textMuted,
  },
  addBtnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
});
