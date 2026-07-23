/**
 * cx — minimal classname joiner. Filters out falsy values so callers can write
 * `cx('jc-dialog__popup', className)` or `cx(base, active && 'is-active')`.
 * Intentionally tiny: no dependency, no dedupe — we don't need clsx here.
 */
export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ');
}
