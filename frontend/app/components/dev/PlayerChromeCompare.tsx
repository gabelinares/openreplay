/* eslint-disable i18next/no-literal-string */
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Spot } from 'App/mstore/types/spot';
import IssueReplayHeader from 'Components/Issues/IssueReplayHeader';
import IssueSessionMore from 'Components/Issues/IssueSessionMore';
import {
  MOCK_SESSION_POOL,
  buildSession,
} from 'Components/Issues/mockSessions';
import PlayerBlockHeader from 'Components/Session/Player/ReplayPlayer/PlayerBlockHeader';
import { PlayerContext } from 'Components/Session/playerContext';
import SpotPlayerHeader from 'Components/Spots/SpotPlayer/components/SpotPlayerHeader';
import {
  ReplayBrowserTabs,
  ReplayLocationBar,
} from 'Components/shared/ReplayChrome';

import {
  IssueBefore,
  IssueBeforeRows,
  SessionBefore,
  SessionBeforeRows,
  SpotBefore,
  SpotBeforeRows,
} from './ChromeBefore';

/* The replay chrome review, before and after, at full width.
   Route: /player-chrome  (design env only)

   Mehdi asked that the design env carry all of this with examples so nothing is
   missed, and his complaint was visual — "there are too many lines" — so the
   page counts the lines and shows them at the scale they are actually seen.

   The AFTER panels are the REAL header components on a stubbed player store, not
   redrawings: the whole exercise is making three things identical, so this page
   has to move when they move. The BEFORE panels are frozen static snapshots
   (`ChromeBefore.tsx`) because they are a picture of a past state and must NOT
   track anything.

   Plan: context/player-makeup-plan-2026-08-20.md
   What this does NOT fix: BACKLOG.md §18.3 */

const MOCK_URL = 'https://app.example.com/checkout/payment?step=3';

/* A stand-in for the playback engine. The real headers read a handful of fields
   off the player store and call a handful of methods on the player; none of that
   needs a decoded recording to render chrome. */
function stubContext(tabs: string[]) {
  const state = {
    time: 0,
    autoplay: false,
    width: 1440,
    height: 900,
    showEvents: false,
    ready: true,
    location: MOCK_URL,
    vModeBadge: false,
    tabs: new Set(tabs),
    currentTab: tabs[0],
    closedTabs: [],
    /* real page titles: `Tab` falls back to "Tab N" without them, and the strip
       then reads nothing like the one in production */
    tabNames: {
      'tab-1': 'Checkout - Acme',
      'tab-2': 'Cart - Acme',
      'tab-3': 'Payment provider',
    } as Record<string, string>,
  };
  return {
    store: { get: () => state },
    player: {
      toggleEvents: () => {},
      toggleAutoplay: () => {},
      changeTab: () => {},
      scale: () => {},
    },
  } as any;
}

/* One block failing must not blank the page — that is how a design env stops
   being trusted. Every panel renders inside this. */
class Boundary extends React.Component<
  { label: string; children: React.ReactNode },
  { err: Error | null }
> {
  state = { err: null as Error | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  render() {
    if (this.state.err) {
      return (
        <div className="p-4 text-sm" style={{ color: 'var(--color-red)' }}>
          {this.props.label} did not mount: {String(this.state.err.message)}
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

/* The body of a player: the sidebar is a SIBLING of the column holding the tab
   strip, the location strip and the stage — which is how all three real players
   are actually built (`PlayerContent` puts `RightBlock` beside the whole
   `PlayerBlock`, Spot puts its sidebar beside the column with the location
   strip). My first version put the sidebar beside the STAGE only, so the tab and
   url rows ran full width underneath it and the sidebar started too low
   (Gabriel 08-20). */
function Body({
  sidebar,
  children,
}: {
  /** the open side panel's width, or 0 for closed */
  sidebar: number;
  /** the tab strip and location strip, which live INSIDE the shrinking column */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0 w-full">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {children}
        <div
          className="flex-1 flex items-center justify-center text-xs"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          replay stage
        </div>
      </div>
      {sidebar > 0 && (
        <div
          className="bg-white border-l border-gray-light flex items-start justify-center pt-3 text-xs shrink-0"
          style={{ width: sidebar, color: 'var(--color-gray-medium)' }}
        >
          side panel {sidebar}px
        </div>
      )}
    </div>
  );
}

/* A framed viewport. `strokes` is the count of horizontal rules and vertical
   dividers a user meets before the video starts, which is the thing being
   argued about. */
function Shot({
  kind,
  label,
  strokes,
  note,
  sidebar,
  children,
}: {
  kind: 'before' | 'after';
  label: string;
  strokes: number;
  note?: string;
  sidebar: number;
  children: React.ReactNode;
}) {
  const isAfter = kind === 'after';
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="text-xs uppercase font-semibold tracking-wide px-2 py-0.5 rounded"
          style={{
            letterSpacing: '0.06em',
            background: isAfter
              ? 'var(--color-tealx-light)'
              : 'var(--color-gray-lighter)',
            color: isAfter ? 'var(--color-tealx)' : 'var(--color-gray-dark)',
          }}
        >
          {kind}
        </span>
        <span className="font-medium">{label}</span>
        <span className="text-sm" style={{ color: 'var(--color-gray-medium)' }}>
          {strokes} {strokes === 1 ? 'stroke' : 'strokes'} before the video
        </span>
        {note && (
          <span
            className="text-sm"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            {note}
          </span>
        )}
      </div>

      {/* the app's page tone behind the chrome: the new bars draw no bottom rule
          and separate from the stage by tone, so on a white ground you could not
          tell whether it worked */}
      <div
        className="rounded-lg border border-gray-light overflow-hidden flex flex-col bg-gray-lightest"
        style={{ height: 280 }}
      >
        <Boundary label={`${label} (${kind})`}>{children}</Boundary>
      </div>
    </div>
  );
}

function Pair({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p
          className="text-sm max-w-3xl"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          {blurb}
        </p>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function PlayerChromeCompare() {
  const {
    sessionStore,
    spotStore,
    issuesStore,
    customFieldStore,
    uiPlayerStore,
  } = useStore();
  const [ready, setReady] = React.useState(false);
  const [tab, setTab] = React.useState<'activity' | 'issue' | null>(null);

  const single = React.useMemo(() => stubContext(['tab-1']), []);
  const multi = React.useMemo(
    () => stubContext(['tab-1', 'tab-2', 'tab-3']),
    [],
  );

  React.useEffect(() => {
    const seed = MOCK_SESSION_POOL[0];
    runInAction(() => {
      sessionStore.current = buildSession(seed);
      /* Two things the design env leaves empty, so neither was visible and both
         read as "not done" (Gabriel 08-20):
         - custom fields come from the backend, and `SessionIdentity` only shows a
           Metadata row for keys the project has declared. Declare two.
         - the Search Events Only item only exists when the search that opened the
           session had event filters. Turn that on. */
      customFieldStore.list = [{ key: 'plan' }, { key: 'tier' }] as any;
      uiPlayerStore.setSearchEventsSwitchButton(true);
      uiPlayerStore.setShowOnlySearchEvents(true);
      spotStore.currentSpot = new Spot({
        id: 'mock-spot',
        name: 'Checkout fails on the payment step',
        userEmail: 'nikita@openreplay.com',
        createdAt: Date.parse('2026-06-04T10:00:00Z'),
        duration: 84000,
        previewURL: '',
        comments: [],
      });
    });
    setReady(true);
  }, []);

  if (!ready) return null;

  const sessionAfter = (ctx: any, multiTab: boolean) => (
    <PlayerContext.Provider value={ctx}>
      <PlayerBlockHeader
        activeTab=""
        setActiveTab={() => {}}
        tabs={{ EVENTS: 'Activity', CLICKMAP: 'Click map', INSPECTOR: 'Tag' }}
      />
      {/* the strips sit inside the column that shrinks when the panel opens,
          exactly as the real players build them */}
      <Body sidebar={320}>
        <ReplayBrowserTabs />
        <ReplayLocationBar url={MOCK_URL} visible={multiTab} />
      </Body>
    </PlayerContext.Provider>
  );

  return (
    <div className="flex flex-col gap-10 p-8" style={{ width: '100%' }}>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">
          Replay chrome, before and after
        </h1>
        <p
          className="text-sm max-w-3xl"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          One bar at a fixed 50px, separating from the stage by tone with no
          rule under it. One full-bleed divider, after Back. Icon-only actions
          in one fixed order, all 24px, no dividers on that side. The tab strip
          and the URL strip appear together or not at all, and on the ordinary
          single-tab session neither appears: the page is a row in More instead.
          Both strips sit inside the column that narrows when the side panel
          opens.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-gray-medium)' }}>
          Both sides are built from the real components. The before panels
          restate only the old container markup — the bars, the dividers, the
          paddings — and mount the same `BackLink`, `UserCard`, `SessionTabs`,
          `Avatar` and `Tabs` the old headers did, all of which still exist
          because mobile replay and live still use them.
        </p>
      </header>

      <Pair
        title="Session replay"
        blurb="Two stacked bars became one. The tools moved up into the identity bar, which left the second bar holding a single tab chip, so it is now conditional on the session actually having more than one tab. The far-right metadata moved into More, and the labelled Search Events switch into the overflow menu, because neither fits a fixed single line. On a single-tab session the URL joins them in More, which leaves the header as the bar alone. The grey behind the tabs is not new: production declares no fill on that row, so it always inherited the page tone while the active tab filled itself white."
      >
        <Shot kind="before" label="Session replay" strokes={3} sidebar={270}>
          <PlayerContext.Provider value={single}>
            <SessionBefore />
            <Body sidebar={270}>
              <SessionBeforeRows />
            </Body>
          </PlayerContext.Provider>
        </Shot>
        <Shot
          kind="after"
          label="Session replay"
          strokes={1}
          note="single-tab session, which is every session today"
          sidebar={320}
        >
          {sessionAfter(single, false)}
        </Shot>
        <Shot
          kind="after"
          label="Session replay"
          strokes={3}
          note="three tabs — the strip returns, exactly as Sessions shows it"
          sidebar={320}
        >
          {sessionAfter(multi, true)}
        </Shot>
      </Pair>

      <Pair
        title="Spot"
        blurb="The bar stops growing with its data: browser, resolution and platform move behind More. Copy and Manage Access were the only labelled buttons in any replay header and do not fit a fixed single line, so they moved into the overflow menu beside Download and Delete. Both full-height dividers on the right go, and with no browser-tab strip Spot draws no URL strip either."
      >
        <Shot kind="before" label="Spot" strokes={4} sidebar={320}>
          <PlayerContext.Provider value={single}>
            <SpotBefore />
            <Body sidebar={320}>
              <SpotBeforeRows />
            </Body>
          </PlayerContext.Provider>
        </Shot>
        <Shot kind="after" label="Spot" strokes={1} sidebar={320}>
          <PlayerContext.Provider value={single}>
            <SpotPlayerHeader
              activeTab={null}
              setActiveTab={() => {}}
              title="Checkout fails on the payment step"
              user="nikita@openreplay.com"
              date="Jun 04, 2026"
              resolution="1470x956"
              platform="Mac Arm64"
              browserVersion="148.0.0.0"
            />
            <Body sidebar={320} />
          </PlayerContext.Provider>
        </Shot>
      </Pair>

      <Pair
        title="Issue replay"
        blurb="The header Mehdi sent the screenshot of. Three floating h-6 dividers rather than one full-bleed one, a rule under its own bar, and then the session player's second bar inherited underneath it holding one dead tab chip. Six strokes down to one."
      >
        <Shot
          kind="before"
          label="Issue replay (production)"
          strokes={6}
          sidebar={320}
        >
          <PlayerContext.Provider value={single}>
            <IssueBefore />
            <Body sidebar={320}>
              <IssueBeforeRows />
            </Body>
          </PlayerContext.Provider>
        </Shot>
        <Shot kind="after" label="Issue replay" strokes={1} sidebar={320}>
          <PlayerContext.Provider value={single}>
            <IssueReplayHeader
              /* a real issue, so the lead slot renders the real critical
                 control. Passing undefined here showed no marker at all next to
                 a before panel that had one, which read as "critical was
                 removed" — the opposite of what was decided (it stays). */
              issue={issuesStore.all[0]}
              variation="Card declined, then retried twice"
              date="Jun 04, 2026, 10:14"
              /* the real popover body, not a placeholder: it is a
                 seven-row list, and a small box reading "session details" told
                 Mehdi nothing about what he was reviewing */
              more={
                <IssueSessionMore
                  issue={issuesStore.all[0]}
                  email="jeremy.piatt@kaufmanrealty.com"
                  browser="Chrome"
                  os="Mac OS X"
                  device="desktop"
                  countryCode="US"
                  city="Nokomis"
                  metaList={[{ label: 'plan', value: 'paid' }]}
                />
              }
              onBack={() => {}}
              bookmarked={false}
              onToggleBookmark={() => {}}
              prevId="sess_1000"
              nextId="sess_1002"
              onGoSession={() => {}}
              autoplay={false}
              onToggleAutoplay={() => {}}
              tab={tab}
              setTab={setTab}
              time={0}
            />
            <Body sidebar={320} />
          </PlayerContext.Provider>
        </Shot>
      </Pair>
    </div>
  );
}

export default observer(PlayerChromeCompare);
