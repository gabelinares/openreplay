import { observer } from 'mobx-react-lite';
import React from 'react';
import { Tooltip } from 'antd';
import { Icon } from 'UI';
import { Link2 } from 'lucide-react';
import spotPlayerStore from '../spotPlayerStore';
import { useTranslation } from 'react-i18next';

/* `onPageTone` drops the white fill so the strip sits on whatever the page is
   painted with. The Spot player paints its own surround white and wants the
   default; the issue player sits on the app's gray page tone, where a white
   strip directly under a white header needs a rule between the two to be
   legible at all, and rules under that header are exactly what Mehdi asked us
   to stop drawing (08-19). Opt-in, so Spot is untouched. */
function SpotLocation({ onPageTone = false }: { onPageTone?: boolean }) {
  const { t } = useTranslation();
  const currUrl = spotPlayerStore.getClosestLocation(
    spotPlayerStore.time,
  )?.location;
  const displayUrl =
    currUrl.length > 170 ? `${currUrl.slice(0, 170)}...` : currUrl;
  /* The header above now carries the one strong rule (gray-light), so on the
     page tone this stays the quiet gray-lighter hairline: it ends the chrome
     without reading as a second line under the first. */
  return (
    <div
      className={`w-full border-b border-gray-lighter${onPageTone ? '' : ' bg-white'}`}
    >
      <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
        <Link2 className="mx-2" size={16} />
        <Tooltip title={t('Open in new tab')} placement="bottom">
          <a
            href={currUrl}
            target="_blank"
            className="truncate link"
            rel="noreferrer"
          >
            {displayUrl}
          </a>
        </Tooltip>
      </div>
    </div>
  );
}

export default observer(SpotLocation);
