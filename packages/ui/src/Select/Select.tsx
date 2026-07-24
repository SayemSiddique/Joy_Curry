import { Select as Base } from '@base-ui/react/select';
import { styled } from '../utils/styled';
import './Select.css';

/**
 * Select — Base UI Select, styled from global.css tokens.
 *
 * Behavior/a11y (listbox roles, keyboard navigation + typeahead, focus return,
 * scroll-lock, ARIA wiring between trigger/value/list) comes from Base UI. Look
 * comes from Select.css (brand default), or fully from the island when a part is
 * passed `unstyled` (bespoke toolbars/rails that own their own CSS).
 *
 * Compound API mirrors Base UI:
 *   <Select.Root value={v} onValueChange={setV} items={items}>
 *     <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
 *     <Select.Portal>
 *       <Select.Positioner>
 *         <Select.Popup>
 *           <Select.Item value="x">
 *             <Select.ItemText>Label</Select.ItemText>
 *             <Select.ItemIndicator />
 *           </Select.Item>
 *         </Select.Popup>
 *       </Select.Positioner>
 *     </Select.Portal>
 *   </Select.Root>
 *
 * `Root`/`Portal` pass through. `Value`/`Icon`/`ItemIndicator` are content parts
 * routed through styled('') so they strip `unstyled` cleanly without a DOM leak.
 */
export const Select = {
  Root: Base.Root,
  Portal: Base.Portal,
  // Trigger is the real branded button; empty default class, props stripped.
  Trigger: styled(Base.Trigger, ''),
  Value: styled(Base.Value, ''),
  Icon: styled(Base.Icon, 'jc-select__icon'),
  Positioner: styled(Base.Positioner, 'jc-select__positioner'),
  Popup: styled(Base.Popup, 'jc-select__popup'),
  List: styled(Base.List, ''),
  Item: styled(Base.Item, 'jc-select__item'),
  ItemText: styled(Base.ItemText, ''),
  ItemIndicator: styled(Base.ItemIndicator, 'jc-select__indicator'),
  Group: styled(Base.Group, ''),
  GroupLabel: styled(Base.GroupLabel, 'jc-select__group-label'),
  Separator: styled(Base.Separator, 'jc-select__separator'),
};
