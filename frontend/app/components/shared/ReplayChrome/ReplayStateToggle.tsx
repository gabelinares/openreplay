import { Button, Tooltip } from 'antd';
import cn from 'classnames';
import React from 'react';

import './replayStateToggle.css';

interface Props {
  /** outline icon — `fill: none`. Nothing in the app uses fill to mean state. */
  icon: React.ReactNode;
  /** the tooltip, and the accessible name. Say the STATE, not just the action:
   *  the colour says "on" without saying on for what. */
  title: string;
  on: boolean;
  /** the emphatic on-state: a tinted background rather than a coloured icon
   *  alone. Critical replay uses it for "one of MY descriptions matched". */
  strong?: boolean;
  /** the semantic colour, as a CSS value. Red for critical, orange for the
   *  search filter. */
  color: string;
  onClick: () => void;
}

/* A control that reports a status and is also clickable.
 *
 * There are two of these in the replay headers — issue replay's critical
 * triangle and session replay's search-events filter — and they were two
 * different controls: one a text button with a hover that previews the next
 * state, the other an outlined button with a plain fill. Same job, so one
 * component, differing only in colour. */
export default function ReplayStateToggle({
  icon,
  title,
  on,
  strong,
  color,
  onClick,
}: Props) {
  return (
    <Tooltip title={title}>
      <Button
        type="text"
        size="small"
        aria-label={title}
        aria-pressed={on}
        onClick={onClick}
        /* a mouse press must not leave focus here, or antd tints it blue and the
           toggle reads as two states at once */
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          'replay-state-toggle flex items-center justify-center shrink-0',
          on && 'is-on',
          on && strong && 'is-strong',
        )}
        style={{ ['--toggle-color' as any]: color }}
        icon={icon}
      />
    </Tooltip>
  );
}
