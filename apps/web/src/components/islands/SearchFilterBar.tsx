import { useState, useEffect, useRef } from 'react';
import { Search, Utensils } from 'lucide-react';
import { Select, ToggleGroup, Toggle } from '@joy-curry/ui';
import { CategoryIcon } from '@lib/categoryIcons';
import type { MenuItem } from '@lib/core';
import { CATEGORIES, DIETARY_FILTERS, SPICE_LEVELS } from '@lib/core';
import { formatPrice } from '@lib/core';

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
              <Search size={15} className="toolbar__search-icon" aria-hidden="true" />
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
            <Select.Root
              value={filters.category}
              onValueChange={v => setFilters(f => ({ ...f, category: v as string }))}
            >
              <Select.Trigger className="toolbar__select toolbar__select--icon" aria-label="Filter by category">
                <Select.Value>
                  {(val: string) => {
                    const cat = val ? CATEGORIES.find(c => c.id === val) : null;
                    return (
                      <span className="toolbar__select-value">
                        {cat && <CategoryIcon id={cat.id} size={15} />}
                        {cat ? cat.label : 'All Categories'}
                      </span>
                    );
                  }}
                </Select.Value>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner align="start" sideOffset={6}>
                  <Select.Popup>
                    <Select.Item value="">
                      <Select.ItemText>All Categories</Select.ItemText>
                    </Select.Item>
                    {CATEGORIES.map(cat => (
                      <Select.Item key={cat.id} value={cat.id}>
                        <span className="jc-select__item-icon"><CategoryIcon id={cat.id} size={16} /></span>
                        <Select.ItemText>{cat.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>

            <div className="toolbar__divider" aria-hidden="true" />

            {/* Dietary toggles */}
            <ToggleGroup
              unstyled
              className="toolbar__dietary"
              value={filters.dietary}
              onValueChange={v => setFilters(f => ({ ...f, dietary: v as string[] }))}
              multiple
              aria-label="Dietary filters"
            >
              {DIETARY_FILTERS.map(d => (
                <Toggle
                  key={d.id}
                  value={d.id}
                  unstyled
                  className={`toolbar__filter-btn${filters.dietary.includes(d.id) ? ' toolbar__filter-btn--active' : ''}`}
                >
                  {d.label}
                </Toggle>
              ))}
            </ToggleGroup>

            <div className="toolbar__divider" aria-hidden="true" />

            {/* Spice level */}
            <Select.Root
              value={filters.spiceLevel}
              onValueChange={v => setFilters(f => ({ ...f, spiceLevel: v as string }))}
            >
              <Select.Trigger className="toolbar__select" aria-label="Filter by spice level">
                <Select.Value>
                  {(val: string) => {
                    const lvl = val ? SPICE_LEVELS[val as keyof typeof SPICE_LEVELS] : null;
                    return lvl ? `${lvl.icon} ${lvl.label}` : 'Any Spice';
                  }}
                </Select.Value>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner align="start" sideOffset={6}>
                  <Select.Popup>
                    <Select.Item value="">
                      <Select.ItemText>Any Spice</Select.ItemText>
                    </Select.Item>
                    {Object.entries(SPICE_LEVELS).map(([key, { label, icon }]) => (
                      <Select.Item key={key} value={key}>
                        <Select.ItemText>{icon} {label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>

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
            <Utensils size={40} className="filter-no-results__icon" aria-hidden="true" />
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
