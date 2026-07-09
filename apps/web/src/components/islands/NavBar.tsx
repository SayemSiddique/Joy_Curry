import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Clock, ShoppingBag, X } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  cartCount,
  cartOpen,
  authState,
  authOpen,

  vaultOpen,
  adminPanelOpen,
  hasActiveOrder,
  mobileNavDrawerOpen,
  type AuthState,
} from '@lib/core';
import { useFocusTrap } from '@lib/hooks';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

function usePathname(): string {
  const [path, setPath] = useState('');
  useEffect(() => {
    setPath(window.location.pathname);
  }, []);
  return path;
}

export default function NavBar() {
  const count = useNano(cartCount);
  const auth = useNano<AuthState>(authState);
  const orderBadge = useNano(hasActiveOrder);
  const drawerOpen = useNano(mobileNavDrawerOpen);
  const path = usePathname();

  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen);

  const closeDrawer = () => mobileNavDrawerOpen.set(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const handleBellClick = () => {
    document
      .querySelector('.order-tracker-overlay')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__inner">
          <a href="/" className="navbar__logo" aria-label="Joy Curry &amp; Tandoor — Home">
            <img src="/images/logo/main_logo.png" alt="Joy Curry & Tandoor" className="navbar__logo-img" />
          </a>

          {/* Desktop-only nav links */}
          <nav className="navbar__nav navbar__nav--desktop" aria-label="Site sections">
            <a
              href="/menu"
              className={`navbar__nav-link${path === '/menu' ? ' navbar__nav-link--active' : ''}`}
              aria-current={path === '/menu' ? 'page' : undefined}
            >MENU</a>
            <a href="/#story" className="navbar__nav-link">OUR STORY</a>
            <a href="/#rewards" className="navbar__nav-link">REWARDS</a>
            {auth.user && (
              <a
                className="navbar__nav-link"
                href="/orders"
              >MY ORDERS</a>
            )}
            {auth.user && (
              <button
                type="button"
                className="navbar__nav-link"
                aria-label="Artisan Vault rewards"
                onClick={() => vaultOpen.set(true)}
              >✦ VAULT</button>
            )}
            {auth.user?.role === 'admin' && (
              <button
                type="button"
                className="navbar__nav-link"
                aria-label="Admin panel"
                onClick={() => adminPanelOpen.set(true)}
              >ADMIN</button>
            )}
          </nav>

          {/* Mobile-only order button */}
          <button
            type="button"
            className="navbar__btn navbar__order-btn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => mobileNavDrawerOpen.set(true)}
          >
            <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <div className="navbar__actions">
            <button
              type="button"
              className="navbar__icon-btn"
              aria-label="Order status"
              onClick={handleBellClick}
            >
              <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
              {orderBadge && <span className="navbar__badge-dot" aria-hidden="true" />}
            </button>

            <a
              className="navbar__btn navbar__btn--pill"
              href="/orders"
              aria-label="Order history"
            >
              <Clock size={16} strokeWidth={1.75} aria-hidden="true" /> History
            </a>

            {auth.user ? (
              <a
                href="/account"
                className="navbar__btn navbar__btn--ghost navbar__auth-btn"
                aria-label="My Account"
              >
                {auth.user.name.split(' ')[0]}
              </a>
            ) : (
              <button
                type="button"
                className="navbar__btn navbar__btn--ghost navbar__auth-btn"
                aria-label="Sign in to your account"
                onClick={() => authOpen.set(true)}
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              id="navbar-cart-btn"
              className="navbar__btn navbar__btn--cart"
              aria-label="View cart"
              onClick={() => cartOpen.set(true)}
            >
              <ShoppingBag size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="navbar__btn-label">Cart</span>
              {count > 0 && (
                <span id="cart-count" className="navbar__cart-count" aria-label="items in cart">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>

            <a
              href="/order"
              className={`navbar__cta-block${path === '/order' ? ' navbar__cta-block--active' : ''}`}
              aria-current={path === '/order' ? 'page' : undefined}
            >ORDER ONLINE</a>
          </div>
        </div>
      </nav>

      {/* Mobile order drawer */}
      <div
        className={`nav-drawer-overlay${drawerOpen ? ' nav-drawer-overlay--visible' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={`nav-drawer${drawerOpen ? ' nav-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <button type="button" className="nav-drawer__close" onClick={closeDrawer} aria-label="Close menu">
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <nav className="nav-drawer__links" aria-label="Site sections">
          <a href="/menu" onClick={closeDrawer}>MENU</a>
          <a href="/#story" onClick={closeDrawer}>OUR STORY</a>
          <a href="/#rewards" onClick={closeDrawer}>REWARDS</a>
        </nav>
        <div className="nav-drawer__divider" />
        <nav className="nav-drawer__links" aria-label="Account">
          {auth.user ? (
            <a href="/account" onClick={closeDrawer}>{auth.user.name.split(' ')[0]}</a>
          ) : (
            <button type="button" onClick={() => { authOpen.set(true); closeDrawer(); }}>Sign In</button>
          )}
          {auth.user && (
            <a href="/orders">My Orders</a>
          )}
          {auth.user && (
            <button type="button" onClick={() => { vaultOpen.set(true); closeDrawer(); }}>
              ✦ Vault
            </button>
          )}
          {auth.user?.role === 'admin' && (
            <button type="button" onClick={() => { adminPanelOpen.set(true); closeDrawer(); }}>
              Admin
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
