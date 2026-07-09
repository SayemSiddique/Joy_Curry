import { useState, useEffect } from 'react';
import { UtensilsCrossed, ClipboardList, BarChart2, Truck, ShoppingBag } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import { adminPanelOpen, authState } from '@lib/core';
import { adminApi, type MenuItem, type AdminOrder, type DashboardStats } from '@lib/core';
import { formatPrice } from '@lib/core';
import { CATEGORIES } from '@lib/core';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

type AdminTab = 'menu' | 'orders' | 'dashboard';
type MenuView = 'list' | 'form';

interface FormState {
  itemId?: string;
  name: string;
  category: string;
  description: string;
  priceInput: string;
  imageUrl: string;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  spiceLevel: string;
  inStock: boolean;
}

const EMPTY_FORM: FormState = {
  itemId: undefined,
  name: '',
  category: '',
  description: '',
  priceInput: '',
  imageUrl: '',
  isVegan: false,
  isVegetarian: false,
  isGlutenFree: false,
  spiceLevel: '',
  inStock: true,
};

const ORDER_STATUSES = ['pending', 'confirmed', 'ready', 'completed', 'cancelled'] as const;

function formatOrderDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminPanel() {
  const open = useNano(adminPanelOpen);
  const auth = useNano(authState);

  // ── Tab state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');

  // ── Menu tab state ─────────────────────────────────────────────────────
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<MenuView>('list');
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [imgError, setImgError] = useState(false);

  // ── Orders tab state ───────────────────────────────────────────────────
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // ── Dashboard tab state ────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !auth.token || auth.user?.role !== 'admin') return;
    if (activeTab === 'menu' && items.length === 0) {
      setMenuLoading(true);
      setMenuError(null);
      adminApi
        .getAllMenu(auth.token)
        .then(({ data }) => setItems(data))
        .catch((err: Error) => setMenuError(err.message))
        .finally(() => setMenuLoading(false));
    }
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      setOrdersError(null);
      adminApi
        .getAllOrders(auth.token)
        .then(({ orders: o }) => setOrders(o))
        .catch((err: Error) => setOrdersError(err.message))
        .finally(() => setOrdersLoading(false));
    }
    if (activeTab === 'dashboard') {
      setDashLoading(true);
      setDashError(null);
      adminApi
        .getDashboard(auth.token)
        .then(({ stats: s }) => setStats(s))
        .catch((err: Error) => setDashError(err.message))
        .finally(() => setDashLoading(false));
    }
  }, [open, auth.token, activeTab]);

  // Role gate — all hooks must be called before this return
  if (!auth.user || auth.user.role !== 'admin') return null;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleClose = () => {
    adminPanelOpen.set(false);
    setMenuView('list');
    setDeleteConfirmId(null);
  };

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setMenuView('list');
    setDeleteConfirmId(null);
  };

  const handleStockToggle = (item: MenuItem) => {
    if (!auth.token) return;
    const next = !item.inStock;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, inStock: next } : i)));
    adminApi.toggleStock(item.id, next, auth.token).catch(() => {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, inStock: item.inStock } : i)));
    });
  };

  const openAddForm = () => {
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setImgError(false);
    setMenuView('form');
  };

  const openEditForm = (item: MenuItem) => {
    setForm({
      itemId: item.id,
      name: item.name,
      category: item.category,
      description: item.description ?? '',
      priceInput: (item.basePriceCents / 100).toFixed(2),
      imageUrl: item.imageUrl ?? '',
      isVegan: item.isVegan,
      isVegetarian: item.isVegetarian,
      isGlutenFree: item.isGlutenFree,
      spiceLevel: item.spiceLevel ?? '',
      inStock: item.inStock,
    });
    setFormError(null);
    setImgError(false);
    setMenuView('form');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;

    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.category) { setFormError('Category is required'); return; }
    const priceCents = Math.round(parseFloat(form.priceInput) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      setFormError('Enter a valid price (e.g. 12.95)');
      return;
    }

    const body = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      basePriceCents: priceCents,
      imageUrl: form.imageUrl.trim() || null,
      isVegan: form.isVegan,
      isVegetarian: form.isVegetarian,
      isGlutenFree: form.isGlutenFree,
      isHalal: true,
      spiceLevel: form.spiceLevel || null,
      inStock: form.inStock,
      isActive: true,
    };

    setFormLoading(true);
    setFormError(null);

    try {
      if (form.itemId) {
        const { data } = await adminApi.updateItem(form.itemId, body, auth.token);
        setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
      } else {
        const { data } = await adminApi.createItem(body, auth.token);
        setItems((prev) => [data, ...prev]);
      }
      setMenuView('list');
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId || !auth.token) return;
    try {
      await adminApi.deleteItem(deleteConfirmId, auth.token);
      setItems((prev) => prev.filter((i) => i.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      setMenuError((err as Error).message);
      setDeleteConfirmId(null);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    if (!auth.token) return;
    setStatusUpdating(orderId);
    try {
      const { order: updated } = await adminApi.updateOrderStatus(orderId, status, auth.token);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o))
      );
    } catch (err) {
      setOrdersError((err as Error).message);
    } finally {
      setStatusUpdating(null);
    }
  };

  const filtered = items.filter((item) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isFormView = activeTab === 'menu' && menuView === 'form';
  const headerTitle = isFormView
    ? (form.itemId ? 'Edit Item' : 'New Item')
    : activeTab === 'menu' ? 'Menu Items'
    : activeTab === 'orders' ? 'Orders'
    : 'Dashboard';

  return (
    <>
      {/* Overlay */}
      <div
        className={`admin-panel-overlay${open ? ' admin-panel-overlay--visible' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion">
          <div className="admin-confirm">
            <p className="admin-confirm__message">
              Remove this item? It will be soft-deleted and hidden from customers immediately.
            </p>
            <div className="admin-confirm__actions">
              <button className="admin-confirm__cancel" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button className="admin-confirm__delete" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div
        className={`admin-panel${open ? ' admin-panel--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin panel"
      >
        {/* Header */}
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">{headerTitle}</h2>
          <button
            className="admin-panel__close"
            onClick={isFormView ? () => setMenuView('list') : handleClose}
            aria-label={isFormView ? 'Back to list' : 'Close admin panel'}
          >
            {isFormView ? '← Back' : '✕'}
          </button>
        </div>

        {/* Tab nav — hidden when in form view */}
        {!isFormView && (
          <div className="admin-tabs" role="tablist" aria-label="Admin sections">
            {(['menu', 'orders', 'dashboard'] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`admin-tab${activeTab === tab ? ' admin-tab--active' : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab === 'menu' ? <><UtensilsCrossed size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />Menu</> : tab === 'orders' ? <><ClipboardList size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />Orders</> : <><BarChart2 size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }} />Dashboard</>}
              </button>
            ))}
          </div>
        )}

        {/* ── MENU TAB ── */}
        {activeTab === 'menu' && (
          <>
            {/* Toolbar (list view only) */}
            {menuView === 'list' && (
              <div className="admin-panel__toolbar">
                <input
                  type="search"
                  className="admin-panel__search"
                  placeholder="Search items…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  aria-label="Filter menu items"
                />
                <button className="admin-panel__add-btn" onClick={openAddForm}>
                  + Add Item
                </button>
              </div>
            )}

            <div className="admin-panel__content">
              {/* ── LIST VIEW ── */}
              {menuView === 'list' && (
                <>
                  {menuLoading && (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                      Loading…
                    </p>
                  )}
                  {!menuLoading && menuError && (
                    <div className="admin-panel__error" role="alert">{menuError}</div>
                  )}
                  {!menuLoading && !menuError && (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => (
                          <tr key={item.id} className={!item.isActive ? 'admin-row--inactive' : ''}>
                            <td style={{ fontWeight: 'var(--weight-medium)' }}>{item.name}</td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                              {item.category}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                              {formatPrice(item.basePriceCents)}
                            </td>
                            <td>
                              <button
                                className={item.inStock ? 'admin-badge--in' : 'admin-badge--out'}
                                onClick={() => handleStockToggle(item)}
                                aria-label={`Toggle stock for ${item.name}`}
                              >
                                {item.inStock ? 'In Stock' : 'Sold Out'}
                              </button>
                            </td>
                            <td>
                              <div className="admin-table__actions">
                                <button
                                  className="admin-btn-edit"
                                  onClick={() => openEditForm(item)}
                                  aria-label={`Edit ${item.name}`}
                                >
                                  Edit
                                </button>
                                <button
                                  className="admin-btn-delete"
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  aria-label={`Delete ${item.name}`}
                                >
                                  Del
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ── FORM VIEW ── */}
              {menuView === 'form' && (
                <form className="admin-form" onSubmit={handleFormSubmit} noValidate>
                  {formError && (
                    <div className="admin-form__error" role="alert">{formError}</div>
                  )}

                  <div className="admin-form__field">
                    <label className="admin-form__label" htmlFor="af-name">Name *</label>
                    <input
                      id="af-name"
                      type="text"
                      className="admin-form__input"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="admin-form__field">
                    <label className="admin-form__label" htmlFor="af-category">Category *</label>
                    <select
                      id="af-category"
                      className="admin-form__select"
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                      required
                    >
                      <option value="">— Select —</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form__field">
                    <label className="admin-form__label" htmlFor="af-desc">Description</label>
                    <textarea
                      id="af-desc"
                      className="admin-form__input admin-form__textarea"
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="admin-form__field">
                    <label className="admin-form__label" htmlFor="af-price">Price (USD) *</label>
                    <input
                      id="af-price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="admin-form__input"
                      value={form.priceInput}
                      onChange={(e) => setField('priceInput', e.target.value)}
                      placeholder="12.95"
                      required
                    />
                  </div>

                  <div className="admin-form__field">
                    <label className="admin-form__label" htmlFor="af-image">Image URL</label>
                    <input
                      id="af-image"
                      type="url"
                      className="admin-form__input"
                      value={form.imageUrl}
                      onChange={(e) => { setField('imageUrl', e.target.value); setImgError(false); }}
                      placeholder="https://images.unsplash.com/photo-..."
                    />
                    {form.imageUrl && !imgError ? (
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="admin-form__img-preview"
                        onError={() => setImgError(true)}
                      />
                    ) : form.imageUrl && imgError ? (
                      <div className="admin-form__img-placeholder">Image not found</div>
                    ) : (
                      <div className="admin-form__img-placeholder">No image URL set</div>
                    )}
                  </div>

                  <div className="admin-form__field">
                    <label className="admin-form__label" htmlFor="af-spice">Spice Level</label>
                    <select
                      id="af-spice"
                      className="admin-form__select"
                      value={form.spiceLevel}
                      onChange={(e) => setField('spiceLevel', e.target.value)}
                    >
                      <option value="">None</option>
                      <option value="Mild">Mild</option>
                      <option value="Medium">Medium</option>
                      <option value="Hot">Hot</option>
                    </select>
                  </div>

                  <div className="admin-form__checkbox-group">
                    {(
                      [
                        { id: 'af-vegan', key: 'isVegan', label: 'Vegan' },
                        { id: 'af-veg', key: 'isVegetarian', label: 'Vegetarian' },
                        { id: 'af-gf', key: 'isGlutenFree', label: 'Gluten-Free' },
                        { id: 'af-instock', key: 'inStock', label: 'In Stock' },
                      ] as const
                    ).map(({ id, key, label }) => (
                      <label key={id} className="admin-form__check-label">
                        <input
                          id={id}
                          type="checkbox"
                          checked={form[key] as boolean}
                          onChange={(e) => setField(key, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="admin-form__actions">
                    <button type="button" className="admin-form__cancel" onClick={() => setMenuView('list')}>
                      Cancel
                    </button>
                    <button type="submit" className="admin-form__submit" disabled={formLoading}>
                      {formLoading ? 'Saving…' : form.itemId ? 'Save Changes' : 'Add to Menu'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div className="admin-panel__content">
            {ordersLoading && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                Loading…
              </p>
            )}
            {!ordersLoading && ordersError && (
              <div className="admin-panel__error" role="alert">{ordersError}</div>
            )}
            {!ordersLoading && !ordersError && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div className="admin-order-id">#{order.id.slice(0, 8)}</div>
                        <div className="admin-order-meta">{formatOrderDate(order.created_at)}</div>
                        {order.scheduled_for && (
                          <div className="admin-order-meta">⏰ {order.scheduled_for.slice(11, 16)}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}>
                        {order.delivery_type === 'delivery' ? <Truck size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} /> : <ShoppingBag size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />}{order.delivery_type}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {formatPrice(order.total_cents)}
                      </td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={order.status}
                          disabled={statusUpdating === order.id}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          aria-label={`Status for order ${order.id.slice(0, 8)}`}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>
                        No orders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <div className="admin-panel__content">
            {dashLoading && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                Loading…
              </p>
            )}
            {!dashLoading && dashError && (
              <div className="admin-panel__error" role="alert">{dashError}</div>
            )}
            {!dashLoading && !dashError && stats && (
              <div className="admin-dashboard">
                <div className="admin-stat-card">
                  <div className="admin-stat-value">{stats.todayOrderCount}</div>
                  <div className="admin-stat-label">Orders Today</div>
                </div>
                <div className="admin-stat-card">
                  <div className="admin-stat-value">{formatPrice(stats.todayRevenueCents)}</div>
                  <div className="admin-stat-label">Revenue Today</div>
                </div>
                <div className="admin-stat-card admin-stat-card--pending admin-stat-card--full">
                  <div className="admin-stat-value">{stats.pendingOrderCount}</div>
                  <div className="admin-stat-label">Pending Orders</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
