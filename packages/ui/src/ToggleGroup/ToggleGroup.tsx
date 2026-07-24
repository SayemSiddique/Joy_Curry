import { ToggleGroup as BaseGroup } from '@base-ui/react/toggle-group';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { styled } from '../utils/styled';
import './ToggleGroup.css';

/**
 * ToggleGroup + Toggle — Base UI toggle-group, styled from global.css tokens.
 *
 * Behavior/a11y (roving tabindex, arrow-key navigation, `aria-pressed`, single-
 * or multi-select via `multiple`) comes from Base UI. Look comes from
 * ToggleGroup.css (brand default), or fully from the island when `unstyled` is
 * passed (e.g. the filter toolbar, which owns `.toolbar__filter-btn`).
 *
 *   <ToggleGroup value={selected} onValueChange={setSelected} multiple>
 *     <Toggle value="vegan">Vegan</Toggle>
 *     <Toggle value="halal">Halal</Toggle>
 *   </ToggleGroup>
 *
 * Base UI's `value` is always an array (even single-select), and `onValueChange`
 * hands back the next array — the island maps that onto its own filter state.
 */
export const ToggleGroup = styled(BaseGroup, 'jc-toggle-group');
export const Toggle = styled(BaseToggle, 'jc-toggle');
