import * as React from 'react';
import { cx } from './cx';

/**
 * styled — wraps a Base UI part so it carries a brand default class while still
 * forwarding ref, `render`, and every other prop. This is the ONE place the
 * "Base UI behavior + our token CSS" contract is expressed; every wrapper part
 * (Dialog.Popup, Drawer.Backdrop, …) is built with it.
 *
 * We override Base UI's `className` (which can also be a state function) to a
 * plain string, because our styling keys off `[data-*]` state attributes in
 * CSS, not className functions. Callers may still pass an extra `className`
 * that is appended after the default.
 */
export function styled<T extends React.ElementType>(
  Part: T,
  defaultClass: string,
) {
  type Props = Omit<React.ComponentProps<T>, 'className'> & {
    className?: string;
    /**
     * Drop the brand default class, keeping ONLY Base UI's behavior/a11y and any
     * `className` you pass. Use this for bespoke-layout islands (e.g. the
     * two-column dish modal) that supply their own full styling but still want
     * to go through this single import seam. `unstyled` never reaches the DOM.
     */
    unstyled?: boolean;
  };

  const Component = React.forwardRef<unknown, Props>(function StyledPart(
    props,
    ref,
  ) {
    // Base UI parts are polymorphic, so `React.ComponentProps<T>` is a union and
    // TS won't let us destructure `className` off it directly. Cast to a concrete
    // shape to split the brand class from the rest; behavior is unchanged.
    const { className, unstyled, ...rest } = props as {
      className?: string;
      unstyled?: boolean;
    } & Record<string, unknown>;
    return React.createElement(Part, {
      ref,
      className: cx(!unstyled && defaultClass, className),
      ...rest,
    });
  });

  Component.displayName = defaultClass;
  return Component as React.ForwardRefExoticComponent<
    Props & React.RefAttributes<unknown>
  >;
}
