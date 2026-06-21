import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import { adminPanelOpen, authState } from '@stores/auth';
import { adminApi, type MenuItem } from '@lib/api';
import { formatPrice } from '@lib/formatters';
import { CATEGORIES } from '@lib/constants';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

type AdminView = 'list' | 'form';

interface FormState {
  itemId?: string;
  name: string;
  category: string;
  description: string;
  priceInput: string;
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
  isVegan: false,
  isVegetarian: false,
  isGlutenFree: false,
  spiceLevel: '',
  inStock: true,
};

export default function AdminPanel() {
  const open = useNano(adminPanelOpen);
  const auth = useNano(authState);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AdminView>('list');
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch all items when drawer opens (admin only)
  useEffect(() => {
    if (!open || !auth.token || auth.user?.role !== 'admin') return;
    setLoading(true);
    setError(null);
    adminApi
      .getAllMenu(auth.token)
      .then(({ data }) => setItems(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, auth.token]);

  // Role gate — all hooks must be called before this return
  if (!auth.user || auth.user.role !== 'admin') return null;

  const handleClose = () => {
    adminPanelOpen.set(false);
    setView('list');
    setDeleteConfirmId(null);
  };

  const handleStockToggle = (item: MenuItem) => {
    if (!auth.token) return;
    const next = !item.inStock;
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, inStock: next } : i)));
    adminApi.toggleStock(item.id, next, auth.token).catch(() => {
      // Revert on failure
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, inStock: item.inStock } : i)));
    });
  };

  const openAddForm = () => {
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setView('form');
  };

  const openEditForm = (item: MenuItem) => {
    setForm({
      itemId: item.id,
      name: item.name,
      category: item.category,
      description: item.description ?? '',
      priceInput: (item.basePriceCents / 100).toFixed(2),
      isVegan: item.isVegan,
      isVegetarian: item.isVegetarian,
      isGlutenFree: item.isGlutenFree,
      spiceLevel: item.spiceLevel ?? '',
      inStock: item.inStock,
    });
    setFormError(null);
    setView('form');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token) return;

    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!form.category) {
      setFormError('Category is required');
      return;
    }
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
      setView('list');
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
      setError((err as Error).message);
      setDeleteConfirmId(null);
    }
  };

  const filtered = items.filter((item) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
          <h2 className="admin-panel__title">
            {view === 'list' ? 'Admin Panel' : form.itemId ? 'Edit Item' : 'New Item'}
          </h2>
          <button
            className="admin-panel__close"
            onClick={view === 'form' ? () => setView('list') : handleClose}
            aria-label={view === 'form' ? 'Back to list' : 'Close admin panel'}
          >
            {view === 'form' ? '← Back' : '✕'}
          </button>
        </div>

        {/* Toolbar (list view only) */}
        {view === 'list' && (
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

        {/* Scrollable content */}
        <div className="admin-panel__content">
          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              {loading && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                  Loading…
                </p>
              )}

              {!loading && error && (
                <div className="admin-panel__error" role="alert">
                  {error}
                </div>
              )}

              {!loading && !error && (
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
                            aria-label={`Toggle stock for ${item.name}: currently ${item.inStock ? 'in stock' : 'sold out'}`}
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
          {view === 'form' && (
            <form className="admin-form" onSubmit={handleFormSubmit} noValidate>
              {formError && (
                <div className="admin-form__error" role="alert">
                  {formError}
                </div>
              )}

              <div className="admin-form__field">
                <label className="admin-form__label" htmlFor="af-name">
                  Name *
                </label>
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
                <label className="admin-form__label" htmlFor="af-category">
                  Category *
                </label>
                <select
                  id="af-category"
                  className="admin-form__select"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  required
                >
                  <option value="">— Select —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form__field">
                <label className="admin-form__label" htmlFor="af-desc">
                  Description
                </label>
                <textarea
                  id="af-desc"
                  className="admin-form__input admin-form__textarea"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="admin-form__field">
                <label className="admin-form__label" htmlFor="af-price">
                  Price (USD) *
                </label>
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
                <label className="admin-form__label" htmlFor="af-spice">
                  Spice Level
                </label>
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
                <button type="button" className="admin-form__cancel" onClick={() => setView('list')}>
                  Cancel
                </button>
                <button type="submit" className="admin-form__submit" disabled={formLoading}>
                  {formLoading ? 'Saving…' : form.itemId ? 'Save Changes' : 'Add to Menu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
