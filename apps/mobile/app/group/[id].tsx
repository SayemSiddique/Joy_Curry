// Deep-link entry: joycurry://group/<id> → the WEB group-order flow.
//
// Group orders are a web-only feature (shared cart over localStorage +
// BroadcastChannel across browser tabs — see apps/web GroupOrderBanner). There
// is no native group-order screen (deferred in S11); a group link opens the web
// flow in the system browser, where that cross-tab session actually works. The
// system browser (not an in-app webview) is deliberate: it has the persistent
// storage + BroadcastChannel the web flow depends on.
import { useCallback, useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { font } from '../../src/ui/font';

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_ASSET_BASE_URL ?? '';

export default function GroupDeepLink() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const openWeb = useCallback(() => {
    if (!id || !WEB_BASE) return;
    const url = `${WEB_BASE}/order?group=${encodeURIComponent(id)}`;
    Linking.openURL(url).catch(() => {
      /* system browser refused — the manual button below stays available */
    });
  }, [id]);

  useEffect(() => {
    openWeb();
  }, [openWeb]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Group Order' }} />
      <View style={styles.body}>
        <Text style={styles.emoji}>👥</Text>
        <Text style={styles.title}>Group order</Text>
        <Text style={styles.sub}>
          Group ordering happens on the web. We&apos;re opening it in your browser — tap below if it
          doesn&apos;t open automatically.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={openWeb} accessibilityRole="button">
          <Text style={styles.primaryBtnLabel}>Open group order</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryBtnLabel}>Back to menu</Text>
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
  body: {
    alignItems: 'center',
    flex: 1,
    gap: spacePx[3],
    justifyContent: 'center',
    padding: spacePx[6],
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: font.black,
    fontSize: fontSizePx['2xl'],
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[3],
    minHeight: 52,
    paddingHorizontal: spacePx[8],
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
    paddingHorizontal: spacePx[8],
  },
  secondaryBtnLabel: {
    color: colors.secondary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
});
