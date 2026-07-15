// S9 bundle (Joy Combos / Dinner Specials) slot picker — mobile counterpart of
// the web BundleModal. Same rules: smart defaults pre-fill every slot, radio
// for choose-1 / capped checkboxes for choose-N, and the cart line is
// basePriceCents × qty with slotChoices (labels→names) + slotSelectionIds.
import { useEffect, useMemo, useState } from 'react';
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
  buildDefaultSelections,
  BUNDLE_MAP,
  formatPrice,
  updateCartItem,
  type BundleSlot,
  type MenuItem,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { getItem, imageUri, loadMenu } from '../../src/lib/menu';
import { font } from '../../src/ui/font';
import { QtyStepper } from '../../src/ui/QtyStepper';
import { showToast } from '../../src/ui/Toast';

function prettyLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function BundleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    cartItemId?: string;
    qty?: string;
    sel?: string;
  }>();
  const editingCartItemId = params.cartItemId ?? null;

  const definition = BUNDLE_MAP.get(params.id);
  const [menuReady, setMenuReady] = useState(() => getItem(params.id) !== undefined);
  const [failed, setFailed] = useState(false);
  const [qty, setQty] = useState(() => Math.max(1, parseInt(params.qty ?? '1', 10) || 1));
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [slotSelections, setSlotSelections] = useState<Record<string, string[]>>(() => {
    if (params.sel) {
      try {
        return JSON.parse(params.sel) as Record<string, string[]>;
      } catch {
        // fall through to defaults
      }
    }
    return definition ? buildDefaultSelections(definition) : {};
  });

  useEffect(() => {
    if (menuReady) return;
    loadMenu()
      .then(() => setMenuReady(true))
      .catch(() => setFailed(true));
  }, [menuReady]);

  const item: MenuItem | undefined = menuReady ? getItem(params.id) : undefined;

  if (!definition || failed || (menuReady && !item)) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>This combo is no longer available.</Text>
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

  const nameOf = (id: string) => getItem(id)?.name ?? id;

  const handleSlotChange = (slotId: string, optionId: string, choose: number) => {
    setSlotSelections((prev) => {
      const current = prev[slotId] ?? [];
      if (choose === 1) return { ...prev, [slotId]: [optionId] };
      if (current.includes(optionId)) {
        return { ...prev, [slotId]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= choose) return prev;
      return { ...prev, [slotId]: [...current, optionId] };
    });
  };

  const slotIsComplete = (slot: BundleSlot) =>
    (slotSelections[slot.id]?.length ?? 0) === slot.choose;
  const incompleteSlots = definition.slots.filter((s) => !slotIsComplete(s));
  const isValid = incompleteSlots.length === 0;
  const remainingChoices = incompleteSlots.reduce(
    (sum, s) => sum + (s.choose - (slotSelections[s.id]?.length ?? 0)),
    0,
  );

  const priceCents = item.basePriceCents * qty;

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    if (!isValid) return;

    const slotChoices: Record<string, string[]> = {};
    for (const slot of definition.slots) {
      slotChoices[slot.label] = (slotSelections[slot.id] ?? []).map(nameOf);
    }
    if (definition.fixedItemIds.length > 0) {
      slotChoices['Included'] = definition.fixedItemIds.map(nameOf);
    }

    const payload = {
      itemId: item.id,
      name: item.name,
      basePriceCents: item.basePriceCents,
      qty,
      lineTotalCents: item.basePriceCents * qty,
      imageUrl: item.imageUrl,
      slotChoices,
      slotSelectionIds: { ...slotSelections },
      itemType: 'bundle' as const,
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close combo options"
          hitSlop={8}
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Always included */}
        {definition.includes.length > 0 && (
          <View style={styles.includes}>
            <Text style={styles.includesLabel}>Always included:</Text>
            {definition.includes.map((inc) => (
              <View key={inc} style={styles.includesTag}>
                <Text style={styles.includesTagText}>{inc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Fixed items */}
        {definition.fixedItemIds.length > 0 && (
          <View style={styles.fixed}>
            <Text style={styles.fixedLabel}>Fixed items included</Text>
            {definition.fixedItemIds.map((id) => (
              <Text key={id} style={styles.fixedItem}>
                ✓ {nameOf(id)}
              </Text>
            ))}
          </View>
        )}

        {definition.slots.map((slot) => (
          <SlotSection
            key={slot.id}
            slot={slot}
            selections={slotSelections[slot.id] ?? []}
            invalid={attemptedSubmit && !slotIsComplete(slot)}
            onToggle={(optionId) => handleSlotChange(slot.id, optionId, slot.choose)}
          />
        ))}

        {definition.slots.length === 0 && definition.fixedItemIds.length > 0 && (
          <Text style={styles.fixedNote}>No choices needed — all items are included above.</Text>
        )}
      </ScrollView>

      {/* Footer: qty + validity + add */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacePx[4]) }]}>
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Qty</Text>
          <QtyStepper qty={qty} onChange={setQty} label={`Quantity for ${item.name}`} />
        </View>
        <Text
          style={[styles.validity, isValid && styles.validityOk]}
          accessibilityLiveRegion="polite"
        >
          {isValid
            ? '✓ Your combo is ready'
            : `Select ${remainingChoices} more ${remainingChoices === 1 ? 'item' : 'items'} to continue`}
        </Text>
        <Pressable
          style={[styles.addBtn, !isValid && styles.addBtnDim]}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.addBtnLabel}>
            {editingCartItemId ? 'Save Changes' : 'Add to Order'} — {formatPrice(priceCents)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Slot section ─────────────────────────────────────────────────────────────

function SlotSection({
  slot,
  selections,
  invalid,
  onToggle,
}: {
  slot: BundleSlot;
  selections: string[];
  invalid: boolean;
  onToggle: (optionId: string) => void;
}) {
  const isRadio = slot.choose === 1;
  const filled = selections.length;
  const complete = filled === slot.choose;

  // Group options by subcategory, preserving definition order (web parity).
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const id of slot.optionIds) {
      const sub = getItem(id)?.subcategory ?? '';
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(id);
    }
    return [...map.entries()];
  }, [slot.optionIds]);
  const showGroupHeadings = groups.length > 1;

  return (
    <View style={[styles.slot, invalid && styles.slotInvalid]}>
      <View style={styles.slotHeader}>
        <Text style={styles.slotLabel}>{slot.label}</Text>
        <Text style={[styles.slotProgress, complete && styles.slotProgressDone]}>
          {complete ? `✓ ${filled} of ${slot.choose}` : `${filled} of ${slot.choose} chosen`}
        </Text>
      </View>
      {invalid && (
        <Text style={styles.slotError} accessibilityLiveRegion="assertive">
          Choose {slot.choose - filled} more from {slot.label}.
        </Text>
      )}

      {groups.map(([sub, ids]) => (
        <View key={sub || '_'} style={styles.slotGroup}>
          {showGroupHeadings && !!sub && (
            <Text style={styles.groupHeading}>{prettyLabel(sub)}</Text>
          )}
          {ids.map((id) => {
            const option = getItem(id);
            const checked = selections.includes(id);
            const atLimit = !isRadio && !checked && filled >= slot.choose;
            const uri = imageUri(option?.imageUrl);
            return (
              <Pressable
                key={id}
                style={[
                  styles.option,
                  checked && styles.optionSelected,
                  atLimit && styles.optionDisabled,
                ]}
                onPress={() => onToggle(id)}
                disabled={atLimit}
                accessibilityRole={isRadio ? 'radio' : 'checkbox'}
                accessibilityState={{ checked, disabled: atLimit }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.optionImg}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={id}
                  />
                ) : (
                  <View style={[styles.optionImg, styles.optionImgFallback]}>
                    <Text>🍛</Text>
                  </View>
                )}
                <Text style={styles.optionName} numberOfLines={1}>
                  {option?.name ?? id}
                </Text>
                <View
                  style={[
                    isRadio ? styles.radio : styles.checkbox,
                    checked && (isRadio ? styles.radioChecked : styles.checkboxChecked),
                  ]}
                >
                  {checked &&
                    (isRadio ? (
                      <View style={styles.radioDot} />
                    ) : (
                      <Text style={styles.checkboxTick}>✓</Text>
                    ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
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

  header: {
    alignItems: 'center',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacePx[3],
    paddingHorizontal: spacePx[4],
    paddingVertical: spacePx[3],
  },
  headerTitle: {
    color: colors.primary,
    flex: 1,
    fontFamily: font.black,
    fontSize: fontSizePx.lg,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: colors.bgAlt,
    borderRadius: radiusPx.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  closeGlyph: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },

  body: {
    gap: spacePx[4],
    padding: spacePx[4],
    paddingBottom: spacePx[8],
  },
  includes: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacePx[2],
  },
  includesLabel: {
    color: colors.textSecondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  includesTag: {
    backgroundColor: colors.primaryLight,
    borderRadius: radiusPx.full,
    paddingHorizontal: spacePx[3],
    paddingVertical: 4,
  },
  includesTagText: {
    color: colors.primary,
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
  },
  fixed: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    gap: spacePx[1],
    padding: spacePx[3],
  },
  fixedLabel: {
    color: colors.textMuted,
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
    textTransform: 'uppercase',
  },
  fixedItem: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  fixedNote: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },

  slot: {
    gap: spacePx[2],
  },
  slotInvalid: {
    backgroundColor: colors.errorLight,
    borderColor: colors.error,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    padding: spacePx[2],
  },
  slotHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotLabel: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  slotProgress: {
    color: colors.textMuted,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  slotProgressDone: {
    color: colors.success,
  },
  slotError: {
    color: colors.error,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  slotGroup: {
    gap: spacePx[2],
  },
  groupHeading: {
    color: colors.textMuted,
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
    marginTop: spacePx[1],
    textTransform: 'uppercase',
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
    paddingHorizontal: spacePx[3],
    paddingVertical: spacePx[2],
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionImg: {
    borderRadius: radiusPx.md,
    height: 40,
    width: 40,
  },
  optionImgFallback: {
    alignItems: 'center',
    backgroundColor: colors.bgAlt,
    justifyContent: 'center',
  },
  optionName: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
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

  footer: {
    backgroundColor: colors.bg,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    gap: spacePx[2],
    paddingHorizontal: spacePx[4],
    paddingTop: spacePx[3],
  },
  qtyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qtyLabel: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  validity: {
    color: colors.textMuted,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
    textAlign: 'center',
  },
  validityOk: {
    color: colors.success,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minHeight: 54,
  },
  addBtnDim: {
    opacity: 0.6,
  },
  addBtnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
});
