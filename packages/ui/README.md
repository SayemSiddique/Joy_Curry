# @joy-curry/ui

Shared **web** UI component layer for Joy Curry & Tandoor.

Thin wrappers over [Base UI](https://base-ui.com) (`@base-ui/react`) that supply
**behavior + accessibility only**. Every pixel is styled from the `global.css`
design tokens (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--ease-*`,
`--z-*`). No Tailwind, no second styling system.

## The one rule

> React islands import from **`@joy-curry/ui`**, never from `@base-ui/react` directly.

This package is the seam. Because every island goes through it, upgrading Base UI
or swapping it for another headless library later means editing files here — not
hunting through 30 islands.

Web-only. Base UI does not run in React Native, so `apps/mobile` does **not** consume
this package; cross-platform parity comes from shared values in `@joy-curry/tokens`.

## Usage

```tsx
import { Dialog } from '@joy-curry/ui';

<Dialog.Root>
  <Dialog.Trigger className="your-btn">Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Backdrop />
    <Dialog.Popup>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Copy</Dialog.Description>
      {/* content */}
      <Dialog.Close className="your-btn">Close</Dialog.Close>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

## How to add a component

1. Create `src/<Name>/<Name>.tsx`. Import the Base UI primitive from its subpath
   (e.g. `import { Select as Base } from '@base-ui/react/select'`).
2. Build the compound export with the `styled(Part, 'jc-<name>__<part>')` helper
   from `utils/styled` for parts that need a brand default class. Leave `Root`,
   `Trigger`, `Close` as pass-throughs when callers supply their own buttons.
3. Create `src/<Name>/<Name>.css`. Use **only** token vars. Key visual states off
   Base UI's `[data-*]` attributes (`[data-starting-style]`, `[data-open]`,
   `[data-highlighted]`, …) — never hard-coded colors.
4. `import './<Name>.css'` at the top of the `.tsx`.
5. Re-export from `src/index.ts` under the correct phase comment.
6. Add a `@media (prefers-reduced-motion: reduce)` guard to any transition.

## Convention notes

- **Ref + `render` + props all forward** through `styled()`, so callers can still
  use Base UI's `render` prop and refs.
- `className` on a wrapped part is **appended** after the brand default.
- Class naming: `jc-<component>__<part>` (BEM-ish, matches island CSS style).

### The `unstyled` escape hatch

Bespoke-layout islands that already own their full CSS (e.g. the two-column dish
modal, the `.modal`-shell modals) pass `unstyled` to a wrapped part to drop the
brand default class, keeping **only** Base UI's behavior + a11y and their own
`className`:

```tsx
<Dialog.Popup unstyled className="dish-modal">…</Dialog.Popup>
```

Standard/new dialogs omit `unstyled` and get the brand card chrome for free
(see the spike). `unstyled` never reaches the DOM.

## Components

| Component | Base UI primitive | Added in |
|---|---|---|
| `Dialog` | `dialog` | Phase 0 |

Consumers so far: `BaseUISpike` (styled default), `DishDetailModal` (unstyled,
bespoke two-column), `BundleModal` (unstyled, `.modal` shell + `--bui` overlay),
`CartDrawer` (unstyled, Dialog-as-right-sheet + `--bui` overlay).

_(more added per phase — see `/BASE_UI_MIGRATION.md`)_
