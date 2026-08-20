import { Button, Dropdown, type MenuProps, Popover, Tooltip } from 'antd';
import React from 'react';

interface Props {
  icon: React.ReactNode;
  /** the tooltip, and the accessible name — these buttons carry no visible text */
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  /** opens a menu on click (the overflow button) */
  menu?: MenuProps;
  /** opens a panel on click (share) */
  popover?: React.ReactNode;
  popupZIndex?: number;
}

/* Every icon button in a replay header.
 *
 * WHY THE MENU AND POPOVER LIVE IN HERE rather than being wrapped around the
 * button by the caller: antd's `Dropdown` and `Popover` inject their trigger
 * handlers into their DIRECT child. Wrap this component from outside and that
 * child is the `Tooltip`, which swallows them — the button then renders
 * perfectly and does nothing at all when clicked. Keeping the trigger inside the
 * tooltip and directly around the `Button` is what makes it work, so the atom
 * owns it and no caller can get the nesting wrong.
 *
 * The other reason this exists: `ReplayActionCluster` fixed the ORDER of the
 * actions and nothing else, so each product hand-wrote its own `<Button>` and
 * they picked different antd spellings —
 *
 *   <Button size="small" icon={<X />} />   -> `ant-btn-icon-only`, SQUARE 24x24
 *   <Button size="small"><X /></Button>    -> not icon-only, keeps its
 *                                            horizontal padding, comes out 30px
 *
 * Session replay and `HighlightButton` used the second form, Spot and issue
 * replay the first, so share and overflow were different widths depending on
 * which player you looked at. `icon` is always the PROP here, never a child. */
export default function ReplayIconButton({
  icon,
  title,
  onClick,
  disabled,
  menu,
  popover,
  popupZIndex,
}: Props) {
  const button = (
    <Button
      size="small"
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
    />
  );

  const trigger = menu ? (
    <Dropdown menu={menu} placement="bottomRight">
      {button}
    </Dropdown>
  ) : popover ? (
    <Popover
      trigger="click"
      placement="bottomRight"
      zIndex={popupZIndex}
      content={popover}
    >
      {button}
    </Popover>
  ) : (
    button
  );

  return (
    <Tooltip title={title} placement="bottom">
      {trigger}
    </Tooltip>
  );
}
