import { Field as Base } from '@base-ui/react/field';
import { styled } from '../utils/styled';
import './Field.css';

/**
 * Field — Base UI Field, styled from global.css tokens.
 *
 * Supplies the a11y wiring a hand-rolled `.form-group` cannot: the label's
 * `htmlFor` is auto-linked to the control, the control's `aria-describedby`
 * points at the error/description, and `aria-invalid` follows `Field.Root`'s
 * `invalid` prop. Validation itself stays in the island — pass `invalid` from
 * your own `errors` state and render `Field.Error match` conditionally; Base UI
 * only owns the ARIA plumbing, never the rules or messages.
 *
 * Compound API mirrors Base UI:
 *   <Field.Root name="email" invalid={!!errors.email}>
 *     <Field.Label>Email</Field.Label>
 *     <Field.Control type="email" value={v} onChange={…} />
 *     {errors.email && <Field.Error match>{errors.email}</Field.Error>}
 *   </Field.Root>
 *
 * Islands already carrying the brand `.form-*` classes pass `unstyled` on every
 * part + their own className, keeping the look pixel-identical (a11y only). New
 * fields omit `unstyled` and inherit the brand default below.
 */
export const Field = {
  Root: styled(Base.Root, 'jc-field'),
  Label: styled(Base.Label, 'jc-field__label'),
  Control: styled(Base.Control, 'jc-field__control'),
  Error: styled(Base.Error, 'jc-field__error'),
  Description: styled(Base.Description, 'jc-field__description'),
  Validity: Base.Validity,
  Item: styled(Base.Item, ''),
};
