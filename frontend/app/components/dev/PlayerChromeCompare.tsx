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
import {
  PlayerContext,
  defaultContextValue,
} from 'Components/Session/playerContext';
import SpotPlayerHeader from 'Components/Spots/SpotPlayer/components/SpotPlayerHeader';
import { ReplayLocationBar } from 'Components/shared/ReplayChrome';

/* The three replay players' chrome, stacked, for the review Mehdi asked for:
   "make sure that the design environment has all of these things with examples,
   you cant miss anything."

   These are the REAL header components against seeded stores, not redrawings of
   them. That matters more than it looks: the whole exercise is making three
   things identical, so the page has to move when they move. A lookalike would
   agree with itself forever and tell us nothing.

   The plan this shows: context/player-makeup-plan-2026-08-20.md
   What it deliberately does NOT fix: BACKLOG.md §18.3 */

/* One block failing must not blank the page — that is how a design env stops
   being trusted. Each header renders inside this, so a crash is visible and
   local instead of total. */
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

/* One row per slot, so a difference between the three reads as a difference in
   the same row rather than something you have to hold in your head. */
const SLOTS = ['back', 'lead', 'primary', 'meta', 'actions', 'tabs'] as const;

const FILL: Record<string, Record<(typeof SLOTS)[number], string>> = {
  session: {
    back: '"Back"',
    lead: 'avatar',
    primary: 'user',
    meta: 'time · location',
    actions: 'share · highlight · overflow · queue',
    tabs: 'Activity / Click map / Tag',
  },
  spot: {
    back: '"All Spots"',
    lead: 'avatar',
    primary: 'spot title',
    meta: 'user · date',
    actions: 'share · overflow',
    tabs: 'Activity / Comments',
  },
  issue: {
    back: '"Back to issue"',
    lead: 'critical toggle',
    primary: 'variation',
    meta: 'date',
    actions: 'share · highlight · overflow · queue',
    tabs: 'Activity / Issue',
  },
};

function Fill({ which }: { which: keyof typeof FILL }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 pb-3 text-xs">
      {SLOTS.map((slot) => (
        <div key={slot} className="flex gap-2">
          <span
            className="shrink-0 text-right"
            style={{ width: 56, color: 'var(--color-gray-medium)' }}
          >
            {slot}
          </span>
          <span style={{ color: 'var(--color-gray-darkest)' }}>
            {FILL[which][slot]}
          </span>
        </div>
      ))}
    </div>
  );
}

function Block({
  title,
  which,
  children,
}: {
  title: string;
  which: keyof typeof FILL;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col bg-white rounded-lg border border-gray-light overflow-hidden">
      <div className="px-4 pt-3 pb-2 font-semibold">{title}</div>
      <Fill which={which} />
      {/* the app's own page tone under each header, because the bars no longer
          draw a bottom rule — they separate from the stage by tone, and on a
          white ground you would not be able to tell */}
      <div className="bg-gray-lightest border-t border-gray-light">
        <Boundary label={title}>{children}</Boundary>
      </div>
    </div>
  );
}

/* A stand-in for the stage. The subject here is the chrome, and mounting three
   real playback engines would need three real recordings. */
function Stage() {
  return (
    <div className="flex" style={{ height: 108 }}>
      <div
        className="flex-1 flex items-center justify-center text-xs"
        style={{ color: 'var(--color-gray-medium)' }}
      >
        replay stage
      </div>
      <div
        className="bg-white border-l border-gray-light flex items-center justify-center text-xs shrink-0"
        style={{ width: 320, color: 'var(--color-gray-medium)' }}
      >
        sidebar 320px
      </div>
    </div>
  );
}

const MOCK_URL = 'https://app.example.com/checkout/payment?step=3';

function PlayerChromeCompare() {
  const { sessionStore, spotStore } = useStore();
  const [ready, setReady] = React.useState(false);
  const [tab, setTab] = React.useState<'activity' | 'issue' | null>(null);

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

  return (
    <PlayerContext.Provider value={defaultContextValue as any}>
      <div className="p-6 flex flex-col gap-6" style={{ maxWidth: 1400 }}>
        <div className="flex flex-col gap-1">
          <div className="text-xl font-semibold">
            Replay chrome, side by side
          </div>
          <div
            className="text-sm"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            The real header components on seeded data. One bar, 50px, no rule
            under it; one full-bleed divider after Back; icon-only actions in
            one order; the location strip carries the only stroke. Products fill
            slots and nothing else.
          </div>
        </div>

        <Block title="Session replay" which="session">
          <PlayerBlockHeader
            activeTab=""
            setActiveTab={() => {}}
            tabs={{
              EVENTS: 'Activity',
              CLICKMAP: 'Click map',
              INSPECTOR: 'Tag',
            }}
          />
          <ReplayLocationBar url={MOCK_URL} />
          <Stage />
        </Block>

        <Block title="Spot replay" which="spot">
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
          <Stage />
        </Block>

        <Block title="Issue replay" which="issue">
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
          <Stage />
        </Block>
      </div>
    </PlayerContext.Provider>
  );
}

export default observer(PlayerChromeCompare);
