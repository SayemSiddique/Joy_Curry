import { OTPField as Base } from '@base-ui/react/otp-field';
import { styled } from '../utils/styled';
import './OtpField.css';

/**
 * OtpField — Base UI OTP Field, styled from global.css tokens.
 *
 * Renders `length` segmented character inputs and owns the one-time-code
 * behavior: paste-to-fill, arrow/backspace navigation between slots, masking,
 * auto-advance, and a hidden validation input wired for `autocomplete="one-time-code"`.
 * The island keeps the value controlled (`value`/`onValueChange`) and its own
 * submit path — Base UI only owns the slot behavior + a11y.
 *
 * Compound API mirrors Base UI:
 *   <OtpField.Root length={6} value={code} onValueChange={setCode}
 *                  validationType="numeric" autoComplete="one-time-code">
 *     {Array.from({ length: 6 }, (_, i) => <OtpField.Input key={i} index={i} />)}
 *   </OtpField.Root>
 *
 * The brand default renders 6 boxes in a row; pass `unstyled` to opt out.
 */
export const OtpField = {
  Root: styled(Base.Root, 'jc-otp'),
  Input: styled(Base.Input, 'jc-otp__input'),
  Separator: styled(Base.Separator, 'jc-otp__separator'),
};
