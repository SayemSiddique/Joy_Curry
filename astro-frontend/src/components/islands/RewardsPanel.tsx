import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import { authState, rewardsState, vaultOpen, loadRewards } from '@stores/auth';
import { addToCart, cartOpen } from '@stores/cart';
import { rewardsApi, type RewardMilestone } from '@lib/api';
import { formatPrice } from '@lib/formatters';
import { showToast } from '@lib/toast';

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

  // Refresh balance each time the panel opens for a signed-in user
  useEffect(() => {
    if (open && auth.token) loadRewards();
  }, [open, auth.token]);

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
