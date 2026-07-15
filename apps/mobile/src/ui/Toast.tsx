import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizePx, motion, radiusPx, spacePx, zIndex } from '@joy-curry/tokens';
import { font } from './font';

// Minimal toast, mirroring the web's showToast('Added to your order').
// Module-level emitter so any screen can call showToast without context.

type Listener = (msg: string) => void;
let listener: Listener | null = null;

export function showToast(msg: string): void {
  listener?.(msg);
}

/** Mounted once in the root layout, above the navigator. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (m: string) => {
      setMsg(m);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.fastMs,
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: motion.normalMs,
          useNativeDriver: true,
        }).start(() => setMsg(null));
      }, 2000);
    };
    return () => {
      listener = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!msg) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom: insets.bottom + spacePx[16], opacity }]}
    >
      <Text style={styles.text}>{msg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    elevation: 6,
    paddingHorizontal: spacePx[5],
    paddingVertical: spacePx[3],
    position: 'absolute',
    shadowColor: '#0D0906',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    zIndex: zIndex.toast,
  },
  text: {
    color: colors.textInverse,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
});
