import { useState, useEffect, useRef } from 'react';
import { otpApi, setAuth, loadRewards, authState } from '@lib/core';

type Step = 'email' | 'code' | 'details';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Where to land after a successful sign-in. Honors ?next= (same-origin only,
// must be a root-relative path so we can't be used as an open redirect).
function nextUrl(): string {
  if (typeof window === 'undefined') return '/';
  const next = new URLSearchParams(window.location.search).get('next');
  return next && /^\/(?!\/)/.test(next) ? next : '/';
}

export default function AuthFlow() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devHint, setDevHint] = useState('');

  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Already signed in? Skip straight to the destination.
  useEffect(() => {
    if (authState.get().token) window.location.href = nextUrl();
  }, []);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
    if (step === 'details') nameRef.current?.focus();
  }, [step]);

  const finish = (token: string, user: { id: number; name: string; email: string; role: string }) => {
    setAuth(token, { id: user.id, name: user.name, email: user.email, role: user.role as 'customer' | 'admin' });
    loadRewards();
    window.location.href = nextUrl();
  };

  const requestCode = async (targetEmail: string) => {
    const res = await otpApi.request(targetEmail);
    if (res.devCode) setDevHint(`Dev code: ${res.devCode}`);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) { setError('Please enter a valid email address.'); return; }
    setError('');
    setBusy(true);
    try {
      setEmail(value);
      await requestCode(value);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code.'); return; }
    setError('');
    setBusy(true);
    try {
      const res = await otpApi.verify(email, code.trim());
      if (res.exists) {
        finish(res.token, res.user);
      } else {
        setTicket(res.ticket);
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Please enter your name.'); return; }
    setError('');
    setBusy(true);
    try {
      const res = await otpApi.register({ ticket, name: name.trim(), phone: phone.trim() || undefined });
      finish(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setBusy(true);
    try {
      await requestCode(email);
    } catch {
      setError('Could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

  const editEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setDevHint('');
  };

  return (
    <div className="auth-flow">
      <div className="auth-flow__card">
        <img
          src="/images/logo/navbar_logo.png"
          alt="Joy Curry & Tandoor"
          className="auth-flow__logo"
        />

        {step === 'email' && (
          <form onSubmit={handleEmail} noValidate>
            <h1 className="auth-flow__title">Welcome to Joy Curry</h1>
            <p className="auth-flow__sub">Enter your email to sign in or create an account.</p>

            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            {error && <div className="form-error auth-flow__error" role="alert">{error}</div>}

            <button type="submit" className="btn btn--primary auth-flow__submit" disabled={busy}>
              {busy ? 'Sending code…' : 'Continue'}
            </button>
            <p className="auth-flow__legal">
              By continuing you agree to our{' '}
              <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleCode} noValidate>
            <h1 className="auth-flow__title">Verify your email</h1>
            <p className="auth-flow__sub">Enter the 6-digit code sent to your email.</p>

            <div className="form-group auth-flow__email-row">
              <span className="auth-flow__email-value">{email}</span>
              <button type="button" className="auth-flow__edit" onClick={editEmail}>Edit</button>
            </div>

            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="auth-code">6-digit code</label>
              <input
                id="auth-code"
                ref={codeRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="form-input auth-flow__code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                placeholder="••••••"
                required
              />
            </div>

            {devHint && <p className="auth-flow__dev-hint">{devHint}</p>}
            {error && <div className="form-error auth-flow__error" role="alert">{error}</div>}

            <button type="submit" className="btn btn--primary auth-flow__submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Continue'}
            </button>
            <p className="auth-flow__resend">
              Didn't receive a code?{' '}
              <button type="button" onClick={handleResend} disabled={busy}>Resend</button>
            </p>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetails} noValidate>
            <h1 className="auth-flow__title">Create your account</h1>
            <p className="auth-flow__sub">Just a couple details so we can personalize your orders.</p>

            <div className="form-group">
              <label className="form-label form-label--required" htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                ref={nameRef}
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auth-phone">Phone number <span className="auth-flow__optional">(optional)</span></label>
              <input
                id="auth-phone"
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>

            {error && <div className="form-error auth-flow__error" role="alert">{error}</div>}

            <button type="submit" className="btn btn--primary auth-flow__submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
