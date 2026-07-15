// Account — the signed-in home for order history + sign out. Full profile
// editing (dietary prefs, birthday, Artisan Vault) lives on web's /account and
// is out of S10 scope; this is the mobile entry point to auth + history.
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { authState, clearAuth } from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { unregisterPush } from '../src/lib/notifications';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';

export default function AccountScreen() {
  const router = useRouter();
  const auth = useNano(authState);

  // Signed out (e.g. after sign-out or a deep link) → send to sign-in.
  useEffect(() => {
    if (!auth.token) router.replace('/signin');
  }, [auth.token, router]);

  const signOut = async () => {
    // Delete this device's push token BEFORE clearing the session — the delete
    // is authorized by the still-valid auth token.
    await unregisterPush();
    clearAuth();
    router.dismissTo('/');
  };

  if (!auth.user) return <View style={styles.screen} />;

  const initial = auth.user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Account' }} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{auth.user.name}</Text>
          <Text style={styles.email}>{auth.user.email}</Text>
        </View>

        <Pressable
          style={styles.rowBtn}
          onPress={() => router.push('/orders')}
          accessibilityRole="button"
        >
          <Text style={styles.rowBtnLabel}>Order history</Text>
          <Text style={styles.rowBtnChevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.rowBtn}
          onPress={() => router.push('/rewards')}
          accessibilityRole="button"
        >
          <Text style={styles.rowBtnLabel}>Artisan Vault</Text>
          <Text style={styles.rowBtnChevron}>›</Text>
        </Pressable>

        <Pressable style={styles.signOut} onPress={signOut} accessibilityRole="button">
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  body: {
    gap: spacePx[3],
    padding: spacePx[4],
  },
  profile: {
    alignItems: 'center',
    gap: spacePx[2],
    paddingVertical: spacePx[6],
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: {
    color: colors.textInverse,
    fontFamily: font.black,
    fontSize: fontSizePx['2xl'],
  },
  name: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.lg,
  },
  email: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
  },
  rowBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacePx[4],
  },
  rowBtnLabel: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  rowBtnChevron: {
    color: colors.textMuted,
    fontFamily: font.bold,
    fontSize: fontSizePx.xl,
  },
  signOut: {
    alignItems: 'center',
    borderColor: colors.error,
    borderRadius: radiusPx.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: spacePx[3],
    minHeight: 48,
  },
  signOutLabel: {
    color: colors.error,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
});
