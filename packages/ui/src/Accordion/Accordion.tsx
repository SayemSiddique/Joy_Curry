import { Accordion as Base } from '@base-ui/react/accordion';
import { styled } from '../utils/styled';
import './Accordion.css';

/**
 * Accordion — Base UI Accordion, styled from global.css tokens.
 *
 * Owns the disclosure a11y: each Trigger is a `button` with `aria-expanded` +
 * `aria-controls` pointing at its Panel, arrow/Home/End roving between headers,
 * and the open/close animation driven by the `--accordion-panel-height` CSS var
 * Base UI measures. Multiple panels may be open at once by default; pass
 * `openMultiple={false}` for single-open.
 *
 * Compound API mirrors Base UI:
 *   <Accordion.Root>
 *     <Accordion.Item value="occasion">
 *       <Accordion.Header>
 *         <Accordion.Trigger>What's the occasion?</Accordion.Trigger>
 *       </Accordion.Header>
 *       <Accordion.Panel>…</Accordion.Panel>
 *     </Accordion.Item>
 *   </Accordion.Root>
 *
 * Pass `unstyled` on any part to drop the brand default and bring your own CSS.
 */
export const Accordion = {
  Root: styled(Base.Root, 'jc-accordion'),
  Item: styled(Base.Item, 'jc-accordion__item'),
  Header: styled(Base.Header, 'jc-accordion__header'),
  Trigger: styled(Base.Trigger, 'jc-accordion__trigger'),
  Panel: styled(Base.Panel, 'jc-accordion__panel'),
};
