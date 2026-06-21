import { useState, useEffect, useRef } from 'react';
import type { ReadableAtom } from 'nanostores';
import {
  authState,
  authOpen,
  orderHistoryOpen,
  adminPanelOpen,
  setAuth,
  clearAuth,
  type AuthState,
} from '@stores/auth';
import { authApi } from '@lib/api';
import { showToast } from '@lib/toast';
import { useFocusTrap } from '@lib/hooks';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

type Tab = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

interface LoginForm { email: string; password: string; }
interface RegisterForm { name: string; email: string; password: string; phone: string; }
interface FieldErrors { name?: string; email?: string; password?: string; phone?: string; global?: string; }

const EMPTY_LOGIN: LoginForm = { email: '', password: '' };
const EMPTY_REGISTER: RegisterForm = { name: '', email: '', password: '', phone: '' };

export default function AuthModal() {
  const open = useNano(authOpen);
  const auth = useNano<AuthState>(authState);

  const [tab, setTab] = useState<Tab>('login');
  const [loginForm, setLoginForm] = useState<LoginForm>(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(EMPTY_REGISTER);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, open);

  // Restore session from localStorage token on mount
  useEffect(() => {
    const { token } = authState.get();
    if (!token) return;
    authApi.me(token)
      .then((res) => {
        const u = res.user;
        setAuth(token, { id: u.id, name: u.name, email: u.email, role: u.role as 'customer' | 'admin' });
      })
      .catch(() => clearAuth());
  }, []);

  // Wire static Navbar buttons → islands
  useEffect(() => {
    const signInBtn = document.getElementById('navbar-auth-btn');
    const ordersBtn = document.getElementById('navbar-orders-btn');
    const adminBtn = document.getElementById('navbar-admin-btn');

    const openAuth = () => authOpen.set(true);
    const openOrders = () => orderHistoryOpen.set(true);
    const openAdmin = () => adminPanelOpen.set(true);

    signInBtn?.addEventListener('click', openAuth);
    ordersBtn?.addEventListener('click', openOrders);
    adminBtn?.addEventListener('click', openAdmin);

    return () => {
      signInBtn?.removeEventListener('click', openAuth);
      ordersBtn?.removeEventListener('click', openOrders);
      adminBtn?.removeEventListener('click', openAdmin);
    };
  }, []);

  // Sync Navbar button labels + visibility to auth state
  useEffect(() => {
    const signInBtn = document.getElementById('navbar-auth-btn');
    const ordersBtn = document.getElementById('navbar-orders-btn');
    const adminBtn = document.getElementById('navbar-admin-btn');

    if (auth.user) {
      if (signInBtn) {
        signInBtn.textContent = auth.user.name.split(' ')[0];
        signInBtn.setAttribute('aria-label', 'Account — click to sign out');
      }
      if (ordersBtn) ordersBtn.style.display = '';
      if (adminBtn) adminBtn.style.display = auth.user.role === 'admin' ? '' : 'none';
    } else {
      if (signInBtn) {
        signInBtn.textContent = 'Sign In';
        signInBtn.setAttribute('aria-label', 'Sign in to your account');
      }
      if (ordersBtn) ordersBtn.style.display = 'none';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  }, [auth]);

  const handleClose = () => {
    authOpen.set(false);
    setErrors({});
  };

  const switchTab = (t: Tab) => { setTab(t); setErrors({}); };

  const validateLogin = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!EMAIL_RE.test(loginForm.email.trim())) e.email = 'Valid email required.';
    if (loginForm.password.length < 6) e.password = 'Password must be at least 6 characters.';
    return e;
  };

  const validateRegister = (): FieldErrors => {
    const e: FieldErrors = {};
    if (registerForm.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!EMAIL_RE.test(registerForm.email.trim())) e.email = 'Valid email required.';
    if (registerForm.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (registerForm.phone && !PHONE_RE.test(registerForm.phone)) e.phone = 'Invalid phone number.';
    return e;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateLogin();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await authApi.login({ email: loginForm.email.trim(), password: loginForm.password });
      setAuth(res.token, { id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role as 'customer' | 'admin' });
      authOpen.set(false);
      setLoginForm(EMPTY_LOGIN);
      showToast(`Welcome back, ${res.user.name.split(' ')[0]}!`, 'success');
    } catch (err) {
      setErrors({ global: err instanceof Error ? err.message : 'Login failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateRegister();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setErrors({});
    try {
      const body: { name: string; email: string; password: string; phone?: string } = {
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
      };
      if (registerForm.phone.trim()) body.phone = registerForm.phone.trim();
      const res = await authApi.register(body);
      setAuth(res.token, { id: res.user.id, name: res.user.name, email: res.user.email, role: res.user.role as 'customer' | 'admin' });
      authOpen.set(false);
      setRegisterForm(EMPTY_REGISTER);
      showToast(`Account created! Welcome, ${res.user.name.split(' ')[0]}.`, 'success');
    } catch (err) {
      setErrors({ global: err instanceof Error ? err.message : 'Registration failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    clearAuth();
    authOpen.set(false);
    showToast('Signed out.', 'info');
  };

  return (
    <div
      className={`modal-overlay${open ? ' modal-overlay--visible' : ''}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={auth.user ? 'Account' : tab === 'login' ? 'Sign in' : 'Create account'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">
            {auth.user ? `Hi, ${auth.user.name.split(' ')[0]}` : tab === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button className="modal__close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="modal__body">
          {auth.user ? (
            <div className="auth-modal__signed-in">
              <p className="auth-modal__signed-in-email">
                Signed in as <strong>{auth.user.email}</strong>
              </p>
              {auth.user.role === 'admin' && (
                <p className="auth-modal__role-badge">Admin</p>
              )}
              <button className="btn btn--outline" style={{ width: '100%' }} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <div className="auth-modal__tabs" role="tablist">
                <button
                  className={`auth-modal__tab${tab === 'login' ? ' auth-modal__tab--active' : ''}`}
                  role="tab"
                  aria-selected={tab === 'login'}
                  type="button"
                  onClick={() => switchTab('login')}
                >
                  Sign In
                </button>
                <button
                  className={`auth-modal__tab${tab === 'register' ? ' auth-modal__tab--active' : ''}`}
                  role="tab"
                  aria-selected={tab === 'register'}
                  type="button"
                  onClick={() => switchTab('register')}
                >
                  Create Account
                </button>
              </div>

              {errors.global && (
                <div className="form-error auth-modal__global-error" role="alert">
                  {errors.global}
                </div>
              )}

              {tab === 'login' ? (
                <form onSubmit={handleLogin} noValidate>
                  <div className="form-group">
                    <label className="form-label form-label--required" htmlFor="login-email">
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      className={`form-input${errors.email ? ' form-input--error' : ''}`}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                      autoComplete="email"
                      required
                    />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label--required" htmlFor="login-password">
                      Password
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      className={`form-input${errors.password ? ' form-input--error' : ''}`}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                      autoComplete="current-password"
                      required
                    />
                    {errors.password && <span className="form-error">{errors.password}</span>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary auth-modal__submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate>
                  <div className="form-group">
                    <label className="form-label form-label--required" htmlFor="reg-name">
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      className={`form-input${errors.name ? ' form-input--error' : ''}`}
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                      autoComplete="name"
                      required
                    />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label--required" htmlFor="reg-email">
                      Email
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      className={`form-input${errors.email ? ' form-input--error' : ''}`}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                      autoComplete="email"
                      required
                    />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label--required" htmlFor="reg-password">
                      Password
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      className={`form-input${errors.password ? ' form-input--error' : ''}`}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                      autoComplete="new-password"
                      required
                    />
                    {errors.password && <span className="form-error">{errors.password}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-phone">
                      Phone <span className="auth-modal__optional">(optional)</span>
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      className={`form-input${errors.phone ? ' form-input--error' : ''}`}
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value }))}
                      autoComplete="tel"
                    />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary auth-modal__submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
