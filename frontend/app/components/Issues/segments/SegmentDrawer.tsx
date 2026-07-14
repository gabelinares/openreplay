import React from 'react';
import { Alert, Button, Drawer, Input, Segmented, Switch, Tooltip, message } from 'antd';
import { Check, Info, Lock, Plus, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { searchStore } from 'App/mstore';
import SessionFilters from 'Shared/SessionFilters';
import type { SavedSegment } from 'App/mstore/issuesStore';
import {
  estimateFromSeeds,
  hydrate,
  serialize,
  summarize,
} from './segmentUtils';

/* THE create/edit surface for a segment — the same component slid out from
   Issues and from Data Management (Mehdi 07-07: "turn it into a slide out and
   reuse the same component"). The query editor is the LITERAL Sessions
   omni-search (<SessionFilters/>, bound to the global searchStore) — identical
   behavior by construction. While the drawer is open we borrow the searchStore:
   its filters are snapshotted on open and restored on close, so the Sessions
   page never notices.

   One per-source difference left (Mehdi 07-13 — instructions now exist in
   BOTH sources):
   · visibility: DM shows the Team/Private control; Issues hides it — segments
     created from Issues are forced team-visible (only team-visible segments
     are capture-eligible, everyone must be able to stop them). */

interface Props {
  open: boolean;
  /** editing an existing segment; null = creating a new one */
  segment: SavedSegment | null;
  /** where the drawer was opened from — gates instructions and visibility */
  source: 'issues' | 'dm';
  onClose: () => void;
}

function SegmentDrawer({ open, segment, source, onClose }: Props) {
  const { issuesStore } = useStore();
  const fromIssues = source === 'issues';
  // edit-own / read-only-others (Mehdi 07-07) — teammates' segments open as
  // a view; anyone still toggles capture from the list, just not the query
  const readOnly = Boolean(segment && !segment.mine);
  const [name, setName] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);
  // capture is explicit in the drawer (07-13 category merge — one flag, no
  // hidden per-source defaults beyond the initial value)
  const [capture, setCapture] = React.useState(false);
  // instructions hidden behind a blue "Add instructions" link (Mehdi 07-07);
  // auto-expanded when editing a segment that already has some
  const [showInstructions, setShowInstructions] = React.useState(false);
  // bump to re-read the live estimate as the user edits the query
  const [, setTick] = React.useState(0);
  const snapshot = React.useRef<any[] | null>(null);

  // borrow the searchStore while open: snapshot → load this segment's query
  // (or empty) → hand the keys back on close
  React.useEffect(() => {
    if (open) {
      snapshot.current = searchStore.instance.filters;
      searchStore.edit({ filters: segment ? hydrate(segment.seeds) : [] });
      setName(segment?.name ?? '');
      setInstructions(segment?.instructions ?? '');
      setIsPublic(fromIssues ? true : (segment?.isPublic ?? true));
      // editing keeps the live flag; a new segment from Issues starts
      // capturing (that's what you came for), from DM it's a plain segment
      setCapture(segment?.active ?? fromIssues);
      setShowInstructions(Boolean(segment?.instructions));
    } else if (snapshot.current) {
      searchStore.edit({ filters: snapshot.current });
      snapshot.current = null;
    }
  }, [open, segment]);

  // live estimate: the current query serialized and run over the same
  // in-memory pool the Sessions page searches
  const filters = searchStore.instance.filters;
  const { pct, perDay } = open
    ? estimateFromSeeds(serialize(filters))
    : { pct: 0, perDay: 0 };
  const narrowed = filters.length > 0;

  const publicNow = fromIssues ? true : isPublic;
  // capture eligibility follows visibility live: flipping to Private while
  // capture is on silently can't hold — the switch drops with it
  const captureNow = capture && publicNow;

  const save = () => {
    const live = searchStore.instance.filters;
    const fellBack = issuesStore.saveSegment({
      id: segment?.id,
      name: name.trim() || 'Untitled segment',
      active: captureNow,
      isPublic: publicNow,
      seeds: serialize(live),
      summary: summarize(live),
      trafficPct: pct,
      sessionsPerDay: perDay,
      instructions: instructions.trim() || undefined,
    });
    if (fellBack)
      message.info(
        'No active segments left — capture switched to full traffic.',
      );
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      title={
        readOnly
          ? `${segment?.name} — by ${segment?.createdBy}`
          : segment
            ? 'Edit segment'
            : 'New segment'
      }
      styles={{ wrapper: { width: 560 }, footer: { padding: '12px 24px' } }}
      footer={
        readOnly ? (
          <div className="flex items-center justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button type="text" onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" icon={<Check size={15} />} onClick={save}>
              {segment ? 'Save segment' : 'Create segment'}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4" onKeyUp={() => setTick((t) => t + 1)} onClick={() => setTick((t) => t + 1)}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
            Name
          </span>
          <Input
            autoFocus={!segment}
            placeholder="e.g. Billing & checkout"
            value={name}
            maxLength={60}
            disabled={readOnly}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {fromIssues ? (
          // forced team-visible: capture is a shared budget, everyone must be
          // able to stop it — so there is no way to create an ineligible
          // segment from here
          <div
            className="flex items-center gap-1.5 text-xs -mt-2"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <Users size={13} />
            Team-visible — anyone on the team can manage its capture.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              Visibility
            </span>
            <Segmented
              value={isPublic ? 'team' : 'private'}
              disabled={readOnly}
              onChange={(v) => setIsPublic(v === 'team')}
              options={[
                {
                  value: 'team',
                  label: (
                    <span className="flex items-center gap-1.5 px-1">
                      <Users size={13} /> Team
                    </span>
                  ),
                },
                {
                  value: 'private',
                  label: (
                    <span className="flex items-center gap-1.5 px-1">
                      <Lock size={13} /> Private
                    </span>
                  ),
                },
              ]}
              className="self-start"
            />
          </div>
        )}

        {/* Issues Agent, explicit (07-13 merge — one flag, the same setting
            the DM list and the Issues popover toggle). Named after the agent,
            not "capture traffic" (Mehdi 07-13): the switch enables the agent
            on this segment. Same section grammar as Name/Visibility; follows
            visibility live. */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              Issues Agent
            </span>
            <Tooltip title="The agent reviews sessions matching this segment and reports what it finds on the Issues page. Anyone on the team can switch it off.">
              <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              size="small"
              checked={captureNow}
              disabled={readOnly || !publicNow}
              onChange={setCapture}
              aria-label={`Issues agent ${captureNow ? 'on' : 'off'}`}
            />
            <span className="text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
              Identify issues in this segment
            </span>
          </div>
          {!publicNow && (
            <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
              Private — make it team-visible to enable the agent.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              {fromIssues ? 'What to capture' : 'Conditions'}
            </span>
            <Tooltip title="Define the portion of traffic with the same events and filters as the Sessions search. In segment capture, the agent records only sessions matching active segments.">
              <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
                <Info size={13} />
              </span>
            </Tooltip>
          </div>
          {/* the Sessions omni-search, verbatim; inert in read-only view */}
          <div className={readOnly ? 'pointer-events-none opacity-60' : undefined}>
            <SessionFilters />
          </div>
        </div>

        {/* the estimate (Mehdi 07-07: "make it nice") — the app's standard
            info banner (antd Alert, as in NoSessionsMessage), uniform text */}
        <Alert
          type="info"
          showIcon
          className="border-transparent rounded-lg"
          title={
            narrowed
              ? `Captures ≈${pct}% of your traffic · ~${perDay.toLocaleString()} sessions analysed per day`
              : 'Add events or filters to narrow the segment — right now it matches all traffic.'
          }
        />

        {/* instructions live in BOTH sources (Mehdi 07-13 — was Issues-only
            per 07-07; the drawer is one component, the fields match). Shown
            read-only on teammates' segments when they exist. */}
        {showInstructions ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
              Instructions{' '}
              <span className="font-normal" style={{ color: 'var(--color-gray-medium)' }}>
                (optional)
              </span>
            </span>
            <Input.TextArea
              rows={3}
              maxLength={500}
              autoFocus={!readOnly && !segment?.instructions}
              disabled={readOnly}
              placeholder='Extra context for the agent — e.g. "pay special attention to coupon and card-validation errors"'
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        ) : (
          !readOnly && (
            <Button
              type="link"
              size="small"
              icon={<Plus size={14} />}
              onClick={() => setShowInstructions(true)}
              className="self-start px-0!"
            >
              Add instructions
            </Button>
          )
        )}
      </div>
    </Drawer>
  );
}

export default observer(SegmentDrawer);
