import { Tooltip } from 'antd';
import { Link2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { truncateStringToFit } from 'App/utils';

interface Props {
  /** the page the recording is on at the current moment. Nothing renders when
   *  this is empty, which is what session replay already did and Spot did not. */
  url?: string | null;
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
export default function ReplayLocationBar({ url }: Props) {
  const { t } = useTranslation();
  if (!url) return null;

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
