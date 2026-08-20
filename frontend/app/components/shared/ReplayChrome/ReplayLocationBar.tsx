import { Tooltip } from 'antd';
import { Link2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { truncateStringToFit } from 'App/utils';

interface Props {
  /** the page the recording is on at the current moment. Nothing renders when
   *  this is empty, which is what session replay already did and Spot did not. */
  url?: string | null;
  /** Whether this strip is drawn at all.
   *
   *  The rule, Gabriel 08-20: the URL strip appears only when the browser-tab
   *  strip does, which means only on a session with more than one tab. On the
   *  ordinary single-tab session the URL moves into the "More" popover instead
   *  (`ReplayMoreDetails`), and the header is then the bar and nothing else —
   *  zero strokes before the video.
   *
   *  Use `shouldShowLocationBar(tabs)` so the two strips cannot disagree. */
  visible?: boolean;
}

/* The console URL strip. This was already one design copied into two files,
   class for class: `Subheader.tsx:270-284` and `SpotLocation.tsx:17-31`. The
   only differences were accidents — session truncated by measuring the viewport
   while Spot cut at a flat 170 characters, and session rendered nothing without
   a location while Spot always rendered the strip.

   Measuring wins: a flat character count truncates a short URL on a wide screen
   and overflows a long one on a narrow screen.

   This strip carries THE hairline. The header bar above it has no bottom rule at
   all: it is white on a toned stage, so bar and strip read as one white block of
   chrome, closed off by a single line (Gabriel 08-20). That is the whole "too
   many lines" fix — one stroke before the video, down from three in session
   replay, four in Spot and six in the issue player. */
/** The single source of truth for "is there a browsing-context row at all".
 *  Both the tab strip and the location strip read this, so one cannot appear
 *  without the other. Guards on a real Set because `SessionTabs` defaults `tabs`
 *  to `new Set('back-compat')` — nine characters, not one tab. */
export function hasMultipleTabs(tabs: unknown): boolean {
  return tabs instanceof Set && tabs.size > 1;
}

export default function ReplayLocationBar({ url, visible = true }: Props) {
  const { t } = useTranslation();
  if (!visible || !url) return null;

  const shown = truncateStringToFit(url, window.innerWidth - 200);

  return (
    <div className="w-full shrink-0 bg-white border-b border-gray-lighter">
      <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
        <Link2 className="mx-2 shrink-0" size={16} />
        <Tooltip title={t('Open in new tab')} placement="bottom">
          <a
            href={url}
            target="_blank"
            className="truncate link"
            rel="noreferrer"
          >
            {shown}
          </a>
        </Tooltip>
      </div>
    </div>
  );
}
