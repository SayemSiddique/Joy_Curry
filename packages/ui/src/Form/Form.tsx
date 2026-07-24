import { Form as Base } from '@base-ui/react/form';
import { styled } from '../utils/styled';
import './Form.css';

/**
 * Form — Base UI Form, a native `<form>` with consolidated error handling.
 *
 * Renders a `<form>` and provides the field-coordination context Base UI `Field`
 * parts read from. Islands keep their own `onSubmit` handler (with the existing
 * `e.preventDefault()` + manual `validate()` path) and their own `errors` state;
 * this wrapper only supplies the semantic element + context, so the submit path
 * and validation rules stay exactly as they were.
 *
 * Pass `unstyled` + your own className to keep an existing form's look identical.
 *
 *   <Form onSubmit={handleSubmit} noValidate>
 *     <Field.Root name="email" invalid={!!errors.email}>…</Field.Root>
 *   </Form>
 */
export const Form = styled(Base, 'jc-form');
