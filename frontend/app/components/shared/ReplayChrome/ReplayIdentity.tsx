import { Popover, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

/** how many meta items the line will show before the rest has to go behind
 *  "More". Two, so the run can never grow into the action cluster on the right.
 *  The atom enforces it rather than trusting each product to remember. */
const META_LIMIT = 2;

interface Props {
  /** the product's most identifying mark, in the same position everywhere: an
   *  avatar for session replay and Spot, the critical toggle for issue replay. */
  lead?: React.ReactNode;
  /** the thing you clicked to get here. User for session replay, spot title for
   *  Spot, the issue variation for issue replay. */
  primary: React.ReactNode;
  primaryTooltip?: string;
  /** the muted run after the primary label. Capped at META_LIMIT. */
  meta?: React.ReactNode[];
  /** everything that did not fit, as popover content. All three products put
   *  their secondary metadata here, which is the only home that cannot change
   *  the bar's height. */
  more?: React.ReactNode;
  /** popovers inside a player sit above a stage that may itself be stacked —
   *  the products disagreed about this, so the caller passes its own. */
  popupZIndex?: number;
}

/* The identity line for every replay header. ONE line, always, because a second
   line is what made Spot's and the issue player's bars content-driven: they grew
   and shrank with the data, which moved the stage under them and broke the 50px
   height contract that `PlayerContent` and `rightblock.module.css` both hardcode.

   Session replay was already one line and is the shape this follows. */
export default function ReplayIdentity({
  lead,
  primary,
  primaryTooltip,
  meta = [],
  more,
  popupZIndex,
}: Props) {
  const { t } = useTranslation();
  const shown = meta.filter(Boolean).slice(0, META_LIMIT);
  const hasRun = shown.length > 0 || !!more;

  return (
    <div className="min-w-0 flex-1 flex items-center gap-2">
      {lead}
      <Tooltip title={primaryTooltip} placement="bottom">
        <span
          className="font-medium truncate color-gray-darkest"
          style={{ maxWidth: 480 }}
        >
          {primary}
        </span>
      </Tooltip>

      {hasRun && (
        <div className="flex items-center gap-2 shrink-0 text-sm text-black/50">
          {shown.map((item, i) => (
            // index keys: these are positional slots in a fixed-length run,
            // not a reorderable list
            <React.Fragment key={i}>
              {i > 0 && <span aria-hidden="true">&middot;</span>}
              <span className="whitespace-nowrap">{item}</span>
            </React.Fragment>
          ))}
          {more && (
            <>
              {shown.length > 0 && <span aria-hidden="true">&middot;</span>}
              <Popover
                content={more}
                trigger="hover"
                placement="bottom"
                zIndex={popupZIndex}
              >
                <span className="link cursor-pointer">{t('More')}</span>
              </Popover>
            </>
          )}
        </div>
      )}
    </div>
  );
}
