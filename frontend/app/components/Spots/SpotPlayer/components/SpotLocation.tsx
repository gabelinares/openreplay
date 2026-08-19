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
  /* On the page tone the strip and the replay surround share a colour, so the
     hairline has to carry the boundary on its own and takes gray-light. This is
     the one stroke between the header and the replay, the same count the
     session page runs. */
  return (
    <div
      className={
        onPageTone
          ? 'w-full border-b border-gray-light'
          : 'w-full bg-white border-b border-gray-lighter'
      }
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
