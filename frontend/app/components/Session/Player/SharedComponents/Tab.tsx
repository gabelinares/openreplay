import { Tooltip } from 'antd';
import cn from 'classnames';
import React from 'react';

interface Props {
  i: number;
  tab: string;
  currentTab: string;
  changeTab?: (tab: string) => void;
  isLive?: boolean;
  isClosed?: boolean;
  name?: string;
}

function Tab({ i, tab, currentTab, changeTab, isLive, isClosed, name }: Props) {
  return (
    <div
      key={tab}
      style={{
        marginBottom: '-2px',
      }}
      onClick={() => changeTab?.(tab)}
      className={cn(
        /* 12px across, 6px down as rendered. It was 16 across against 4 down,
           a 4:1 ratio that read as a wide flat sliver.
           `pb` stays one step above `pt` because the -2px bottom margin above
           pulls 2px of this tab below the row's rule, so equal padding would
           render as 6px over the label and 4px under it. */
        'self-end pt-1.5 pb-2 px-3 text-sm',
        changeTab && !isLive ? 'cursor-pointer' : 'cursor-default',
        currentTab === tab
          ? 'border-gray-lighter border-t border-l border-r border-b-white! bg-white rounded-tl rounded-tr font-semibold'
          : /* Hover is a subtle white fill with the same rounded top as the
               active tab, and NO outline. `bg-clip-padding` is what keeps it a
               pixel smaller: the transparent t/l/r borders stay, and clipping
               the fill to the padding box insets it by exactly that 1px, so a
               hovered tab sits just inside where the active one sits rather
               than matching or exceeding it.
               An earlier pass recoloured the label instead. That was neither
               asked for nor right: it borrowed `hover:text-teal` from the
               SEGMENTED side tabs, which are a different control (Gabriel
               08-20). */
            'cursor-pointer border-gray-lighter border-b! border-t-transparent! border-l-transparent! border-r-transparent! rounded-tl rounded-tr bg-clip-padding hover:bg-white/60',
      )}
    >
      <Tooltip
        title={name && name.length > 20 ? name : ''}
        mouseEnterDelay={0.5}
      >
        <div className="flex items-center gap-2">
          <div className="bg-gray-light rounded-full min-w-5 min-h-5 w-5 h-5 flex items-center justify-center text-xs">
            <div>{i + 1}</div>
          </div>
          <div
            className={cn('whitespace-nowrap', isClosed ? 'line-through' : '')}
            style={{
              maxWidth: 114,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name || `Tab ${i + 1}`}
          </div>
        </div>
      </Tooltip>
    </div>
  );
}

export default Tab;
