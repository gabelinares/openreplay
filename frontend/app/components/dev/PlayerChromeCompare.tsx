/* eslint-disable i18next/no-literal-string */
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Spot } from 'App/mstore/types/spot';
import IssueReplayHeader from 'Components/Issues/IssueReplayHeader';
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

import { IssueBefore, SessionBefore, SpotBefore } from './ChromeBefore';

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
    tabNames: {} as Record<string, string>,
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

/* The stage and the sidebar, so each panel reads as a whole screen rather than a
   strip of chrome floating on nothing. Height is fixed rather than proportional:
   the subject is the top of the screen, and a real 900px stage would push the
   next panel off the page. */
function Stage({ sidebar }: { sidebar: number }) {
  return (
    <div className="flex flex-1 min-h-0">
      <div
        className="flex-1 flex items-center justify-center text-xs"
        style={{ color: 'var(--color-gray-medium)' }}
      >
        replay stage
      </div>
      <div
        className="bg-white border-l border-gray-light flex items-start justify-center pt-3 text-xs shrink-0"
        style={{ width: sidebar, color: 'var(--color-gray-medium)' }}
      >
        sidebar {sidebar}px
      </div>
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
  const { sessionStore, spotStore } = useStore();
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

  const sessionAfter = (ctx: any) => (
    <PlayerContext.Provider value={ctx}>
      <PlayerBlockHeader
        activeTab=""
        setActiveTab={() => {}}
        tabs={{ EVENTS: 'Activity', CLICKMAP: 'Click map', INSPECTOR: 'Tag' }}
      />
      {/* the same conditional the real player renders: the strip appears only
          when the session genuinely has more than one tab */}
      <ReplayBrowserTabs />
      <ReplayLocationBar url={MOCK_URL} />
      <Stage sidebar={320} />
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
          in one fixed order, no dividers on that side. The location strip
          carries the only line. Every product fills the same slots and sets no
          spacing of its own.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-gray-medium)' }}>
          After panels are the real components. Before panels are frozen
          snapshots of the previous markup, so they stay put as the real ones
          change.
        </p>
      </header>

      <Pair
        title="Session replay"
        blurb="Two stacked bars became one. The tools moved up into the identity bar, which left the second bar holding a single tab chip — so it is now conditional on the session actually having more than one tab. The far-right metadata and the labelled Search Events switch moved behind More and into the overflow menu, because neither fits a fixed single line."
      >
        <Shot kind="before" label="Session replay" strokes={3} sidebar={270}>
          <SessionBefore />
          <Stage sidebar={270} />
        </Shot>
        <Shot
          kind="after"
          label="Session replay"
          strokes={1}
          note="single-tab session, which is every session today"
          sidebar={320}
        >
          {sessionAfter(single)}
        </Shot>
        <Shot
          kind="after"
          label="Session replay"
          strokes={2}
          note="three tabs — the strip returns, exactly as Sessions shows it"
          sidebar={320}
        >
          {sessionAfter(multi)}
        </Shot>
      </Pair>

      <Pair
        title="Spot"
        blurb="The bar stops growing with its data: the second line of browser, resolution and platform moves behind More. Copy and Manage Access lose their labels and become one share popover, since both of them are sharing. Both full-height dividers on the right go."
      >
        <Shot kind="before" label="Spot" strokes={4} sidebar={320}>
          <SpotBefore />
          <Stage sidebar={320} />
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
            <ReplayLocationBar url={MOCK_URL} />
            <Stage sidebar={320} />
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
          <IssueBefore />
          <Stage sidebar={320} />
        </Shot>
        <Shot kind="after" label="Issue replay" strokes={1} sidebar={320}>
          <PlayerContext.Provider value={single}>
            <IssueReplayHeader
              issue={undefined}
              variation="Card declined, then retried twice"
              date="Jun 04, 2026, 10:14"
              more={<div className="p-2 text-sm">session details</div>}
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
            <ReplayLocationBar url={MOCK_URL} />
            <Stage sidebar={320} />
          </PlayerContext.Provider>
        </Shot>
      </Pair>
    </div>
  );
}

export default observer(PlayerChromeCompare);
