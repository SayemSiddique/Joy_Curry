import { NavigationMenu as Base } from '@base-ui/react/navigation-menu';
import { styled } from '../utils/styled';
import './NavigationMenu.css';

/**
 * NavigationMenu — Base UI navigation-menu, styled from global.css tokens.
 *
 * Behavior/a11y (menu roles, keyboard navigation, hover/focus intent, ESC +
 * outside-pointer dismiss, focus management, anchored floating popup) comes from
 * Base UI. Look comes from NavigationMenu.css (brand default) or fully from the
 * island when `unstyled` is passed (e.g. the navbar MENU dropdown, which owns
 * `.navbar__menu-*`).
 *
 *   <NavigationMenu.Root>
 *     <NavigationMenu.List>
 *       <NavigationMenu.Item>
 *         <NavigationMenu.Trigger>MENU <NavigationMenu.Icon/></NavigationMenu.Trigger>
 *         <NavigationMenu.Content>…links…</NavigationMenu.Content>
 *       </NavigationMenu.Item>
 *     </NavigationMenu.List>
 *     <NavigationMenu.Portal>
 *       <NavigationMenu.Positioner>
 *         <NavigationMenu.Popup>
 *           <NavigationMenu.Viewport />
 *         </NavigationMenu.Popup>
 *       </NavigationMenu.Positioner>
 *     </NavigationMenu.Portal>
 *   </NavigationMenu.Root>
 *
 * `Root`/`Portal`/`List`/`Item` pass through. `Trigger`/`Link` are the caller's
 * real branded controls (empty default class, props stripped). The floating parts
 * carry brand classes but are overridable / droppable via `unstyled`.
 */
export const NavigationMenu = {
  Root: Base.Root,
  Portal: Base.Portal,
  List: Base.List,
  Item: Base.Item,
  Trigger: styled(Base.Trigger, ''),
  Link: styled(Base.Link, ''),
  Icon: styled(Base.Icon, 'jc-navmenu__icon'),
  Content: styled(Base.Content, 'jc-navmenu__content'),
  Positioner: styled(Base.Positioner, 'jc-navmenu__positioner'),
  Popup: styled(Base.Popup, 'jc-navmenu__popup'),
  Viewport: styled(Base.Viewport, 'jc-navmenu__viewport'),
  Arrow: styled(Base.Arrow, 'jc-navmenu__arrow'),
};
