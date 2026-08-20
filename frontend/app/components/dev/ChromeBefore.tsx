/* eslint-disable i18next/no-literal-string */
import {
  ArrowLeftOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  MoreOutlined,
  RightOutlined,
  SettingOutlined,
  ShareAltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Button, Switch } from 'antd';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import React from 'react';

import { hashString } from 'App/types/session/session';
import UserCard from 'Components/Session/Player/ReplayPlayer/EventsBlock/UserCard';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';
import Tabs from 'Components/Session/Tabs';
import HighlightButton from 'Components/Session_/Highlight/HighlightButton';
import QueueControls from 'Components/Session_/QueueControls';
import { ReplayLocationBar } from 'Components/shared/ReplayChrome';
import { Avatar, BackLink } from 'UI';

import SessionMetaList from 'Shared/SessionItem/SessionMetaList';

/* The chrome as it was, for the before/after review.
 *
 * These panels are built from the SAME real components the old headers used —
 * `BackLink`, `UserCard`, `SessionTabs`, `Tabs`, `Avatar`, `SessionMetaList`,
 * `HighlightButton`, `QueueControls` — every one of which still exists in the
 * tree, because mobile replay and live still render them. Only the container
 * markup is restated here, class-for-class from the source:
 *
 *   session  PlayerBlockHeader.tsx:87,99,125,142 + Subheader.tsx:222 (HEAD~1)
 *   spot     SpotPlayerHeader.tsx:109,141,206 (HEAD~1)
 *   issue    SmartAlerts/IssuePlayer/IssuePlayerHeader.tsx:37,145
 *            (upstream/smart-issues-ui — the header Mehdi screenshotted)
 *
 * The first version of this file hand-drew the contents instead — a coloured
 * rectangle where the browser tab goes, a bare circle for the avatar, a text
 * chevron for the back arrow. It was wrong in every one of those places, and
 * wrong in dark mode on top of it, because invented markup does not carry the
 * real components' theming. Do not reintroduce a drawing here: if a piece of the
 * old chrome no longer exists to be imported, say so on the panel rather than
 * approximating it.
 *
 * The one exception, labelled as such below: production's `CriticalToggle` lives
 * in `SmartAlerts/`, which this fork does not carry.
 */

/* NOTE on the tab row's background: production declares none —
   `Subheader.tsx:222` is `w-full px-4 flex items-center border-b relative`, with
   no fill — so it inherited `body`'s `$gray-lightest` (`reset.css:11`) while the
   active `Tab` filled itself `bg-white`. The grey behind the tabs was therefore
   already there; it was just never written down. The location strip beside it DID
   declare `bg-white` (`Subheader.tsx:271`), which is why that row is the lighter
   of the two. These panels leave the tab row unpainted, as production does. */

/* ---- the three divider specs that existed, verbatim ---- */

/** session: `w-px h-full lg:h-12.5 mx-2 bg-gray-lighter` */
const SessionDivider = () => (
  <div className="w-px h-full mx-2 bg-gray-lighter" />
);

/** spot: `h-full rounded-xl border-l` + `width: 1` */
const SpotDivider = ({ cls = 'mx-2' }: { cls?: string }) => (
  <div className={`h-full rounded-xl border-l ${cls}`} style={{ width: 1 }} />
);

/** issue: `h-6 border-l border-gray-light mx-1` — the floating tick */
const IssueDivider = () => (
  <div className="h-6 border-l border-gray-light mx-1" />
);

const URL = 'https://app.example.com/checkout/payment?step=3';

/* ================= SESSION REPLAY, BEFORE ================= */
/* Two stacked bars, then the location strip. The top bar was the one thing this
   header already had right: `border-b-gray-lighter` with no border WIDTH, so no
   rule at all. The second bar carried the browser tabs and the tools, with a
   rule of its own. */
export function SessionBefore() {
  return (
    <>
      <div
        className="bg-white flex justify-between shrink-0"
        style={{ height: 50 }}
      >
        <div className="flex w-full items-center">
          <div className="flex items-center h-full">
            {/* @ts-ignore — BackLink is untyped JS */}
            <BackLink label="Back" className="h-full ml-2" />
            <SessionDivider />
          </div>
          <UserCard width={1440} height={900} />
          <div className="ml-auto flex items-center h-full">
            <SessionMetaList
              horizontal
              maxLength={2}
              metaList={[
                { label: 'plan', value: 'pro' },
                { label: 'tier', value: '2' },
              ]}
            />
          </div>
          {/* the search-events switch: a labelled control in the bar, with a
              border-r of its own (PlayerBlockHeader.tsx:125) */}
          <div className="px-2 relative flex items-center border-r border-r-gray-lighter">
            <Switch checked style={{ background: '#f0a930' }} />
            <span className="ml-2 whitespace-nowrap">Search Events Only</span>
          </div>
        </div>
        <div
          className="px-2 relative hidden lg:block"
          style={{ minWidth: 270 }}
        >
          <Tabs
            border={false}
            active="EVENTS"
            onClick={() => {}}
            tabs={[
              { key: 'EVENTS', text: 'Activity' },
              { key: 'CLICKMAP', text: 'Click map' },
              { key: 'INSPECTOR', text: 'Tag' },
            ]}
          />
        </div>
      </div>
    </>
  );
}

/* The rows that sat INSIDE the shrinking column, not across the full width:
   production renders `Subheader` inside `PlayerBlock`, which is the sibling of
   `RightBlock`. So the second bar and the location strip both narrowed when the
   side panel opened, and the panel started directly under the 50px identity bar.
   Kept separate so the review page can place them correctly. */
export function SessionBeforeRows() {
  return (
    <>
      {/* the second bar (Subheader.tsx:222): browser tabs left, tools right */}
      <div className="w-full px-4 flex items-center border-b relative shrink-0">
        <SessionTabs />
        <div className="ml-auto text-sm flex items-center color-gray-medium gap-2 py-1">
          <Button size="small" className="flex items-center justify-center">
            <ShareAltOutlined />
          </Button>
          <HighlightButton onClick={() => {}} />
          <Button size="small">
            <MoreOutlined />
          </Button>
          <div>
            <QueueControls />
          </div>
        </div>
      </div>
      <ReplayLocationBar url={URL} />
    </>
  );
}

/* ================= SPOT, BEFORE ================= */
/* One bar, but content-driven height (`p-2 py-1` around two lines), a rule under
   it, two full-height dividers, and the only labelled buttons in the app. */
export function SpotBefore() {
  return (
    <>
      <div className="flex items-center gap-1 p-2 py-1 w-full bg-white border-b shrink-0">
        <div>
          <Button type="text" icon={<ArrowLeftOutlined />} className="px-2">
            All Spots
          </Button>
        </div>
        <SpotDivider cls="mr-2" />
        <div className="flex items-center gap-2">
          <Avatar seed={hashString('nikita@openreplay.com')} />
          <div>
            <div className="w-9/12 text-ellipsis truncate cursor-normal">
              Checkout fails on the payment step
            </div>
            <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
              <div>nikita@openreplay.com</div>
              <div>·</div>
              <div className="capitalize whitespace-nowrap">Jun 04, 2026</div>
              <div>·</div>
              <div className="whitespace-nowrap">Chromium v148.0.0.0</div>
              <div>·</div>
              <div>1470x956</div>
              <div>·</div>
              <div className="capitalize whitespace-nowrap">Mac Arm64</div>
            </div>
          </div>
        </div>
        <div className="ml-auto" />
        <Button size="small" type="default" icon={<CopyOutlined />}>
          Copy
        </Button>
        <Button size="small" icon={<SettingOutlined />}>
          Manage Access
        </Button>
        <Button icon={<MoreOutlined />} size="small" />
        <SpotDivider />
        <Tabs
          className="w-fit! border-b-0!"
          active="ACTIVITY"
          onClick={() => {}}
          tabs={[
            {
              key: 'ACTIVITY',
              text: 'Activity',
              iconComp: (
                <div className="mr-1">
                  <UserSwitchOutlined />
                </div>
              ),
            },
            {
              key: 'COMMENTS',
              text: 'Comments',
              iconComp: (
                <div className="mr-1">
                  <InfoCircleOutlined />
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}

/** Spot drew its location strip inside the column beside the sidebar too
    (`SpotPlayer.tsx:230`). */
export function SpotBeforeRows() {
  return <ReplayLocationBar url={URL} />;
}

/* ================= ISSUE REPLAY, BEFORE (production) ================= */
/* The header from the screenshot: its own bar with three FLOATING dividers and a
   rule, and then the session player's second bar inherited underneath it, by
   then holding one tab and nothing else. Six strokes. */
export function IssueBefore() {
  return (
    <>
      <div className="flex items-center gap-1 px-2 py-2.5 w-full bg-white border-b border-gray-light shrink-0">
        <Button
          type="text"
          size="small"
          icon={<ArrowLeft size={15} />}
          className="px-2"
        >
          Back to issue
        </Button>
        <IssueDivider />
        <div className="leading-tight min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {/* stand-in: production's `CriticalToggle` lives in `SmartAlerts/`,
                which this fork does not carry. Same lucide triangle at the same
                size and stroke it renders. */}
            <AlertTriangle
              size={15}
              strokeWidth={2}
              style={{ color: 'var(--color-red)', fill: 'none' }}
            />
            <span
              className="font-medium truncate color-gray-darkest"
              style={{ maxWidth: 480 }}
            >
              Card declined, then retried twice
            </span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
            <span className="truncate" style={{ maxWidth: 320 }}>
              Checkout fails on the payment step
            </span>
            <span>·</span>
            <span className="whitespace-nowrap">Jun 04, 2026, 10:14</span>
            <span>·</span>
            <span className="link cursor-pointer">More</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button size="small" icon={<ShareAltOutlined />} />
          <HighlightButton onClick={() => {}} />
          <IssueDivider />
          <div className="flex items-center gap-1">
            <Button size="small" shape="circle" icon={<LeftOutlined />} />
            <Button size="small" shape="circle" icon={<RightOutlined />} />
          </div>
          <IssueDivider />
          <Tabs
            className="w-fit! border-b-0!"
            active="activity"
            onClick={() => {}}
            tabs={[
              {
                key: 'activity',
                text: 'Activity',
                iconComp: (
                  <div className="mr-1">
                    <UserSwitchOutlined />
                  </div>
                ),
              },
              {
                key: 'issue',
                text: 'Issue',
                iconComp: (
                  <div className="mr-1">
                    <InfoCircleOutlined />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}

/** Production's issue player inherits the session `Subheader` through
    `PlayerContent` -> `PlayerBlock`, so its second bar and location strip sat
    inside the shrinking column, below a side panel that started at the header. */
export function IssueBeforeRows() {
  return (
    <>
      <div className="w-full px-4 flex items-center border-b relative shrink-0">
        <SessionTabs />
      </div>
      <ReplayLocationBar url={URL} />
    </>
  );
}
