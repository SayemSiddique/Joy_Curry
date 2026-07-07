import { useState, useEffect, useRef } from 'react';
import type { ReadableAtom } from 'nanostores';
import { authState, rewardsState, vaultOpen, loadRewards } from '@stores/auth';
import { addToCart, cartOpen } from '@stores/cart';
import { rewardsApi, type RewardMilestone, type RewardsSummary } from '@lib/api';
import { formatPrice } from '@lib/formatters';
import { showToast } from '@lib/toast';

// P6-C: Badge definitions — derived purely from rewards data (no extra API calls)
interface Badge {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  unlocked: boolean;
}

function computeBadges(rewards: RewardsSummary): Badge[] {
  const spendDollars = rewards.lifetimeCents / 100;
  const totalOrders = Math.floor(rewards.balance / 100); // proxy: every $1 = 100 pts, so balance/100 ≈ order count
  const streak = rewards.streak ?? 0;
  const unlockedMilestones = rewards.unlocked?.length ?? 0;

  return [
    {
      id: 'first-bite',
      emoji: '🍽️',
      label: 'First Bite',
      desc: 'Placed your first order',
      unlocked: rewards.balance > 0,
    },
    {
      id: 'loyal-regular',
      emoji: '⭐',
      label: 'Loyal Regular',
      desc: '3-week ordering streak',
      unlocked: streak >= 3,
    },
    {
      id: 'hot-streak',
      emoji: '🔥',
      label: 'Hot Streak',
      desc: '5-week ordering streak',
      unlocked: streak >= 5,
    },
    {
      id: 'big-spender',
      emoji: '💎',
      label: 'Big Spender',
      desc: 'Over $100 lifetime spend',
      unlocked: spendDollars >= 100,
    },
    {
      id: 'vault-explorer',
      emoji: '🏆',
      label: 'Vault Explorer',
      desc: 'Unlocked a rewards milestone',
      unlocked: unlockedMilestones >= 1,
    },
    {
      id: 'connoisseur',
      emoji: '👑',
      label: 'Curry Connoisseur',
      desc: 'Over $250 lifetime spend',
      unlocked: spendDollars >= 250,
    },
  ];
}

// Manual nanostore subscription — avoids the @nanostores/react useStore
// React 19 + Astro SSR "Invalid hook call" issue (see CartDrawer/AuthModal).
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

export default function RewardsPanel() {
  const open = useNano(vaultOpen);
  const auth = useNano(authState);
  const rewards = useNano(rewardsState);
  const prevUnlockedBadgeIds = useRef<Set<string>>(new Set());

  // Refresh balance each time the panel opens for a signed-in user
  useEffect(() => {
    if (open && auth.token) loadRewards();
  }, [open, auth.token]);

  // P6-C: Fire a toast when a badge unlocks for the first time this session
  useEffect(() => {
    if (!rewards) return;
    const badges = computeBadges(rewards);
    const STORAGE_KEY = 'jc_earned_badges';
    const earned: string[] = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
    })();
    const earnedSet = new Set(earned);
    let changed = false;
    for (const badge of badges) {
      if (badge.unlocked && !earnedSet.has(badge.id)) {
        showToast(`🏅 Badge unlocked: ${badge.label}!`, 'success');
        earnedSet.add(badge.id);
        changed = true;
      }
    }
    if (changed) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...earnedSet])); } catch {}
    }
    prevUnlockedBadgeIds.current = earnedSet;
  }, [rewards]);

  const handleClose = () => vaultOpen.set(false);

  const handleRedeem = async (milestone: RewardMilestone) => {
    const token = authState.get().token;
    if (!token) return;
    try {
      const { reward } = await rewardsApi.redeem({ milestonePoints: milestone.points }, token);
      addToCart({
        itemId: reward.itemId,
        name: `🎁 ${reward.itemName} (Reward)`,
        basePriceCents: 0,
        qty: 1,
        lineTotalCents: 0,
        itemType: 'regular',
      });
      vaultOpen.set(false);
      cartOpen.set(true);
      showToast(`Reward added: ${reward.itemName}`, 'success');
      loadRewards();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not redeem reward.', 'error');
    }
  };

  return (
    <>
      <div
        className={`vault-overlay${open ? ' vault-overlay--visible' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`vault-panel${open ? ' vault-panel--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Artisan Vault rewards"
      >
        <div className="vault-panel__header">
          <h2 className="vault-panel__title">✦ Artisan Vault</h2>
          <button
            className="vault-panel__close"
            onClick={handleClose}
            aria-label="Close rewards panel"
          >
            ✕
          </button>
        </div>

        <div className="vault-panel__content">
          {!auth.user || !rewards ? (
            <p className="vault-panel__empty">Sign in to view your rewards.</p>
          ) : (
            <>
              <div className="vault-balance">
                <span className="vault-balance__value">{rewards.balance.toLocaleString()}</span>
                <span className="vault-balance__label">points</span>
              </div>

              {rewards.nextMilestone ? (
                <div className="vault-progress">
                  <div className="vault-progress__bar" aria-hidden="true">
                    <div
                      className="vault-progress__fill"
                      style={{ width: `${rewards.progressPct}%` }}
                    />
                  </div>
                  <p className="vault-progress__label">
                    {rewards.pointsToNext.toLocaleString()} pts to{' '}
                    <strong>{rewards.nextMilestone.label}</strong>
                  </p>
                </div>
              ) : (
                <p className="vault-progress__label">Every milestone unlocked. Enjoy your rewards!</p>
              )}

              <div className="vault-milestones">
                {rewards.milestones.map((m) => {
                  const active = m === rewards.unlocked[rewards.unlocked.length - 1];
                  return (
                    <div
                      key={m.points}
                      className={`vault-milestone${m.unlocked ? ' vault-milestone--unlocked' : ''}${active ? ' vault-milestone--active' : ''}`}
                    >
                      <div className="vault-milestone__info">
                        <span className="vault-milestone__label">{m.label}</span>
                        <span className="vault-milestone__pts">{m.points.toLocaleString()} pts</span>
                      </div>
                      {m.unlocked ? (
                        <button
                          className="vault-milestone__redeem"
                          onClick={() => handleRedeem(m)}
                          type="button"
                        >
                          Redeem
                        </button>
                      ) : (
                        <span className="vault-milestone__status" aria-hidden="true">🔒</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* P6-C: Gamified badges */}
              <div className="vault-badges">
                <p className="vault-badges__heading">Your Badges</p>
                <div className="vault-badges__grid">
                  {computeBadges(rewards).map(badge => (
                    <div
                      key={badge.id}
                      className={`vault-badge${badge.unlocked ? ' vault-badge--unlocked' : ' vault-badge--locked'}`}
                      title={badge.desc}
                      aria-label={`${badge.label}: ${badge.desc}${badge.unlocked ? ' (earned)' : ' (locked)'}`}
                    >
                      <span className="vault-badge__emoji" aria-hidden="true">
                        {badge.unlocked ? badge.emoji : '🔒'}
                      </span>
                      <span className="vault-badge__label">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="vault-stats">
                <div className="vault-stat">
                  <span className="vault-stat__value">{formatPrice(rewards.lifetimeCents)}</span>
                  <span className="vault-stat__label">Lifetime Spend</span>
                </div>
                <div className="vault-stat">
                  <span className="vault-stat__value">{rewards.balance.toLocaleString()}</span>
                  <span className="vault-stat__label">Points Balance</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
