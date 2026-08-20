import { Tags, User } from 'lucide-react';
import React from 'react';

import { countries } from 'App/constants';
import { browserIcon, deviceTypeIcon, osIcon } from 'App/iconNames';
import { CAT_ICON, type Issue } from 'App/mstore/issuesStore';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { CountryFlag } from 'UI';

import TagsRow from './TagsRow';

interface Props {
  issue?: Issue;
  email: string;
  browser: string;
  os: string;
  device: string;
  countryCode: string;
  city: string;
  metaList: { label: string; value: string }[];
}

/* The body of the replay header's "More" popover.
 *
 * Extracted so the chrome review route can show the REAL popover instead of a
 * placeholder — it was rendering the words "session details" in a small box,
 * which is nothing like the seven-row list this actually is, and that is exactly
 * the kind of stand-in that makes a review page lie. */
export default function IssueSessionMore({
  issue,
  email,
  browser,
  os,
  device,
  countryCode,
  city,
  metaList,
}: Props) {
  const CatIc = issue ? CAT_ICON[issue.cat] : null;
  return (
    <div className="text-left bg-white">
      {issue && CatIc && (
        <SessionInfoItem
          comp={
            <CatIc size={16} strokeWidth={2} style={{ color: '#3EAAAF' }} />
          }
          label="Category"
          value={issue.cat}
        />
      )}
      <SessionInfoItem
        comp={
          <User
            size={16}
            strokeWidth={2}
            style={{ color: 'var(--color-gray-medium)' }}
          />
        }
        label="User"
        value={email}
      />
      <SessionInfoItem
        comp={<CountryFlag country={countryCode} />}
        label={countries[countryCode] || countryCode || 'Unknown'}
        value={city}
      />
      <SessionInfoItem
        icon={browserIcon(browser)}
        label={browser}
        value="v144.0.0"
      />
      <SessionInfoItem icon={osIcon(os)} label={os} value="10.15.7" />
      <SessionInfoItem
        icon={deviceTypeIcon(device)}
        label={device}
        value="1440 × 900"
        isLast={metaList.length === 0}
      />
      {/* User metadata — customer-defined, can be many (Mehdi: up to 10/15+), so
          it is ONE more row in this list rather than a block with its own grammar
          below it. The split two-tone MetaItem pill was the only tag on the page
          that read as two chips glued together; these are single-tone, the key
          quiet and the value dark, and the row folds its overflow behind "+N"
          instead of wrapping into a ragged block (Gabriel 08-11, OR-3665). */}
      {metaList.length > 0 && (
        <SessionInfoItem
          comp={
            <Tags
              size={16}
              strokeWidth={2}
              style={{ color: 'var(--color-gray-medium)' }}
            />
          }
          label="Metadata"
          isLast
          value={
            // A fixed cell so the row can measure and fold — left to grow, six
            // pills would drag the popover off the screen. 280 rather than 200 so
            // two average pairs usually fit before the "+N" (Gabriel 08-11).
            //
            // color-gray-darkest resets what this cell would otherwise impose:
            // SessionInfoItem's value column is gray-medium (#888) and MetaItem's
            // key takes its colour by inheritance, so the identical component came
            // out washed here and dark (#333) in the sessions list. Reusing a
            // component means not restyling it through its container either.
            <div className="color-gray-darkest" style={{ width: 280 }}>
              <TagsRow tags={metaList} />
            </div>
          }
        />
      )}
    </div>
  );
}
