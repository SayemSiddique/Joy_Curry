import { useState, useEffect } from 'react';
import { Menu, Bell, Clock, ShoppingBag, X, ChevronDown, Sparkles } from 'lucide-react';
import { NavigationMenu, Dialog } from '@joy-curry/ui';
import { CategoryIcon } from '@lib/categoryIcons';
import type { ReadableAtom } from 'nanostores';
import {
  cartCount,
  cartOpen,
  authState,

  vaultOpen,
  adminPanelOpen,
  hasActiveOrder,
  mobileNavDrawerOpen,
  CATEGORIES,
  sectionId,
  type AuthState,
} from '@lib/core';

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

  // Desktop MENU dropdown + mobile drawer now run on Base UI (NavigationMenu +
  // Dialog): open/close intent, ESC, outside-pointer dismiss, focus trap, and
  // focus return are all handled by the primitives — replacing the manual
  // outside-click/ESC effects, the drawer keydown effect, and useFocusTrap.

  const closeDrawer = () => mobileNavDrawerOpen.set(false);

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
            {/* MENU dropdown — Base UI NavigationMenu supplies the trigger ARIA,
                keyboard/hover/focus intent, ESC + outside-pointer dismiss, focus
                management, and the anchored portaled panel. Parts pass `unstyled`
                so the panel keeps its own brand CSS (.navbar__menu-*). */}
            <NavigationMenu.Root className="navbar__menu-dd">
              <NavigationMenu.List className="navbar__menu-list">
                <NavigationMenu.Item className="navbar__menu-item-root">
                  <NavigationMenu.Trigger className="navbar__nav-link navbar__menu-trigger">
                    MENU
                    <NavigationMenu.Icon>
                      <ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" />
                    </NavigationMenu.Icon>
                  </NavigationMenu.Trigger>
                  <NavigationMenu.Content unstyled className="navbar__menu-panel-content">
                    <NavigationMenu.Link
                      render={<a />}
                      href="/order"
                      className="navbar__menu-panel-all"
                    >
                      View full menu →
                    </NavigationMenu.Link>
                    <div className="navbar__menu-grid">
                      {CATEGORIES.map((c) => (
                        <NavigationMenu.Link
                          key={c.id}
                          render={<a />}
                          href={`/order#${sectionId(c.id)}`}
                          className="navbar__menu-item"
                        >
                          <span className="navbar__menu-item-icon" aria-hidden="true"><CategoryIcon id={c.id} size={16} /></span>
                          {c.label}
                        </NavigationMenu.Link>
                      ))}
                    </div>
                  </NavigationMenu.Content>
                </NavigationMenu.Item>
              </NavigationMenu.List>
              <NavigationMenu.Portal>
                <NavigationMenu.Positioner
                  unstyled
                  className="navbar__menu-positioner"
                  side="bottom"
                  align="start"
                  sideOffset={-1}
                >
                  <NavigationMenu.Popup unstyled className="navbar__menu-panel">
                    <NavigationMenu.Viewport />
                  </NavigationMenu.Popup>
                </NavigationMenu.Positioner>
              </NavigationMenu.Portal>
            </NavigationMenu.Root>
            <a href="/#story" className="navbar__nav-link">OUR STORY</a>
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
              ><Sparkles size={15} strokeWidth={2} aria-hidden="true" /> VAULT</button>
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
              <a
                href="/signin"
                className="navbar__btn navbar__btn--ghost navbar__auth-btn"
                aria-label="Sign in or create an account"
              >
                Sign In <span className="navbar__auth-sep" aria-hidden="true">|</span> Sign Up
              </a>
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

      {/* Mobile order drawer — Base UI Dialog as a left-side sheet. Base UI
          supplies role=dialog, focus trap + return, ESC, backdrop-press close,
          scroll-lock, and inert background (replacing useFocusTrap + the manual
          ESC/overlay-click handlers). Parts pass `unstyled` to keep the drawer's
          own .nav-drawer CSS. */}
      <Dialog.Root open={drawerOpen} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop unstyled className="nav-drawer-overlay nav-drawer-overlay--bui" />
          <Dialog.Popup unstyled className="nav-drawer nav-drawer--open">
            <Dialog.Title unstyled className="sr-only">Menu</Dialog.Title>
            <Dialog.Close unstyled className="nav-drawer__close" aria-label="Close menu">
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </Dialog.Close>
            <nav className="nav-drawer__links" aria-label="Site sections">
              <a href="/order" onClick={closeDrawer}>MENU</a>
              <a href="/#story" onClick={closeDrawer}>OUR STORY</a>
            </nav>
            <div className="nav-drawer__divider" />
            <nav className="nav-drawer__links" aria-label="Account">
              {auth.user ? (
                <a href="/account" onClick={closeDrawer}>{auth.user.name.split(' ')[0]}</a>
              ) : (
                <a href="/signin" onClick={closeDrawer}>Sign In / Sign Up</a>
              )}
              {auth.user && (
                <a href="/orders">My Orders</a>
              )}
              {auth.user && (
                <button type="button" onClick={() => { vaultOpen.set(true); closeDrawer(); }}>
                  <Sparkles size={15} strokeWidth={2} aria-hidden="true" /> Vault
                </button>
              )}
              {auth.user?.role === 'admin' && (
                <button type="button" onClick={() => { adminPanelOpen.set(true); closeDrawer(); }}>
                  Admin
                </button>
              )}
            </nav>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
