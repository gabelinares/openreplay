import { Tooltip } from 'antd';
import { Link2, Tags, User } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { countries } from 'App/constants';
import { browserIcon, deviceTypeIcon, osIcon } from 'App/iconNames';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { CountryFlag } from 'UI';

interface Props {
  /** a product-specific row above the rest — issue replay puts its category here */
  lead?: React.ReactNode;
  user?: string;
  countryCode?: string;
  city?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  /** the screen size, as a node because session replay draws it with an icon */
  resolution?: React.ReactNode;
  /** the page the recording is on. Only passed when the location strip above is
   *  NOT being drawn — see `ReplayLocationBar`. */
  url?: string | null;
  /** the customer's own metadata, rendered by whichever chip row the product
   *  already owns. Issue replay folds its overflow behind a "+N"; session replay
   *  has a handful of fields and lays them out plainly. Same `MetaItem` pills
   *  either way, which is the part that has to match. */
  metadata?: React.ReactNode;
}

/* The body of every replay header's "More" popover.
 *
 * All three players show the same facts about a recording, and before this they
 * showed them in three different places: session replay put custom metadata in a
 * list on the far right of the bar, Spot inlined browser and resolution on a
 * second line, and only issue replay had a popover. One component now, so a row
 * added here appears in all three. */
export default function ReplayMoreDetails({
  lead,
  user,
  countryCode,
  city,
  browser,
  browserVersion,
  os,
  osVersion,
  device,
  resolution,
  url,
  metadata,
}: Props) {
  const { t } = useTranslation();

  /* built as a list so the LAST row can carry `isLast` and drop its border,
     whichever rows a given product happens to pass */
  const rows: React.ReactNode[] = [];

  if (lead) rows.push(lead);

  if (user) {
    rows.push(
      <SessionInfoItem
        key="user"
        comp={
          <User
            size={16}
            strokeWidth={2}
            style={{ color: 'var(--color-gray-medium)' }}
          />
        }
        label={t('User')}
        value={user}
      />,
    );
  }

  if (countryCode || city) {
    rows.push(
      <SessionInfoItem
        key="loc"
        comp={<CountryFlag country={countryCode} />}
        label={countries[countryCode ?? ''] || countryCode || t('Unknown')}
        value={city}
      />,
    );
  }

  if (browser) {
    rows.push(
      <SessionInfoItem
        key="browser"
        icon={browserIcon(browser)}
        label={browser}
        value={browserVersion ? `v${browserVersion}` : ''}
      />,
    );
  }

  if (os) {
    rows.push(
      <SessionInfoItem
        key="os"
        icon={osIcon(os)}
        label={os}
        value={osVersion ?? ''}
      />,
    );
  }

  if (device) {
    rows.push(
      <SessionInfoItem
        key="device"
        icon={deviceTypeIcon(device)}
        label={device}
        value={resolution ?? ''}
      />,
    );
  }

  if (url) {
    rows.push(
      <SessionInfoItem
        key="url"
        comp={
          <Link2
            size={16}
            strokeWidth={2}
            style={{ color: 'var(--color-gray-medium)' }}
          />
        }
        label={t('Page')}
        value={
          <Tooltip title={t('Open in new tab')} placement="bottom">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="truncate link block"
              style={{ maxWidth: 280 }}
            >
              {url}
            </a>
          </Tooltip>
        }
      />,
    );
  }

  if (metadata) {
    rows.push(
      <SessionInfoItem
        key="meta"
        comp={
          <Tags
            size={16}
            strokeWidth={2}
            style={{ color: 'var(--color-gray-medium)' }}
          />
        }
        label={t('Metadata')}
        value={
          /* a fixed cell so a chip row can measure and fold rather than dragging
             the popover off the screen, and `color-gray-darkest` because
             SessionInfoItem's value column is gray-medium and MetaItem's key
             takes its colour by inheritance (OR-3665) */
          <div className="color-gray-darkest" style={{ width: 280 }}>
            {metadata}
          </div>
        }
      />,
    );
  }

  return (
    <div className="text-left bg-white">
      {rows.map((row, i) =>
        React.isValidElement(row) && i === rows.length - 1
          ? React.cloneElement(row as React.ReactElement<any>, { isLast: true })
          : row,
      )}
    </div>
  );
}
