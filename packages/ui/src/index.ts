/**
 * @joy-curry/ui — shared web UI layer (Base UI behavior + our token styling).
 *
 * Islands import from here, NEVER from `@base-ui/react` directly. That single
 * rule is what lets a future engineer swap or upgrade the underlying library by
 * touching only this package instead of 30 islands.
 *
 * Components are added per migration phase (see /BASE_UI_MIGRATION.md), not all
 * up front — a wrapper exists only once a real island needs it.
 */

export { cx } from './utils/cx';

// Phase 0 — foundation
export { Dialog } from './Dialog/Dialog';

// Phase 3 — menu browsing & filtering
export { Select } from './Select/Select';
export { ToggleGroup, Toggle } from './ToggleGroup/ToggleGroup';
export { NavigationMenu } from './NavigationMenu/NavigationMenu';
