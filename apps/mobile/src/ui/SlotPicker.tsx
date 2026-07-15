// Standalone, reusable pickup/delivery time-slot picker.
//
// Extracted from checkout so slot UX (day switch, fetch, capacity states) lives
// in one place. Owns its own day/fetch/loading state; the parent only holds the
// chosen slotTime (controlled `selected` + `onSelect`). Capacity is surfaced
// three ways off the shared `Slot` shape: available, "filling" (N left), and
// sold-out (disabled). Same server contract (`slotsApi.getSlots`) as web.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatSlotTime, slotsApi, type Slot } from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { font } from './font';

// "Today" / "Tomorrow" as a NY-local YYYY-MM-DD (the API's slot day key).
export function nyDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    // Hermes builds without full Intl time-zone support: fall back to device-local.
    const local = new Date();
    local.setDate(local.getDate() + offsetDays);
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

interface Props {
  selected: string | null;
  onSelect: (slotTime: string | null) => void;
  /** How many days forward to offer (2 = Today + Tomorrow). */
  days?: number;
}

export function SlotPicker({ selected, onSelect, days = 2 }: Props) {
  const dayOptions = useMemo(() => {
    const labels = ['Today', 'Tomorrow'];
    return Array.from({ length: days }, (_, i) => ({
      key: nyDateStr(i),
      label: labels[i] ?? nyDateStr(i).slice(5), // "MM-DD" past Tomorrow
    }));
  }, [days]);

  const [slotDate, setSlotDate] = useState(dayOptions[0].key);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    slotsApi
      .getSlots(slotDate)
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load times.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slotDate]);

  const allSoldOut = slots.length > 0 && slots.every((s) => s.soldOut);

  return (
    <View style={styles.wrap}>
      <View style={styles.dayRow}>
        {dayOptions.map((d) => {
          const active = slotDate === d.key;
          return (
            <Pressable
              key={d.key}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => {
                setSlotDate(d.key);
                onSelect(null); // slot times differ per day
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <Text style={styles.hint}>Loading available times…</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : slots.length === 0 ? (
        <Text style={styles.hint}>No times available for this day.</Text>
      ) : allSoldOut ? (
        <Text style={styles.hint}>Fully booked for this day — try another day.</Text>
      ) : (
        <View style={styles.grid}>
          {slots.map((slot) => {
            const active = selected === slot.slotTime;
            return (
              <Pressable
                key={slot.slotTime}
                disabled={slot.soldOut}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                  slot.soldOut && styles.chipDisabled,
                ]}
                onPress={() => onSelect(slot.slotTime)}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: slot.soldOut }}
                accessibilityLabel={
                  `${formatSlotTime(slot.slotTime)}` +
                  (slot.soldOut ? ', full' : slot.filling ? `, ${slot.remaining} left` : '')
                }
              >
                <Text style={[styles.chipTime, active && styles.chipTimeActive]}>
                  {formatSlotTime(slot.slotTime)}
                </Text>
                {slot.soldOut ? (
                  <Text style={styles.chipFull}>Full</Text>
                ) : slot.filling ? (
                  <Text style={[styles.chipLeft, active && styles.chipLeftActive]}>
                    {slot.remaining} left
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacePx[3],
  },
  dayRow: {
    flexDirection: 'row',
    gap: spacePx[2],
  },
  dayChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacePx[5],
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayLabel: {
    color: colors.textSecondary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  dayLabelActive: {
    color: colors.textInverse,
    fontFamily: font.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacePx[2],
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radiusPx.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 92,
    paddingHorizontal: spacePx[3],
    paddingVertical: spacePx[1],
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipTime: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  chipTimeActive: {
    color: colors.primary,
    fontFamily: font.bold,
  },
  chipLeft: {
    color: colors.warning,
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
    marginTop: 1,
  },
  chipLeftActive: {
    color: colors.primary,
  },
  chipFull: {
    color: colors.textMuted,
    fontFamily: font.medium,
    fontSize: fontSizePx.xs,
    marginTop: 1,
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
});
