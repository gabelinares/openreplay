import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import cn from 'classnames';
import React from 'react';

interface Props {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  prevLabel: string;
  nextLabel: string;
  /** the autoplay control, which is wired differently per product */
  autoplay?: React.ReactNode;
}

/* Previous / autoplay / next, in the shape session replay has always drawn it.
 *
 * The padding and the click target here are not decoration, and I broke both by
 * "tidying" them away:
 *
 * - the `p-1` wrappers are what stop the cluster crowding. Without them the
 *   arrows sit 4px apart and the autoplay switch, which is 22px against their
 *   24px, reads as oversized next to them.
 * - the click belongs on the WRAPPER, not the button, and the `pointer-events-none`
 *   on the disabled wrapper is what makes the button's own `disabled` sufficient.
 * - `onMouseDown` is prevented on both arrows so a MOUSE press never moves focus
 *   onto them. antd rings a focused button, so without this every click leaves a
 *   blue ring sitting on the arrow like a stuck selected state — pre-existing
 *   antd behaviour, visible in production Sessions too, not something this pass
 *   introduced. Keyboard focus is untouched: tabbing to the arrow still rings it,
 *   which is the case where the ring is doing its job.
 *
 * Both products render this, so they cannot drift apart again: `QueueControls`
 * wires it to the Sessions search queue, the issue header wires it to that
 * issue's example sessions. */
export default function ReplayQueueControls({
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  prevLabel,
  nextLabel,
  autoplay,
}: Props) {
  return (
    <div className="flex items-center gap-1">
      <div
        onClick={hasPrev ? onPrev : undefined}
        className={cn('p-1 group rounded-full', {
          'pointer-events-none opacity-50': !hasPrev,
          'cursor-pointer': hasPrev,
        })}
      >
        <Popover
          placement="bottom"
          content={<div className="whitespace-nowrap">{prevLabel}</div>}
          open={hasPrev ? undefined : false}
        >
          <Button
            size="small"
            shape="circle"
            disabled={!hasPrev}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center justify-center"
          >
            <LeftOutlined />
          </Button>
        </Popover>
      </div>

      {autoplay}

      <div
        onClick={hasNext ? onNext : undefined}
        className={cn('p-1 group ml-1 rounded-full', {
          'pointer-events-none opacity-50': !hasNext,
          'cursor-pointer': hasNext,
        })}
      >
        <Popover
          placement="bottom"
          content={<div className="whitespace-nowrap">{nextLabel}</div>}
          open={hasNext ? undefined : false}
        >
          <Button
            size="small"
            shape="circle"
            disabled={!hasNext}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center justify-center"
          >
            <RightOutlined />
          </Button>
        </Popover>
      </div>
    </div>
  );
}
