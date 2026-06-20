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
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const count = applyFiltersToDOM(filters);
    setVisibleCount(count);
  }, [filters]);

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
      <div className="toolbar" role="search" aria-label="Filter menu items">
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
