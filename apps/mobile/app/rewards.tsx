// Artisan Vault — the mobile rewards screen. Displays the signed-in user's
// points balance, progress toward the next milestone, and unlocked/locked
// rewards. Reads the shared `rewardsState` atom (hydrated by loadRewards), the
// same store web's AccountPage renders. Redemption itself happens at checkout
// (parity with web's CartPage), so this screen points there.
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  authState,
  cartCount,
  loadRewards,
  rewardsState,
  type RewardMilestone,
} from '@joy-curry/core';
import { colors, fontSizePx, radiusPx, spacePx } from '@joy-curry/tokens';
import { useNano } from '../src/lib/useNano';
import { font } from '../src/ui/font';

export default function RewardsScreen() {
  const router = useRouter();
  const auth = useNano(authState);
  const rewards = useNano(rewardsState);
  const cartN = useNano(cartCount);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    await loadRewards();
  }, []);

  // Signed out → sign-in; otherwise ensure the vault is loaded.
  useEffect(() => {
    if (!auth.token) {
      router.replace('/signin?next=/rewards');
      return;
    }
    let cancelled = false;
    (async () => {
      await loadRewards();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.token, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (!auth.token) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loading && !rewards) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Artisan Vault' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading your rewards…</Text>
        </View>
      </View>
    );
  }

  if (!rewards) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Artisan Vault' }} />
        <View style={styles.center}>
          <Text style={styles.centerText}>Couldn't load your rewards.</Text>
          <Pressable style={styles.primaryBtn} onPress={refresh}>
            <Text style={styles.primaryBtnLabel}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const progressPct = Math.min(Math.max(rewards.progressPct, 0), 100);
  const hasUnlocked = rewards.unlocked.length > 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Artisan Vault' }} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Balance + progress */}
        <View style={styles.hero}>
          <Text style={styles.heroPoints}>{rewards.balance.toLocaleString()}</Text>
          <Text style={styles.heroLabel}>points</Text>

          <View style={styles.progressTrack} accessibilityRole="progressbar">
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          {rewards.nextMilestone ? (
            <Text style={styles.heroNext}>
              {Math.max(rewards.nextMilestone.points - rewards.balance, 0).toLocaleString()} points until{' '}
              <Text style={styles.bold}>{rewards.nextMilestone.label}</Text>
            </Text>
          ) : (
            <Text style={styles.heroNext}>You've unlocked every reward — thank you!</Text>
          )}
        </View>

        {/* Unlocked rewards */}
        {hasUnlocked && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ready to redeem</Text>
            {rewards.unlocked.map((m) => (
              <MilestoneRow key={m.points} milestone={m} unlocked />
            ))}
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push(cartN > 0 ? '/checkout' : '/')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnLabel}>
                {cartN > 0 ? 'Redeem at checkout' : 'Start an order to redeem'}
              </Text>
            </Pressable>
            <Text style={styles.redeemHint}>
              Add a reward to your bag on the checkout screen.
            </Text>
          </View>
        )}

        {/* All milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All rewards</Text>
          {rewards.milestones.map((m) => (
            <MilestoneRow key={m.points} milestone={m} unlocked={m.unlocked} />
          ))}
        </View>

        {typeof rewards.lifetimeCents === 'number' && (
          <Text style={styles.lifetime}>
            Lifetime spend counted toward rewards adds up over every order.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function MilestoneRow({ milestone, unlocked }: { milestone: RewardMilestone; unlocked: boolean }) {
  return (
    <View style={[styles.milestone, unlocked && styles.milestoneUnlocked]}>
      <View style={styles.milestoneInfo}>
        <Text style={styles.milestoneGlyph}>{unlocked ? '🎁' : '🔒'}</Text>
        <View style={styles.milestoneText}>
          <Text style={styles.milestoneLabel}>{milestone.label}</Text>
          <Text style={styles.milestonePoints}>{milestone.points.toLocaleString()} points</Text>
        </View>
      </View>
      {unlocked && <Text style={styles.milestoneReady}>Unlocked</Text>}
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
    flex: 1,
    gap: spacePx[3],
    justifyContent: 'center',
    padding: spacePx[6],
  },
  centerText: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.base,
    textAlign: 'center',
  },
  body: {
    gap: spacePx[4],
    padding: spacePx[4],
  },

  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.xl,
    borderWidth: 1,
    gap: spacePx[1],
    padding: spacePx[6],
  },
  heroPoints: {
    color: colors.primary,
    fontFamily: font.black,
    fontSize: 48,
    lineHeight: 52,
  },
  heroLabel: {
    color: colors.textMuted,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressTrack: {
    backgroundColor: colors.bgAlt,
    borderRadius: radiusPx.full,
    height: 10,
    marginTop: spacePx[3],
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: colors.secondary,
    borderRadius: radiusPx.full,
    height: '100%',
  },
  heroNext: {
    color: colors.textSecondary,
    fontFamily: font.regular,
    fontSize: fontSizePx.sm,
    marginTop: spacePx[2],
    textAlign: 'center',
  },
  bold: {
    color: colors.textPrimary,
    fontFamily: font.bold,
  },

  section: {
    gap: spacePx[2],
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: font.bold,
    fontSize: fontSizePx.md,
  },
  milestone: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: radiusPx.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacePx[4],
    paddingVertical: spacePx[2],
  },
  milestoneUnlocked: {
    borderColor: colors.primary,
  },
  milestoneInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacePx[3],
  },
  milestoneGlyph: {
    fontSize: 22,
  },
  milestoneText: {
    flex: 1,
    gap: 1,
  },
  milestoneLabel: {
    color: colors.textPrimary,
    fontFamily: font.medium,
    fontSize: fontSizePx.sm,
  },
  milestonePoints: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
  },
  milestoneReady: {
    color: colors.primary,
    fontFamily: font.bold,
    fontSize: fontSizePx.xs,
  },

  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radiusPx.full,
    justifyContent: 'center',
    marginTop: spacePx[2],
    minHeight: 48,
    paddingHorizontal: spacePx[6],
  },
  primaryBtnLabel: {
    color: colors.textInverse,
    fontFamily: font.bold,
    fontSize: fontSizePx.base,
  },
  redeemHint: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
    textAlign: 'center',
  },
  lifetime: {
    color: colors.textMuted,
    fontFamily: font.regular,
    fontSize: fontSizePx.xs,
    textAlign: 'center',
  },
});
