import { useEffect, useRef, useState } from 'react';
import { Utensils, Salad, Soup, Sprout, Leaf, Fish, Flame, Wheat, Clock, Croissant, Coffee, Cake, Droplets, Package2, Star, UtensilsCrossed } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import {
  activeCategory,
  setActiveCategory,
  sectionId,
  deepLinkCategory,
} from '@lib/core';

// Same useNano pattern used by all other islands — avoids @nanostores/react
// (useSyncExternalStore is buggy under React 19 + Astro SSR).
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'appetizer':        <Utensils size={15} aria-hidden="true" />,
  'salad':            <Salad size={15} aria-hidden="true" />,
  'soup':             <Soup size={15} aria-hidden="true" />,
  'vegetable-entree': <Sprout size={15} aria-hidden="true" />,
  'vegan-entree':     <Leaf size={15} aria-hidden="true" />,
  'chicken-entree':   <Utensils size={15} aria-hidden="true" />,
  'meat-entree':      <UtensilsCrossed size={15} aria-hidden="true" />,
  'fish-shrimp':      <Fish size={15} aria-hidden="true" />,
  'tandoori':         <Flame size={15} aria-hidden="true" />,
  'rice-biryani':     <Wheat size={15} aria-hidden="true" />,
  'express-lunch':    <Clock size={15} aria-hidden="true" />,
  'bread':            <Croissant size={15} aria-hidden="true" />,
  'side':             <Soup size={15} aria-hidden="true" />,
  'condiment':        <Droplets size={15} aria-hidden="true" />,
  'dessert':          <Cake size={15} aria-hidden="true" />,
  'beverage':         <Coffee size={15} aria-hidden="true" />,
  'dinner-special':   <Star size={15} aria-hidden="true" />,
  'combo':            <Package2 size={15} aria-hidden="true" />,
};

interface Category {
  id: string;
  label: string;
  emoji?: string;
}

interface Props {
  categories: Category[];
}

/** Height of the sticky navbar + toolbar + rail, measured live (responsive). */
function stickyOffset(): number {
  if (typeof document === 'undefined') return 0;
  const sel = ['.navbar', '.toolbar', '.category-rail'];
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
  const railRef = useRef<HTMLDivElement>(null);
  // Suppress the scroll-spy briefly right after a click so the smooth scroll
  // doesn't flicker the highlight through intermediate sections.
  const lockUntil = useRef(0);

  const handleClick = (id: string) => {
    lockUntil.current = Date.now() + 700;
    setActiveCategory(id);
    scrollToCategory(id);
    // Reflect the anchor in the URL without a navigation/jump.
    history.replaceState(null, '', `#${sectionId(id)}`);
  };

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

  // Scroll-spy: highlight the section currently under the sticky stack.
  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(sectionId(c.id)))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        // Pick the top-most section that is intersecting the active band.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const el = visible[0]?.target as HTMLElement | undefined;
        if (el?.dataset.category) setActiveCategory(el.dataset.category);
      },
      // Active band sits just below the sticky stack.
      { rootMargin: `-${stickyOffset() + 12}px 0px -65% 0px`, threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  // Keep the active chip scrolled into view within the horizontal rail.
  useEffect(() => {
    if (!active || !railRef.current) return;
    const chip = railRef.current.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    chip?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <nav className="category-rail" aria-label="Jump to menu category">
      <div className="container">
        <div className="category-rail__track" ref={railRef} role="tablist">
          {categories.map((cat) => {
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                data-chip={cat.id}
                className={`category-chip${isActive ? ' category-chip--active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
                aria-selected={isActive}
                onClick={() => handleClick(cat.id)}
              >
                {CATEGORY_ICON[cat.id] ?? <Utensils size={15} aria-hidden="true" />} {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
