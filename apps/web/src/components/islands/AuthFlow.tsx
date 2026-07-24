import { useState, useEffect } from 'react';
import { Field, Form, OtpField } from '@joy-curry/ui';
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

  // Already signed in? Skip straight to the destination.
  useEffect(() => {
    if (authState.get().token) window.location.href = nextUrl();
  }, []);

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
          <Form onSubmit={handleEmail} noValidate unstyled>
            <h1 className="auth-flow__title">Welcome to Joy Curry</h1>
            <p className="auth-flow__sub">Enter your email to sign in or create an account.</p>

            <Field.Root name="email" invalid={!!error} unstyled className="form-group">
              <Field.Label unstyled className="form-label form-label--required">Email Address</Field.Label>
              {/* type="text" + inputMode="email" (not type="email") so Base UI's
                  Form validation never sees a `typeMismatch` and always hands off
                  to handleEmail — the EMAIL_RE check + custom message stay authoritative.
                  aria-required replaces `required` for the same reason (valueMissing
                  would otherwise block submit before our handler runs). value +
                  onValueChange is Base UI's controlled API. */}
              <Field.Control
                unstyled
                type="text"
                inputMode="email"
                className="form-input"
                value={email}
                onValueChange={(value) => setEmail(value)}
                autoComplete="email"
                placeholder="you@example.com"
                aria-required="true"
                autoFocus
              />
              {error && <Field.Error match unstyled className="form-error auth-flow__error" role="alert">{error}</Field.Error>}
            </Field.Root>

            <button type="submit" className="btn btn--primary auth-flow__submit" disabled={busy}>
              {busy ? 'Sending code…' : 'Continue'}
            </button>
            <p className="auth-flow__legal">
              By continuing you agree to our{' '}
              <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.
            </p>
          </Form>
        )}

        {step === 'code' && (
          <Form onSubmit={handleCode} noValidate unstyled>
            <h1 className="auth-flow__title">Verify your email</h1>
            <p className="auth-flow__sub">Enter the 6-digit code sent to your email.</p>

            <div className="form-group auth-flow__email-row">
              <span className="auth-flow__email-value">{email}</span>
              <button type="button" className="auth-flow__edit" onClick={editEmail}>Edit</button>
            </div>

            <Field.Root name="code" invalid={!!error} unstyled className="form-group">
              <Field.Label unstyled className="form-label form-label--required">6-digit code</Field.Label>
              <OtpField.Root
                length={6}
                value={code}
                onValueChange={(value) => setCode(value)}
                validationType="numeric"
                autoComplete="one-time-code"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <OtpField.Input key={i} autoFocus={i === 0} />
                ))}
              </OtpField.Root>
            </Field.Root>

            {devHint && <p className="auth-flow__dev-hint">{devHint}</p>}
            {error && <div className="form-error auth-flow__error" role="alert">{error}</div>}

            <button type="submit" className="btn btn--primary auth-flow__submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Continue'}
            </button>
            <p className="auth-flow__resend">
              Didn't receive a code?{' '}
              <button type="button" onClick={handleResend} disabled={busy}>Resend</button>
            </p>
          </Form>
        )}

        {step === 'details' && (
          <Form onSubmit={handleDetails} noValidate unstyled>
            <h1 className="auth-flow__title">Create your account</h1>
            <p className="auth-flow__sub">Just a couple details so we can personalize your orders.</p>

            <Field.Root name="name" invalid={!!error} unstyled className="form-group">
              <Field.Label unstyled className="form-label form-label--required">Full Name</Field.Label>
              <Field.Control
                unstyled
                type="text"
                className="form-input"
                value={name}
                onValueChange={(value) => setName(value)}
                autoComplete="name"
                aria-required="true"
                autoFocus
              />
              {error && <Field.Error match unstyled className="form-error auth-flow__error" role="alert">{error}</Field.Error>}
            </Field.Root>

            <Field.Root name="phone" unstyled className="form-group">
              <Field.Label unstyled className="form-label">Phone number <span className="auth-flow__optional">(optional)</span></Field.Label>
              <Field.Control
                unstyled
                type="tel"
                className="form-input"
                value={phone}
                onValueChange={(value) => setPhone(value)}
                autoComplete="tel"
              />
            </Field.Root>

            <button type="submit" className="btn btn--primary auth-flow__submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create Account'}
            </button>
          </Form>
        )}
      </div>
    </div>
  );
}
