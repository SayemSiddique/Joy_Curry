import { Tabs as Base } from '@base-ui/react/tabs';
import { styled } from '../utils/styled';
import './Tabs.css';

/**
 * Tabs — Base UI Tabs, styled from global.css tokens.
 *
 * Owns the tablist a11y + keyboard model: roving tabindex, arrow-key movement,
 * Home/End, `role="tab"`/`role="tabpanel"`, and the `aria-controls`/
 * `aria-labelledby` linkage between each tab and its panel. `Tabs.Indicator`
 * auto-tracks the active tab via the `--active-tab-{left,width,…}` CSS vars Base
 * UI sets, so the underline slides without any JS in the island.
 *
 * Compound API mirrors Base UI:
 *   <Tabs.Root value={tab} onValueChange={setTab}>
 *     <Tabs.List>
 *       <Tabs.Tab value="a">A</Tabs.Tab>
 *       <Tabs.Tab value="b">B</Tabs.Tab>
 *       <Tabs.Indicator />
 *     </Tabs.List>
 *     <Tabs.Panel value="a">…</Tabs.Panel>
 *     <Tabs.Panel value="b">…</Tabs.Panel>
 *   </Tabs.Root>
 *
 * Pass `unstyled` on any part to drop the brand default and bring your own CSS.
 */
export const Tabs = {
  Root: styled(Base.Root, 'jc-tabs'),
  List: styled(Base.List, 'jc-tabs__list'),
  Tab: styled(Base.Tab, 'jc-tabs__tab'),
  Indicator: styled(Base.Indicator, 'jc-tabs__indicator'),
  Panel: styled(Base.Panel, 'jc-tabs__panel'),
};
