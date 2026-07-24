import { Progress as Base } from '@base-ui/react/progress';
import { styled } from '../utils/styled';
import './Progress.css';

/**
 * Progress — Base UI Progress, styled from global.css tokens.
 *
 * Supplies the `role="progressbar"` semantics the hand-rolled trackers lacked:
 * `aria-valuenow`/`aria-valuemin`/`aria-valuemax` from `value`/`min`/`max`, and
 * a human `aria-valuetext` (pass `getAriaValueText` to announce the stage label
 * instead of a bare percentage). Determinate by default; pass `value={null}`
 * for an indeterminate bar.
 *
 * Compound API mirrors Base UI:
 *   <Progress.Root value={2} max={3} getAriaValueText={() => 'In the Kitchen'}>
 *     <Progress.Label>Order status</Progress.Label>
 *     <Progress.Track>
 *       <Progress.Indicator />
 *     </Progress.Track>
 *   </Progress.Root>
 *
 * Pass `unstyled` on any part to drop the brand default and bring your own CSS.
 */
export const Progress = {
  Root: styled(Base.Root, 'jc-progress'),
  Label: styled(Base.Label, 'jc-progress__label'),
  Value: styled(Base.Value, 'jc-progress__value'),
  Track: styled(Base.Track, 'jc-progress__track'),
  Indicator: styled(Base.Indicator, 'jc-progress__indicator'),
};
