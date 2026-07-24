import { useState, useEffect } from 'react';
import { LogOut, Sparkles } from 'lucide-react';
import { Tabs, Field, Form } from '@joy-curry/ui';
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
  const [tab, setTab] = useState('profile');

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

  const initials = (profile.name || profile.email)
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="account-page">
      <div className="account-page__inner">
        {/* Modern account header */}
        <header className="account-hero">
          <div className="account-hero__avatar" aria-hidden="true">{initials}</div>
          <div className="account-hero__meta">
            <h1 className="account-hero__name">{profile.name || 'My Account'}</h1>
            <p className="account-hero__email">{profile.email}</p>
          </div>
        </header>

        <Tabs.Root value={tab} onValueChange={(v) => setTab(v as string)} className="account-tabs">
          <Tabs.List className="account-tabs__list">
            <Tabs.Tab value="profile">Profile</Tabs.Tab>
            <Tabs.Tab value="preferences">Preferences</Tabs.Tab>
            <Tabs.Tab value="rewards">Rewards</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>

          {/* Profile */}
          <Tabs.Panel value="profile" className="account-panel">
            <Form onSubmit={handleSave} noValidate unstyled>
              <Field.Root name="name" unstyled className="form-group">
                <Field.Label unstyled className="form-label form-label--required">Full Name</Field.Label>
                <Field.Control
                  unstyled
                  type="text"
                  className="form-input"
                  value={name}
                  onValueChange={(v) => setName(v)}
                  autoComplete="name"
                  aria-required="true"
                />
              </Field.Root>

              <Field.Root name="email" unstyled className="form-group">
                <Field.Label unstyled className="form-label">Email</Field.Label>
                <Field.Control
                  unstyled
                  type="email"
                  className="form-input form-input--readonly"
                  value={profile.email}
                  readOnly
                />
                <Field.Description unstyled className="form-hint">Email cannot be changed here.</Field.Description>
              </Field.Root>

              <Field.Root name="phone" unstyled className="form-group">
                <Field.Label unstyled className="form-label">Phone</Field.Label>
                <Field.Control
                  unstyled
                  type="tel"
                  className="form-input"
                  value={phone}
                  onValueChange={(v) => setPhone(v)}
                  autoComplete="tel"
                />
              </Field.Root>

              <Field.Root name="birthday" unstyled className="form-group">
                <Field.Label unstyled className="form-label">Birthday</Field.Label>
                <Field.Control
                  unstyled
                  type="date"
                  className="form-input"
                  value={birthday}
                  onValueChange={(v) => setBirthday(v)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </Field.Root>

              {profileError && (
                <div className="form-error account-section__error" role="alert">{profileError}</div>
              )}

              <button type="submit" className="btn btn--primary account-section__save-btn" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </Form>
          </Tabs.Panel>

          {/* Dietary preferences */}
          <Tabs.Panel value="preferences" className="account-panel">
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
          </Tabs.Panel>

          {/* Artisan Vault */}
          <Tabs.Panel value="rewards" className="account-panel">
            <h2 className="account-section__heading account-section__heading--icon"><Sparkles size={18} strokeWidth={2} aria-hidden="true" /> Artisan Vault</h2>
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
          </Tabs.Panel>
        </Tabs.Root>

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
