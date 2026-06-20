# Cheat Sheet 02 — CSS Architecture

> Reference for Phase 2 of the Joy Curry & Tandoor build.

---

## Design Tokens (Custom Properties)

**CSS variables** — Define once on `:root`, use everywhere; change theme by editing one block.
```css
:root {
  --color-primary:    #c8953a;   /* Joy Curry gold */
  --color-bg:         #1a1a1a;   /* dark background */
  --color-surface:    #2a2a2a;   /* card surface */
  --color-text:       #f5f5f5;
  --color-border:     #3a3a3a;
  --spacing-sm:       0.5rem;
  --spacing-md:       1rem;
  --spacing-lg:       1.5rem;
  --radius-card:      12px;
  --transition-base:  0.2s ease;
}
```

**Usage**
```css
.menu-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
}
```

---

## BEM Naming Convention

**Block → Element → Modifier** — Keeps class names predictable and self-documenting.

```
.menu-card              Block
.menu-card__title       Element (child of block)
.menu-card__price       Element
.menu-card--sold-out    Modifier (state variant)
.menu-card--featured    Modifier
```

```html
<article class="menu-card menu-card--sold-out">
  <h3 class="menu-card__title">Lamb Biryani</h3>
  <span class="menu-card__price">$18.95</span>
</article>
```

> Never add new BEM classes without a matching rule in `styles.css` — class names and CSS are co-owned.

---

## Flexbox

**`display: flex`** — One-dimensional layout (row or column).

```css
.cart-drawer__header {
  display: flex;
  justify-content: space-between;   /* space between title and close button */
  align-items: center;
  padding: var(--spacing-md);
}
```

**Key properties**

| Property | Values | Effect |
|----------|--------|--------|
| `flex-direction` | `row` \| `column` | main axis direction |
| `justify-content` | `flex-start` \| `center` \| `space-between` \| `space-around` | align along main axis |
| `align-items` | `flex-start` \| `center` \| `stretch` | align along cross axis |
| `flex-wrap` | `wrap` \| `nowrap` | allow items to wrap |
| `gap` | `<length>` | space between items |
| `flex: 1` | shorthand | item grows to fill remaining space |

---

## CSS Grid

**`display: grid`** — Two-dimensional layout.

```css
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}
```

`auto-fill` + `minmax(280px, 1fr)` = as many columns as fit, each at least 280 px wide. Joy Curry menu grid uses this to go from 1 column on mobile to 3+ on desktop with zero media queries.

---

## Mobile-First & Media Queries

**Always write base styles for small screens, then override for larger.**

```css
/* Base — mobile (< 768 px) */
.filter-bar {
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* Tablet and up */
@media (min-width: 768px) {
  .filter-bar {
    flex-direction: row;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .menu-grid {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## Transitions & Animations

**`transition`** — Smooth change between two states.
```css
.menu-card {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
```

**Cart drawer slide-in**
```css
.cart-drawer {
  transform: translateX(100%);
  transition: transform 0.3s ease;
}
.cart-drawer--open {
  transform: translateX(0);
}
```

---

## Accessibility in CSS

**Focus ring** — Never remove `:focus` without replacing it.
```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Visually hidden but screen-reader accessible**
```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

**Skeleton shimmer** — Communicates loading state without text.
```css
.skeleton {
  background: linear-gradient(90deg, var(--color-surface) 25%, #3a3a3a 50%, var(--color-surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `color: #c8953a` hardcoded in a component file | Use `var(--color-primary)` so theme changes propagate everywhere |
| New BEM class added in JS but no CSS rule written | Write the rule in `styles.css` immediately — silent class names don't render |
| `display: none` used to hide elements for screen readers | Use `.sr-only` for content that should be read but not seen |
| Overriding `outline: none` on focused buttons | Replace with a visible `outline` using `--color-primary` |
| Writing desktop styles first, then hacking mobile | Write mobile base first, add `@media (min-width:...)` for bigger screens |
