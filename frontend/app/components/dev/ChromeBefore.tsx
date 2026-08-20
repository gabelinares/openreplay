/* eslint-disable i18next/no-literal-string */
import {
  InfoCircleOutlined,
  LeftOutlined,
  MoreOutlined,
  RightOutlined,
  ShareAltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Button, Segmented, Switch } from 'antd';
import { AlertTriangle, Link2 } from 'lucide-react';
import React from 'react';

/* FROZEN SNAPSHOTS of the chrome as it was, for the before/after review.
 *
 * These are static reproductions, deliberately: they are a picture of a past
 * state, so they must NOT track the live components — that is the one case where
 * a lookalike is the correct thing to build rather than a bug. They are copied
 * class-for-class from the source at the commit before the makeup landed, and
 * from `upstream/smart-issues-ui` for the production issue player:
 *
 *   session  PlayerBlockHeader.tsx:87 + Subheader.tsx:222,270 (HEAD~1)
 *   spot     SpotPlayerHeader.tsx:109,141,206 (HEAD~1)
 *   issue    SmartAlerts/IssuePlayer/IssuePlayerHeader.tsx:37,145
 *            (upstream/smart-issues-ui — the header Mehdi sent the screenshot of)
 *
 * Nothing here is interactive. If the real chrome changes, these stay put, which
 * is the point.
 */

/* ---- the three divider specs that existed, verbatim ---- */

/** session: inline `w-px h-full lg:h-12.5 mx-2 bg-gray-lighter` */
const SessionDivider = () => (
  <div className="w-px h-full mx-2 bg-gray-lighter" />
);

/** spot: `h-full rounded-xl border-l` + `width: 1`, so gray-light not lighter */
const SpotDivider = ({ cls = 'mx-2' }: { cls?: string }) => (
  <div className={`h-full rounded-xl border-l ${cls}`} style={{ width: 1 }} />
);

/** issue: `h-6 border-l border-gray-light mx-1` — the floating tick */
const IssueDivider = () => (
  <div className="h-6 border-l border-gray-light mx-1" />
);

/* ---- shared filler ---- */

const URL = 'https://app.example.com/checkout/payment?step=3';

/** the location strip, which both session and spot drew with a rule of its own */
const LocationStrip = () => (
  <div className="w-full bg-white border-b border-gray-lighter">
    <div className="flex w-fit items-center color-gray-medium text-sm p-1">
      <Link2 className="mx-2" size={16} />
      <span className="truncate link">{URL}</span>
    </div>
  </div>
);

const Avatar38 = () => (
  <div
    className="border rounded-full bg-tealx-light shrink-0"
    style={{ width: 38, height: 38 }}
  />
);

const SmallBtn = ({ children }: { children: React.ReactNode }) => (
  <Button size="small" className="flex items-center justify-center">
    {children}
  </Button>
);

const SideTabs = ({ labels }: { labels: string[] }) => (
  <Segmented
    size="small"
    value={labels[0]}
    options={labels.map((l) => ({ label: l, value: l }))}
  />
);

/* ================= SESSION REPLAY, BEFORE ================= */
/* Two stacked bars, then the location strip. The top bar had no bottom rule at
   all (`border-b-gray-lighter` with no width), which is the one thing this
   header already had right. */
export function SessionBefore() {
  return (
    <>
      <div
        className="bg-white flex justify-between shrink-0"
        style={{ height: 50 }}
      >
        <div className="flex w-full items-center">
          <div className="flex items-center h-full ml-2">
            {/* BackLink: custom sprite icon, not lucide, not antd */}
            <span className="flex items-center gap-1 text-sm color-teal">
              <span style={{ fontSize: 16, lineHeight: 1 }}>&#8249;</span> Back
            </span>
          </div>
          <SessionDivider />
          <Avatar38 />
          <div className="ml-3 leading-tight flex items-center gap-2">
            <span className="font-medium color-teal">alex@acme.com</span>
            <div className="text-sm color-gray-medium flex items-center">
              <span>Jun 04, 10:14</span>
              <span className="mx-1 font-bold text-xl">&#183;</span>
              <span>Lisbon, Portugal</span>
              <span className="mx-1 font-bold text-xl">&#183;</span>
              <span>Chrome, macOS, desktop</span>
              <span className="mx-1 font-bold text-xl">&#183;</span>
              <span className="link">More</span>
            </div>
          </div>
          {/* SessionMetaList, far right, capped at 2 */}
          <div className="ml-auto flex items-center h-full gap-2 text-sm color-gray-medium pr-2">
            <span>plan: pro</span>
            <span>tier: 2</span>
          </div>
          {/* the search-events switch, labelled, with a border-r of its own */}
          <div className="px-2 flex items-center border-r border-r-gray-lighter h-full">
            <Switch checked style={{ background: '#f0a930' }} />
            <span className="ml-2 whitespace-nowrap text-sm">
              Search Events Only
            </span>
          </div>
        </div>
        <div className="px-2 flex items-center" style={{ minWidth: 270 }}>
          <SideTabs labels={['Activity', 'Click map', 'Tag']} />
        </div>
      </div>

      {/* second bar: browser tabs left, tools right, with a rule under it */}
      <div className="w-full px-4 flex items-center border-b shrink-0 bg-white">
        <div className="py-1 px-4 text-sm bg-active-blue text-blue border">
          Tab 1
        </div>
        <div className="ml-auto flex items-center gap-2 py-1">
          <SmallBtn>
            <ShareAltOutlined />
          </SmallBtn>
          <SmallBtn>&#10077;</SmallBtn>
          <SmallBtn>
            <MoreOutlined />
          </SmallBtn>
          <div className="flex items-center gap-1">
            <div className="p-1">
              <Button size="small" shape="circle">
                <LeftOutlined />
              </Button>
            </div>
            <Switch
              size="default"
              checked={false}
              style={{ transform: 'scale(0.9)' }}
            />
            <div className="p-1 ml-1">
              <Button size="small" shape="circle">
                <RightOutlined />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <LocationStrip />
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
          <Button type="text" className="px-2">
            <span className="mr-1">&#8592;</span> All Spots
          </Button>
        </div>
        <SpotDivider cls="mr-2" />
        <div className="flex items-center gap-2">
          <div
            className="border rounded-full bg-tealx-light shrink-0"
            style={{ width: 32, height: 32 }}
          />
          <div>
            <div className="truncate">Checkout fails on the payment step</div>
            <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
              <div>nikita@openreplay.com</div>
              <div>&#183;</div>
              <div className="whitespace-nowrap">Jun 04, 2026</div>
              <div>&#183;</div>
              <div className="whitespace-nowrap">Chromium v148.0.0.0</div>
              <div>&#183;</div>
              <div>1470x956</div>
              <div>&#183;</div>
              <div className="whitespace-nowrap">Mac Arm64</div>
            </div>
          </div>
        </div>
        <div className="ml-auto" />
        <Button size="small">
          <span className="mr-1">&#10064;</span> Copy
        </Button>
        <Button size="small">
          <span className="mr-1">&#9881;</span> Manage Access
        </Button>
        <SmallBtn>
          <MoreOutlined />
        </SmallBtn>
        <SpotDivider />
        <SideTabs labels={['Activity', 'Comments']} />
      </div>
      <LocationStrip />
    </>
  );
}

/* ================= ISSUE REPLAY, BEFORE (production) ================= */
/* The header from the screenshot. Its own bar with three FLOATING dividers and a
   rule, and then it inherits the session player's second bar underneath, which
   by then holds one dead tab chip and nothing else. Six strokes. */
export function IssueBefore() {
  return (
    <>
      <div className="flex items-center gap-1 px-2 py-2.5 w-full bg-white border-b border-gray-light shrink-0">
        <Button type="text" size="small" className="px-2">
          <span className="mr-1">&#8592;</span> Back to issue
        </Button>
        <IssueDivider />
        <div className="leading-tight min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle
              size={15}
              strokeWidth={2}
              style={{ color: 'var(--color-red)', fill: 'none' }}
            />
            <span className="font-medium truncate color-gray-darkest">
              Card declined, then retried twice
            </span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
            <span className="truncate">Checkout fails on the payment step</span>
            <span>&#183;</span>
            <span className="whitespace-nowrap">Jun 04, 2026, 10:14</span>
            <span>&#183;</span>
            <span className="link">More</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <SmallBtn>
            <ShareAltOutlined />
          </SmallBtn>
          <SmallBtn>&#10077;</SmallBtn>
          <IssueDivider />
          <div className="flex items-center gap-1">
            <Button size="small" shape="circle">
              <LeftOutlined />
            </Button>
            <Button size="small" shape="circle">
              <RightOutlined />
            </Button>
          </div>
          <IssueDivider />
          <Segmented
            size="small"
            value="Activity"
            options={[
              {
                label: (
                  <span className="flex items-center gap-1">
                    <UserSwitchOutlined /> Activity
                  </span>
                ),
                value: 'Activity',
              },
              {
                label: (
                  <span className="flex items-center gap-1">
                    <InfoCircleOutlined /> Issue
                  </span>
                ),
                value: 'Issue',
              },
            ]}
          />
        </div>
      </div>

      {/* the inherited session second bar, holding one chip */}
      <div className="w-full px-4 flex items-center border-b shrink-0 bg-white">
        <div className="py-1 px-4 text-sm bg-active-blue text-blue border">
          Tab 1
        </div>
      </div>

      <LocationStrip />
    </>
  );
}
