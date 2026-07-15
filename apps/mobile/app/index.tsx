// S9 menu browse: category-rail navigation + search/dietary filters over the
// shared live menu. Regular dishes quick-add at base price (same contract as
// the web menu card's Add button); rows open the dish detail; bundles open the
// combo configurator.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  addToCart,
  authState,
  cartCount,
  CATEGORIES,
  DIETARY_FILTERS,
  formatPrice,
  subtotalCents,
  type MenuItem,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { imageUri, isBundle, loadMenu } from '../src/lib/menu';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';
import { showToast } from '../src/ui/Toast';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: MenuItem[] };

interface Section {
  id: string;
  label: string;
  items: MenuItem[];
}

const CATEGORY_LABEL = new Map(CATEGORIES.map((c) => [c.id, c.label]));
const CATEGORY_ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]));

function buildSections(items: MenuItem[]): Section[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const list = groups.get(item.category);
    if (list) list.push(item);
    else groups.set(item.category, [item]);
  }
  return [...groups.entries()]
    .sort(
      ([a], [b]) => (CATEGORY_ORDER.get(a) ?? 99) - (CATEGORY_ORDER.get(b) ?? 99),
    )
    .map(([id, data]) => ({ id, label: CATEGORY_LABEL.get(id) ?? id, items: data }));
}

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState('');
  // Suppresses viewability updates while an animated chip-tap scroll settles.
  const pendingCatRef = useRef<string | null>(null);
  // Deep-link (?category=) scroll target — applied once the sections load.
  const params = useLocalSearchParams<{ category?: string }>();
  const handledDeepLinkCat = useRef<string | null>(null);

  const count = useNano(cartCount);
  const subtotal = useNano(subtotalCents);
  const auth = useNano(authState);

  const listRef = useRef<FlatList<Section>>(null);
  const railRef = useRef<FlatList<{ id: string; label: string }>>(null);

  const load = useCallback(async (force = false) => {
    if (!force) setState({ status: 'loading' });
    try {
      const items = await loadMenu(force);
      setState({ status: 'ready', items });
    } catch {
      setState({
        status: 'error',
        message: "Couldn't load the menu. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  // ── Filters (same semantics as the web SearchFilterBar) ──
  const sections = useMemo(() => {
    if (state.status !== 'ready') return [];
    const q = query.toLowerCase().trim();
    const filtered = state.items.filter((item) => {
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !(item.searchKeywords ?? []).join(' ').toLowerCase().includes(q)
      )
        return false;
      if (dietary.includes('vegan') && !item.isVegan) return false;
      if (dietary.includes('vegetarian') && !item.isVegetarian) return false;
      if (dietary.includes('gluten-free') && !item.isGlutenFree) return false;
      return true;
    });
    return buildSections(filtered);
  }, [state, query, dietary]);

  useEffect(() => {
    // Keep the active chip valid when filters change the section set.
    if (sections.length === 0) setActiveCat('');
    else if (!sections.some((s) => s.id === activeCat)) setActiveCat(sections[0].id);
  }, [sections, activeCat]);

  // ── Category rail ↔ list sync ──
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable)?.item as Section | undefined;
      if (!first) return;
      if (pendingCatRef.current) {
        // Ignore intermediate sections flying past during a chip-tap scroll.
        if (first.id !== pendingCatRef.current) return;
        pendingCatRef.current = null;
      }
      setActiveCat(first.id);
    },
  ).current;

  const jumpToCategory = (catId: string) => {
    const index = sections.findIndex((s) => s.id === catId);
    if (index < 0) return;
    pendingCatRef.current = catId;
    setActiveCat(catId);
    listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
  };

  // Section blocks have variable heights; retry after the estimated jump lands.
  const onScrollToIndexFailed = ({ index, averageItemLength }: {
    index: number;
    averageItemLength: number;
  }) => {
    listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: true });
    setTimeout(
      () => listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true }),
      350,
    );
  };

  useEffect(() => {
    // Keep the active chip visible in the rail.
    const idx = sections.findIndex((s) => s.id === activeCat);
    if (idx >= 0) railRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true });
  }, [activeCat, sections]);

  useEffect(() => {
    // Honor a deep-linked category once the menu is loaded (joycurry://menu?category=…).
    const cat = params.category;
    if (!cat || sections.length === 0 || handledDeepLinkCat.current === cat) return;
    if (sections.some((s) => s.id === cat)) {
      handledDeepLinkCat.current = cat;
      jumpToCategory(cat);
    }
    // jumpToCategory is a stable closure over refs/sections; sections is a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, sections]);

  const toggleDietary = (id: string) =>
    setDietary((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const openItem = (item: MenuItem) => {
    if (isBundle(item)) router.push({ pathname: '/bundle/[id]', params: { id: item.id } });
    else router.push({ pathname: '/dish/[id]', params: { id: item.id } });
  };

  const quickAdd = (item: MenuItem) => {
    // Same payload as the web menu card's delegated Add handler.
    addToCart({
      itemId: item.id,
      name: item.name,
      basePriceCents: item.basePriceCents,
      qty: 1,
      lineTotalCents: item.basePriceCents,
      imageUrl: item.imageUrl,
      itemType: 'regular',
    });
    showToast('Added to your order');
  };

  const isFiltered = query.trim() !== '' || dietary.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Joy Curry & Tandoor',
          headerLeft: () => (
            <Pressable
              onPress={() => router.push(auth.token ? '/account' : '/signin')}
              accessibilityRole="button"
              accessibilityLabel={auth.user ? `Account, signed in as ${auth.user.name}` : 'Sign in'}
              style={styles.acctBtn}
              hitSlop={8}
            >
              <Text style={styles.acctBtnLabel}>{auth.user ? auth.user.name.trim().split(' ')[0] : 'Sign in'}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/cart')}
              accessibilityRole="button"
              accessibilityLabel={`Your order, ${count} item${count === 1 ? '' : 's'}`}
              style={styles.cartBtn}
              hitSlop={8}
            >
              <Text style={styles.cartBtnLabel}>Bag</Text>
              {count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          ),
        }}
      />

      {state.status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading the menu…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.center}>
          <Text style={styles.centerText}>{state.message}</Text>
          <Pressable style={styles.retryButton} onPress={() => load()}>
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'ready' && (
        <View style={styles.screen}>
          {/* Search + dietary filters */}
          <View style={styles.toolbar}>
            <TextInput
              style={styles.search}
              placeholder="Search dishes…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
              accessibilityLabel="Search menu items"
            />
            <View style={styles.dietaryRow}>
              {DIETARY_FILTERS.map((d) => {
                const active = dietary.includes(d.id);
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => toggleDietary(d.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
              {isFiltered && (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setDietary([]);
                  }}
                  accessibilityRole="button"
                  style={styles.chip}
                >
                  <Text style={styles.chipLabel}>✕ Reset</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Category rail */}
          {sections.length > 0 && (
            <FlatList
              ref={railRef}
              data={sections}
              keyExtractor={(s) => s.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.rail}
              contentContainerStyle={styles.railContent}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item: s }) => {
                const active = s.id === activeCat;
                return (
                  <Pressable
                    onPress={() => jumpToCategory(s.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.railChip, active && styles.railChipActive]}
                  >
                    <Text style={[styles.railLabel, active && styles.railLabelActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          {/* Dishes, one list item per category block */}
          {sections.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.centerText}>No dishes match your filters.</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  setQuery('');
                  setDietary([]);
                }}
              >
                <Text style={styles.retryLabel}>Clear filters</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={sections}
              keyExtractor={(s) => s.id}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 15 }}
              onScrollToIndexFailed={onScrollToIndexFailed}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              contentContainerStyle={{ paddingBottom: count > 0 ? 120 : spacePx[8] }}
              renderItem={({ item: section }) => (
                <View>
                  <Text style={styles.sectionHeader}>{section.label}</Text>
                  {section.items.map((item) => (
                    <DishRow key={item.id} item={item} onOpen={openItem} onQuickAdd={quickAdd} />
                  ))}
                </View>
              )}
            />
          )}

          {/* Sticky view-order bar */}
          {count > 0 && (
            <Pressable
              style={[styles.orderBar, { bottom: insets.bottom + spacePx[4] }]}
              onPress={() => router.push('/cart')}
              accessibilityRole="button"
              accessibilityLabel={`View order, ${count} items, ${formatPrice(subtotal)}`}
            >
              <View style={styles.orderBarBadge}>
                <Text style={styles.orderBarBadgeText}>{count}</Text>
              </View>
              <Text style={styles.orderBarLabel}>View Order</Text>
              <Text style={styles.orderBarPrice}>{formatPrice(subtotal)}</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );
}

function DishRow({
  item,
  onOpen,
  onQuickAdd,
}: {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
}) {
  const uri = imageUri(item.imageUrl);
  const bundle = isBundle(item);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatPrice(item.basePriceCents)}`}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={150} recyclingKey={item.id} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbGlyph}>🍛</Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.itemPrice}>
          {formatPrice(item.basePriceCents)}
          {!item.inStock && <Text style={styles.soldOut}>  · Sold out</Text>}
        </Text>
      </View>
      {bundle ? (
        <View style={styles.rowChevron}>
          <Text style={styles.rowChevronGlyph}>›</Text>
        </View>
      ) : (
        item.inStock && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={() => onQuickAdd(item)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name} to order`}
            hitSlop={6}
          >
            <Text style={styles.addBtnGlyph}>＋</Text>
          </Pressable>
        )
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    alignItems: 'center',
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacePx[6],
    paddingVertical: spacePx[2],
  },
  retryLabel: {
    color: colors.textInverse,
    fontFamily: font.medium,
    fontSize: fontSizePx.base,
  },

  acctBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingRight: spacePx[2],
  },
  acctBtnLabel: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  cartBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacePx[1],
    minHeight: 44,
    justifyContent: 'center',
  },
  cartBtnLabel: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  cartBadge: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
  },

  toolbar: {
    gap: spacePx[2],
    paddingHorizontal: spacePx[4],
    paddingTop: spacePx[3],
  },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    minHeight: 44,
    paddingHorizontal: spacePx[4],
  },
  dietaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacePx[2],
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacePx[3],
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  chipLabelActive: {
    color: colors.textInverse,
  },

  rail: {
    flexGrow: 0,
    marginTop: spacePx[2],
  },
  railContent: {
    gap: spacePx[2],
    paddingHorizontal: spacePx[4],
    paddingVertical: spacePx[2],
  },
  railChip: {
    alignItems: 'center',
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacePx[4],
  },
  railChipActive: {
    backgroundColor: colors.primaryLight,
  },
  railLabel: {
    color: colors.textMuted,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  railLabelActive: {
    color: colors.primary,
    fontFamily: font.bold,
  },

  sectionHeader: {
    color: colors.primary,
    fontFamily: font.black,
    fontSize: fontSizePx.xl,
    paddingHorizontal: spacePx[4],
    paddingBottom: spacePx[2],
    paddingTop: spacePx[5],
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.borderLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacePx[3],
    paddingHorizontal: spacePx[4],
    paddingVertical: spacePx[3],
  },
  rowPressed: {
    backgroundColor: colors.bgAlt,
  },
  thumb: {
    borderRadius: radiusPx.lg,
    height: 72,
    width: 72,
  },
  thumbFallback: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
  },
  thumbGlyph: {
    fontSize: fontSizePx.xl,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.base,
  },
  itemDescription: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
    lineHeight: 18,
  },
  itemPrice: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
    marginTop: 2,
  },
  soldOut: {
    color: colors.error,
    fontFamily: font.medium,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radiusPx.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addBtnPressed: {
    backgroundColor: colors.ctaHover,
  },
  addBtnGlyph: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  rowChevron: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 24,
  },
  rowChevronGlyph: {
    color: colors.textMuted,
    fontFamily: font.bold,
    fontSize: fontSizePx.xl,
  },

  orderBar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    elevation: 8,
    flexDirection: 'row',
    gap: spacePx[3],
    left: spacePx[4],
    minHeight: 56,
    paddingHorizontal: spacePx[5],
    position: 'absolute',
    right: spacePx[4],
    shadowColor: '#0D0906',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  orderBarBadge: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radiusPx.full,
    height: 24,
    justifyContent: 'center',
    minWidth: 24,
    paddingHorizontal: 6,
  },
  orderBarBadgeText: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.sm,
  },
  orderBarLabel: {
    color: colors.textInverse,
    flex: 1,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  orderBarPrice: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
});
