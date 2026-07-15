import { StyleSheet, Text, View } from 'react-native';
import type { MenuItem } from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { font } from './font';

// Dietary/tag badge row — same badge set + colors as the web dish modal.
export function DietBadges({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  const isVeg = item.isVegan || item.isVegetarian;
  const badges: { key: string; label: string; color: string }[] = [];

  if (item.isVegan) badges.push({ key: 'vegan', label: 'Vegan', color: colors.vegan });
  else if (item.isVegetarian) badges.push({ key: 'veg', label: 'Vegetarian', color: colors.veg });
  if (!isVeg) badges.push({ key: 'nonveg', label: 'Non-Veg', color: colors.nonveg });
  if (item.isGlutenFree) badges.push({ key: 'gf', label: 'GF', color: colors.gf });
  if (item.isHalal) badges.push({ key: 'halal', label: 'Halal', color: colors.halal });
  if (!compact && (item.tags ?? []).includes('popular'))
    badges.push({ key: 'popular', label: '♥ Most Loved', color: colors.secondary });
  if (!compact && (item.tags ?? []).includes('chefs-pick'))
    badges.push({ key: 'chefs-pick', label: "Chef's Pick", color: colors.warning });

  if (badges.length === 0) return null;

  return (
    <View style={styles.row}>
      {badges.map((b) => (
        <View key={b.key} style={[styles.badge, { borderColor: b.color }]}>
          <Text style={[styles.label, { color: b.color }]}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

// Spice meter: 1–3 lit dots + label, hidden for Mild/absent (web parity).
export function SpiceMeter({ level }: { level?: string | null }) {
  if (!level || level === 'Mild') return null;
  const lvl = level === 'Hot' ? 3 : level === 'Medium' ? 2 : 1;
  return (
    <View style={styles.row} accessibilityLabel={`Spice level: ${level}`}>
      <View style={styles.dots}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i <= lvl && styles.dotLit]} />
        ))}
      </View>
      <Text style={styles.spiceLabel}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacePx[2],
  },
  badge: {
    borderRadius: radiusPx.full,
    borderWidth: 1,
    paddingHorizontal: spacePx[2],
    paddingVertical: 2,
  },
  label: {
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: radiusPx.full,
    height: 8,
    width: 8,
  },
  dotLit: {
    backgroundColor: colors.spicy,
  },
  spiceLabel: {
    color: colors.spicy,
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
  },
});
