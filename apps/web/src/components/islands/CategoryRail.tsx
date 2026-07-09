import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  activeCategory,
  setActiveCategory,
  sectionId,
  deepLinkCategory,
} from '@lib/core';
import { CategoryIcon } from '@lib/categoryIcons';

// Same useNano pattern used by all other islands — avoids @nanostores/react
// (useSyncExternalStore is buggy under React 19 + Astro SSR).
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

interface Category {
  id: string;
  label: string;
  emoji?: string;
}

interface Props {
  categories: Category[];
}

/** Height of the sticky navbar + toolbar + header, measured live (responsive). */
function stickyOffset(): number {
  if (typeof document === 'undefined') return 0;
  const sel = ['.navbar', '.toolbar', '.category-nav'];
  return sel.reduce((sum, s) => {
    const el = document.querySelector<HTMLElement>(s);
    return sum + (el?.offsetHeight ?? 0);
  }, 0);
}

function scrollToCategory(id: string): void {
  const section = document.getElementById(sectionId(id));
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY - stickyOffset() - 8;
  window.scrollTo({ top, behavior: 'smooth' });
}

export default function CategoryRail({ categories }: Props) {
  const active = useNano(activeCategory);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Suppress the scroll-spy briefly right after a click so the smooth scroll
  // doesn't flicker the highlight through intermediate sections.
  const lockUntil = useRef(0);

  const activeCat = categories.find((c) => c.id === active) ?? categories[0];
  const activeLabel = activeCat?.label ?? 'Menu';

  const select = (id: string) => {
    lockUntil.current = Date.now() + 700;
    setActiveCategory(id);
    setOpen(false);
    scrollToCategory(id);
    history.replaceState(null, '', `#${sectionId(id)}`);
  };

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Keep the active option scrolled into view when the dropdown opens.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  // Deep-link: ?category= / #cat-* auto-activates + scrolls on load.
  useEffect(() => {
    const target = deepLinkCategory();
    if (!target || !categories.some((c) => c.id === target)) return;
    setActiveCategory(target);
    // Wait a frame so SSR sections are laid out before measuring offsets.
    requestAnimationFrame(() => {
      lockUntil.current = Date.now() + 700;
      scrollToCategory(target);
    });
  }, [categories]);

  // Scroll-spy: reflect the section currently under the sticky stack.
  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(sectionId(c.id)))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const el = visible[0]?.target as HTMLElement | undefined;
        if (el?.dataset.category) setActiveCategory(el.dataset.category);
      },
      { rootMargin: `-${stickyOffset() + 12}px 0px -65% 0px`, threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav className="category-nav" aria-label="Menu categories" ref={rootRef}>
      <div className="container">
        <button
          type="button"
          className={`category-nav__current${open ? ' category-nav__current--open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="category-nav__current-icon"><CategoryIcon id={activeCat?.id ?? ''} size={18} /></span>
          <span className="category-nav__current-label">{activeLabel}</span>
          <ChevronDown size={20} className="category-nav__chevron" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="category-nav__dropdown" role="listbox" aria-label="Choose a category" ref={listRef}>
          <div className="container">
            {categories.map((cat) => {
              const isActive = active === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="option"
                  data-active={isActive ? 'true' : undefined}
                  aria-selected={isActive}
                  className={`category-nav__option${isActive ? ' category-nav__option--active' : ''}`}
                  onClick={() => select(cat.id)}
                >
                  <span className="category-nav__option-icon"><CategoryIcon id={cat.id} size={18} /></span>
                  <span className="category-nav__option-label">{cat.label}</span>
                  {isActive && <Check size={18} className="category-nav__option-check" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
