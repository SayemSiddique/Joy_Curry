import { useState, useEffect, useRef } from 'react';
import type { MenuItem } from '@lib/api';
import { CATEGORIES, DIETARY_FILTERS, SPICE_LEVELS } from '@lib/constants';
import { formatPrice } from '@lib/formatters';

interface Props {
  menuItems: MenuItem[];
}

interface Filters {
  query: string;
  category: string;
  dietary: string[];
  spiceLevel: string;
  maxPriceCents: number;
}

function applyFiltersToDOM(f: Filters): number {
  const query = f.query.toLowerCase().trim();
  let visibleCount = 0;

  document.querySelectorAll<HTMLElement>('.menu-card').forEach(card => {
    const cardName = (card.dataset.name ?? '').toLowerCase();
    const keywords = (card.dataset.keywords ?? '').toLowerCase();
    const category = card.dataset.category ?? '';
    const priceCents = parseInt(card.dataset.priceCents ?? '0', 10);
    const isVegan = card.dataset.isVegan === 'true';
    const isVegetarian = card.dataset.isVegetarian === 'true';
    const isGlutenFree = card.dataset.isGlutenFree === 'true';
    const spiceLevel = card.dataset.spiceLevel ?? '';

    let visible = true;
    if (query && !cardName.includes(query) && !keywords.includes(query)) visible = false;
    if (f.category && category !== f.category) visible = false;
    if (f.dietary.includes('vegan') && !isVegan) visible = false;
    if (f.dietary.includes('vegetarian') && !isVegetarian) visible = false;
    if (f.dietary.includes('gluten-free') && !isGlutenFree) visible = false;
    if (f.spiceLevel && spiceLevel !== f.spiceLevel) visible = false;
    if (priceCents > f.maxPriceCents) visible = false;

    card.classList.toggle('menu-card--hidden', !visible);
    if (visible) visibleCount++;
  });

  document.querySelectorAll<HTMLElement>('.menu-section').forEach(section => {
    const hasVisible = section.querySelectorAll('.menu-card:not(.menu-card--hidden)').length > 0;
    section.classList.toggle('menu-section--hidden', !hasVisible);
  });

  return visibleCount;
}

export default function SearchFilterBar({ menuItems }: Props) {
  const maxItemPrice = Math.max(...menuItems.map(i => i.basePriceCents), 100);

  const defaultFilters: Filters = {
    query: '',
    category: '',
    dietary: [],
    spiceLevel: '',
    maxPriceCents: maxItemPrice,
  };

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [visibleCount, setVisibleCount] = useState(menuItems.length);
  const [viewMode, setViewMode] = useState<'grid' | 'mosaic'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('menu-view-mode') as 'grid' | 'mosaic') ?? 'grid';
    }
    return 'grid';
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Keep --toolbar-offset in sync with the actual rendered toolbar height so
  // the category rail's sticky top is always exactly right, even on mobile where
  // the toolbar wraps to multiple lines.
  useEffect(() => {
    const update = () => {
      const h = toolbarRef.current?.offsetHeight ?? 65;
      document.documentElement.style.setProperty('--toolbar-offset', `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const count = applyFiltersToDOM(filters);
    setVisibleCount(count);
  }, [filters]);

  useEffect(() => {
    const menu = document.getElementById('menu');
    if (!menu) return;
    menu.classList.toggle('menu-grid--mosaic', viewMode === 'mosaic');
    localStorage.setItem('menu-view-mode', viewMode);
  }, [viewMode]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, query: value }));
    }, 300);
  };

  const toggleDietary = (id: string) => {
    setFilters(f => ({
      ...f,
      dietary: f.dietary.includes(id)
        ? f.dietary.filter(d => d !== id)
        : [...f.dietary, id],
    }));
  };

  const reset = () => {
    if (searchRef.current) searchRef.current.value = '';
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters(defaultFilters);
  };

  const isFiltered =
    filters.query !== '' ||
    filters.category !== '' ||
    filters.dietary.length > 0 ||
    filters.spiceLevel !== '' ||
    filters.maxPriceCents < maxItemPrice;

  return (
    <>
      <div ref={toolbarRef} className="toolbar" role="search" aria-label="Filter menu items">
        <div className="container">
          <div className="toolbar__inner">
            {/* Search */}
            <div className="toolbar__search">
              <span className="toolbar__search-icon" aria-hidden="true">🔍</span>
              <input
                ref={searchRef}
                type="search"
                placeholder="Search dishes…"
                onChange={handleSearchInput}
                aria-label="Search menu items"
              />
            </div>

            <div className="toolbar__divider" aria-hidden="true" />

            {/* Category */}
            <select
              className="toolbar__select"
              value={filters.category}
              onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>

            <div className="toolbar__divider" aria-hidden="true" />

            {/* Dietary toggles */}
            {DIETARY_FILTERS.map(d => (
              <button
                key={d.id}
                type="button"
                className={`toolbar__filter-btn${filters.dietary.includes(d.id) ? ' toolbar__filter-btn--active' : ''}`}
                onClick={() => toggleDietary(d.id)}
                aria-pressed={filters.dietary.includes(d.id)}
              >
                {d.label}
              </button>
            ))}

            <div className="toolbar__divider" aria-hidden="true" />

            {/* Spice level */}
            <select
              className="toolbar__select"
              value={filters.spiceLevel}
              onChange={e => setFilters(f => ({ ...f, spiceLevel: e.target.value }))}
              aria-label="Filter by spice level"
            >
              <option value="">Any Spice</option>
              {Object.entries(SPICE_LEVELS).map(([key, { label, icon }]) => (
                <option key={key} value={key}>
                  {icon} {label}
                </option>
              ))}
            </select>

            {/* Max price slider */}
            <div className="toolbar__price">
              <span className="toolbar__price-label">Max</span>
              <input
                type="range"
                min={0}
                max={maxItemPrice}
                step={50}
                value={filters.maxPriceCents}
                onChange={e =>
                  setFilters(f => ({ ...f, maxPriceCents: parseInt(e.target.value, 10) }))
                }
                aria-label={`Max price: ${formatPrice(filters.maxPriceCents)}`}
              />
              <span className="toolbar__price-value">{formatPrice(filters.maxPriceCents)}</span>
            </div>

            {/* Reset */}
            {isFiltered && (
              <>
                <div className="toolbar__divider" aria-hidden="true" />
                <button
                  type="button"
                  className="toolbar__filter-btn"
                  onClick={reset}
                  aria-label="Reset all filters"
                >
                  ✕ Reset
                </button>
              </>
            )}

            {/* View mode toggle */}
            <div className="toolbar__divider" aria-hidden="true" />
            <button
              type="button"
              className={`toolbar__view-btn${viewMode === 'mosaic' ? ' toolbar__view-btn--active' : ''}`}
              onClick={() => setViewMode(v => v === 'grid' ? 'mosaic' : 'grid')}
              aria-label={viewMode === 'grid' ? 'Switch to photo mosaic view' : 'Switch to grid view'}
              title={viewMode === 'grid' ? 'Photo mosaic' : 'Card grid'}
            >
              {viewMode === 'grid' ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>
                  <rect x="9" y="1" width="8" height="6" rx="1" fill="currentColor"/>
                  <rect x="1" y="9" width="8" height="8" rx="1" fill="currentColor"/>
                  <rect x="11" y="9" width="6" height="8" rx="1" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="7" height="7" rx="1" fill="currentColor"/>
                  <rect x="10" y="1" width="7" height="7" rx="1" fill="currentColor"/>
                  <rect x="1" y="10" width="7" height="7" rx="1" fill="currentColor"/>
                  <rect x="10" y="10" width="7" height="7" rx="1" fill="currentColor"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* No-results message rendered into the menu container */}
      {isFiltered && visibleCount === 0 && (
        <div className="container">
          <div className="filter-no-results">
            <span className="filter-no-results__icon">🍽️</span>
            <span className="filter-no-results__text">
              No dishes match your filters.
            </span>
            <button type="button" className="btn btn--secondary btn--sm" onClick={reset}>
              Clear filters
            </button>
          </div>
        </div>
      )}
    </>
  );
}
