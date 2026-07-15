import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizePx, radiusPx } from '@joy-curry/tokens';
import { font } from './font';

interface Props {
  qty: number;
  onChange: (qty: number) => void;
  /** Lower bound; the cart passes 0 so "−" on qty 1 removes the line (web parity). */
  min?: number;
  max?: number;
  label?: string;
}

// 44pt touch targets (WCAG / Agent 02 hard rule).
export function QtyStepper({ qty, onChange, min = 1, max = 10, label }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityLabel={label ?? 'Quantity'}
      accessibilityValue={{ text: String(qty) }}
    >
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => onChange(Math.max(min, qty - 1))}
        accessibilityRole="button"
        accessibilityLabel={qty <= 1 && min === 0 ? 'Remove item' : 'Decrease quantity'}
        hitSlop={4}
      >
        <Text style={styles.btnGlyph}>−</Text>
      </Pressable>
      <Text style={styles.value}>{qty}</Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => onChange(Math.min(max, qty + 1))}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        hitSlop={4}
      >
        <Text style={styles.btnGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: colors.bgAlt,
    borderRadius: radiusPx.full,
    flexDirection: 'row',
  },
  btn: {
    alignItems: 'center',
    borderRadius: radiusPx.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  btnPressed: {
    backgroundColor: colors.ctaHover,
  },
  btnGlyph: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.lg,
  },
  value: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
    minWidth: 28,
    textAlign: 'center',
  },
});
