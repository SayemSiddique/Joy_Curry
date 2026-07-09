import { useState, useEffect } from 'react';
import { LogOut, Sparkles } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  authState,
  rewardsState,
  clearAuth,
  loadRewards,
  type AuthState,
  type RewardsSummary,
  authApi,
  type UserProfile,
} from '@lib/core';
import { showToast } from '@lib/toast';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Nut-Free',
  'Dairy-Free',
  'Shellfish-Free',
];

export default function AccountPage() {
  const auth = useNano<AuthState>(authState);
  const rewards = useNano<RewardsSummary | null>(rewardsState);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Auth gate
  useEffect(() => {
    if (!auth.token) {
      window.location.href = '/';
    }
  }, [auth.token]);

  // Load profile
  useEffect(() => {
    if (!auth.token) return;
    authApi.me(auth.token).then(({ user }) => {
      setProfile(user);
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
      setBirthday(user.birthday ?? '');
      setDietaryPrefs(user.dietaryPrefs ?? []);
    }).catch(() => {
      showToast('Could not load profile.', 'error');
    });
  }, [auth.token]);

  // Load rewards if not already loaded
  useEffect(() => {
    if (auth.token && !rewards) loadRewards();
  }, [auth.token, rewards]);

  const toggleDiet = (pref: string) => {
    setDietaryPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;
    setProfileError('');
    setSaving(true);
    try {
      const { user } = await authApi.updateMe(
        {
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          birthday: birthday || null,
          dietaryPrefs,
        },
        auth.token
      );
      setProfile(user);
      showToast('Profile saved.', 'success');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    clearAuth();
    loadRewards();
    showToast('Signed out.', 'info');
    window.location.href = '/';
  };

  if (!auth.token || !profile) {
    return (
      <div className="account-page account-page--loading">
        <div className="account-page__spinner" aria-label="Loading…" />
      </div>
    );
  }

  return (
    <main className="account-page">
      <div className="account-page__inner">
        <h1 className="account-page__title">My Account</h1>

        {/* Profile section */}
        <section className="account-section" aria-labelledby="profile-heading">
          <h2 className="account-section__heading" id="profile-heading">Profile</h2>
          <form onSubmit={handleSave} noValidate>
            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="acc-name">Full Name</label>
              <input
                id="acc-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="acc-email">Email</label>
              <input
                id="acc-email"
                type="email"
                className="form-input form-input--readonly"
                value={profile.email}
                readOnly
                aria-describedby="acc-email-hint"
              />
              <span id="acc-email-hint" className="form-hint">Email cannot be changed here.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="acc-phone">Phone</label>
              <input
                id="acc-phone"
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="acc-birthday">Birthday</label>
              <input
                id="acc-birthday"
                type="date"
                className="form-input"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {profileError && (
              <div className="form-error account-section__error" role="alert">{profileError}</div>
            )}

            <button type="submit" className="btn btn--primary account-section__save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Dietary preferences */}
        <section className="account-section" aria-labelledby="dietary-heading">
          <h2 className="account-section__heading" id="dietary-heading">Dietary Preferences</h2>
          <p className="account-section__hint">
            We'll note your preferences on every order so the kitchen is aware.
          </p>
          <div className="account-dietary__grid" role="group" aria-label="Dietary preferences">
            {DIETARY_OPTIONS.map((pref) => {
              const checked = dietaryPrefs.includes(pref);
              return (
                <label
                  key={pref}
                  className={`account-dietary__option${checked ? ' account-dietary__option--checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="account-dietary__checkbox"
                    checked={checked}
                    onChange={() => toggleDiet(pref)}
                  />
                  {pref}
                </label>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn--primary account-section__save-btn"
            disabled={saving}
            onClick={handleSave as unknown as React.MouseEventHandler}
          >
            {saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </section>

        {/* Artisan Vault */}
        <section className="account-section account-section--vault" aria-labelledby="vault-heading">
          <h2 className="account-section__heading account-section__heading--icon" id="vault-heading"><Sparkles size={18} strokeWidth={2} aria-hidden="true" /> Artisan Vault</h2>
          {rewards ? (
            <div className="account-vault">
              <div className="account-vault__balance">
                <span className="account-vault__points">{rewards.balance}</span>
                <span className="account-vault__label">points</span>
              </div>
              <div className="account-vault__progress-track" aria-hidden="true">
                <div
                  className="account-vault__progress-fill"
                  style={{ width: `${Math.min(rewards.progressPct, 100)}%` }}
                />
              </div>
              {rewards.nextMilestone ? (
                <p className="account-vault__next">
                  {rewards.nextMilestone.points - rewards.balance} points until{' '}
                  <strong>{rewards.nextMilestone.label}</strong>
                </p>
              ) : (
                <p className="account-vault__next">You've unlocked all rewards — thank you!</p>
              )}
              {rewards.unlocked.length > 0 && (
                <div className="account-vault__unlocked">
                  <p className="account-vault__unlocked-label">Unlocked rewards:</p>
                  <ul className="account-vault__unlocked-list">
                    {rewards.unlocked.map((m) => (
                      <li key={m.points}>{m.label}</li>
                    ))}
                  </ul>
                  <a href="/order" className="btn btn--outline account-vault__redeem-link">
                    Redeem at checkout →
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="account-vault__empty">Sign in to see your points.</p>
          )}
        </section>

        {/* Sign out */}
        <div className="account-page__signout">
          <button type="button" className="btn btn--outline account-page__signout-btn" onClick={handleSignOut}>
            <LogOut size={18} strokeWidth={2} aria-hidden="true" /> Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
