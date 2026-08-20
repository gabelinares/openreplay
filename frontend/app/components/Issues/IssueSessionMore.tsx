import React from 'react';

import { CAT_ICON, type Issue } from 'App/mstore/issuesStore';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { ReplayMoreDetails } from 'Components/shared/ReplayChrome';

import TagsRow from './TagsRow';

interface Props {
  issue?: Issue;
  email: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  device: string;
  resolution?: string;
  countryCode: string;
  city: string;
  metaList: { label: string; value: string }[];
  /** the page, when the location strip is not being drawn — which for issue
   *  replay is always, since it has no browser-tab strip */
  url?: string | null;
}

/* Issue replay's "More" popover: the shared body, plus the one row that is
   specific to this player — the issue's category.

   The metadata row keeps `TagsRow`, which folds its overflow behind a "+N"
   (OR-3665). Session replay lays its handful of fields out plainly instead. Both
   render the app's own `MetaItem` pills, which is the part that has to match. */
export default function IssueSessionMore({
  issue,
  email,
  browser,
  browserVersion,
  os,
  osVersion,
  device,
  resolution,
  countryCode,
  city,
  metaList,
  url,
}: Props) {
  const CatIc = issue ? CAT_ICON[issue.cat] : null;
  return (
    <ReplayMoreDetails
      lead={
        issue && CatIc ? (
          <SessionInfoItem
            key="cat"
            comp={
              <CatIc size={16} strokeWidth={2} style={{ color: '#3EAAAF' }} />
            }
            label="Category"
            value={issue.cat}
          />
        ) : undefined
      }
      user={email}
      countryCode={countryCode}
      city={city}
      browser={browser}
      browserVersion={browserVersion}
      os={os}
      osVersion={osVersion}
      device={device}
      resolution={resolution}
      url={url}
      metadata={metaList.length > 0 ? <TagsRow tags={metaList} /> : undefined}
    />
  );
}
