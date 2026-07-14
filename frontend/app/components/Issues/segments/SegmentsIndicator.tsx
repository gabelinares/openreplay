import React from 'react';
import { Button, Input, Popover, Segmented, Switch, Tooltip, message } from 'antd';
import {
  ChevronDown,
  ChevronLeft,
  Globe,
  Info,
  Lock,
  Pencil,
  Plus,
  Search,
  Split,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import type { SavedSegment } from 'App/mstore/issuesStore';
import SegmentConditions from './SegmentConditions';
import SegmentDrawer from './SegmentDrawer';
import { estimateFromSeeds } from './segmentUtils';
import './captureSwitch.css';

/* The Traffic Segments entry point (Gabriel 07-13): ONE pill by the "Issues"
   title that is both the on/off control and the door to settings — a real
   Switch flips capture mode in place, clicking the rest of the pill opens
   this management popover. It deliberately does NOT live in the filter row:
   capture is a project-wide setting, not a view filter, and sitting next to
   Tags/Display made it read as one. The popover has two views:
   · main — the big capture-mode toggle (segments REPLACE full traffic), then
     the capturing segments: Yours / Team, a switch per segment (anyone can
     toggle: it's the project's shared capture setting), edit/delete on your
     own, "Add segment" at the bottom. Capture is ONE flag (07-13 category
     merge): switching a row off removes it from this list — but only on the
     next open; while the popover stays open, rows are pinned so a toggle
     can be undone in place;
   · picker — "Add segment" swaps the content in place (back arrow): existing
     segments to switch on. Segments = the same saved segments Data Management
     lists; only team-visible ones are eligible (everyone must be able to stop
     a capture), private ones show locked. "New segment" opens the shared
     create drawer. */

const FELL_BACK_MSG =
  'No active segments left — capture switched to full traffic.';

function SegmentRow({
  segment,
  onEdit,
}: {
  segment: SavedSegment;
  onEdit: (s: SavedSegment) => void;
}) {
  const { issuesStore } = useStore();
  // row meta = the traffic % only (Mehdi 07-07: "the 2%, that's it");
  // the query (organized chips), share and author stay one hover away,
  // behind the SAME Info-icon affordance as the picker rows (Gabriel 07-14)
  return (
    <div className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-gray-lightest transition-colors">
      <span
        className="text-sm font-medium truncate min-w-0 flex-1 cursor-default"
        style={{
          color: segment.active
            ? 'var(--color-gray-darkest)'
            : 'var(--color-gray-dark)',
        }}
      >
        {segment.name}
      </span>
      <Popover
        content={<SegmentConditions segment={segment} />}
        placement="left"
        trigger="hover"
        mouseEnterDelay={0.45}
      >
        <span
          className="shrink-0 flex items-center cursor-help"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          <Info size={13} />
        </span>
      </Popover>

      <span
        className="text-sm tabular-nums shrink-0"
        style={{ color: 'var(--color-gray-dark)' }}
      >
        ~{segment.trafficPct}%
      </span>

      <Switch
        size="small"
        checked={segment.active}
        aria-label={`${segment.name} — ${segment.active ? 'on' : 'off'}`}
        onChange={(on) => {
          if (issuesStore.toggleSegment(segment.id, on))
            message.info(FELL_BACK_MSG);
        }}
      />

      {/* far-right actions slot — constant width so every switch shares one
          edge. Edit is the ONLY action left (Mehdi 07-13: deletion lives in
          the DM page; the row switch replaced "remove from list"), so it's a
          direct pencil, not a one-item ellipsis menu (Gabriel 07-14). On
          teammates' rows the pencil shows disabled and the tooltip names who
          CAN edit, so the rule teaches instead of just refusing. */}
      <span className="w-6 shrink-0 flex items-center justify-center">
        {segment.mine ? (
          <Tooltip title="Edit" placement="top">
            <button
              type="button"
              aria-label="Edit segment"
              onClick={() => onEdit(segment)}
              className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Pencil size={14} />
            </button>
          </Tooltip>
        ) : (
          <Tooltip
            title={`Only ${segment.createdBy} can edit this segment.`}
            placement="top"
          >
            <span
              aria-label={`Only ${segment.createdBy} can edit this segment`}
              className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity cursor-not-allowed"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Pencil size={14} />
            </span>
          </Tooltip>
        )}
      </span>
    </div>
  );
}

/** picker row — title only (Mehdi 07-13); the conditions live behind the
    same Info-icon + tooltip affordance the rest of the app uses, and the
    private explanation sits on the lock itself (one short sentence) */
function CandidateRow({
  segment,
  onEnable,
}: {
  segment: SavedSegment;
  onEnable: (s: SavedSegment) => void;
}) {
  const eligible = segment.isPublic;
  return (
    <div
      role={eligible ? 'button' : undefined}
      onClick={eligible ? () => onEnable(segment) : undefined}
      className={`flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg transition-colors${
        eligible ? ' cursor-pointer hover:bg-gray-lightest group' : ''
      }`}
      style={eligible ? undefined : { opacity: 0.55 }}
    >
      <span className="text-sm font-medium truncate min-w-0 flex-1" style={{ color: 'var(--color-gray-darkest)' }}>
        {segment.name}
      </span>
      {/* conditions as organized chips (Gabriel 07-14), light card — a dark
          text tooltip can't hold a 4-condition query */}
      <Popover
        content={<SegmentConditions segment={segment} />}
        placement="left"
        trigger="hover"
        mouseEnterDelay={0.45}
      >
        <span
          className="shrink-0 flex items-center cursor-help"
          style={{ color: 'var(--color-gray-medium)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Info size={13} />
        </span>
      </Popover>
      {eligible ? (
        <span
          className="w-4 shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-main)' }}
        >
          <Plus size={15} />
        </span>
      ) : (
        <Tooltip
          title="Private — make it team-visible to capture traffic."
          placement="left"
        >
          <span className="w-4 shrink-0 flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
            <Lock size={13} />
          </span>
        </Tooltip>
      )}
    </div>
  );
}

function SegmentsIndicator() {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<'main' | 'picker'>('main');
  const [pickerQuery, setPickerQuery] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);
  // rows pinned for this open: capture is one flag, so a switched-off row
  // would otherwise vanish mid-interaction — pin what was listed (or added)
  // while the popover is open, so a toggle can be undone in place
  const [pinned, setPinned] = React.useState<number[]>([]);

  const listed = issuesStore.segments.filter(
    (s) => s.active || pinned.includes(s.id),
  );
  const mine = listed.filter((s) => s.mine);
  const team = listed.filter((s) => !s.mine);
  const activeCount = issuesStore.activeSegmentCount;
  const segmentsMode = issuesStore.captureMode === 'segments';

  // every visible-to-me segment not currently listed; eligible (team) ones
  // first, private ones locked at the bottom as a teaching moment. At rest
  // only the 5 most recently updated show (Mehdi 07-13: keep the list short,
  // make the order legible — the caption states the sort); search reaches
  // everything else.
  const q = pickerQuery.trim().toLowerCase();
  const allCandidates = issuesStore.segments
    .filter((s) => (s.isPublic || s.mine) && !s.active && !pinned.includes(s.id))
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        Number(b.isPublic) - Number(a.isPublic) || b.updatedAt - a.updatedAt,
    );
  const candidates = q ? allCandidates : allCandidates.slice(0, 5);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setPinned(issuesStore.capturingSegments.map((s) => s.id));
    } else {
      setView('main');
      setPickerQuery('');
    }
  };

  const startCreate = () => {
    setEditing(null);
    setOpen(false);
    setDrawerOpen(true);
  };
  const startEdit = (s: SavedSegment) => {
    setEditing(s);
    setOpen(false);
    setDrawerOpen(true);
  };

  // switching an existing segment on recomputes its estimate from the live
  // pool; pin it so it stays listed even if toggled back off before closing
  const enable = (s: SavedSegment) => {
    issuesStore.enableCapture(s.id, estimateFromSeeds(s.seeds));
    setPinned((p) => (p.includes(s.id) ? p : [...p, s.id]));
    setView('main');
    setPickerQuery('');
    message.success(`${s.name} added to traffic segments.`);
  };

  const sectionTitle = (label: string) => (
    <div
      className="text-[11px] font-medium uppercase tracking-wider mt-3 mb-0.5"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </div>
  );

  const mainView = (
    <>
      {/* header — title + what this thing does */}
      <div className="pb-2.5 border-b -mx-1 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-base font-semibold"
            style={{ color: 'var(--color-gray-darkest)' }}
          >
            Traffic Segments
          </span>
          <Tooltip
            placement="bottom"
            title="Choose what the agent captures: the full traffic sample, or only sessions matching your active segments. Anyone can switch — it's the project's shared capture setting."
          >
            <span
              className="flex items-center cursor-help"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Info size={14} />
            </span>
          </Tooltip>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-gray-medium)' }}>
          Capture everything, or only the traffic you care about.
        </div>
      </div>

      {/* the big capture-mode toggle — segments REPLACE full traffic */}
      <div className="mt-3 flex flex-col gap-1.5">
        <Segmented
          block
          value={issuesStore.captureMode}
          onChange={(v) => issuesStore.setCaptureMode(v as 'full' | 'segments')}
          options={[
            {
              value: 'full',
              label: (
                <span className="flex items-center justify-center gap-1.5 py-0.5">
                  <Globe size={14} /> Full traffic
                </span>
              ),
            },
            {
              value: 'segments',
              disabled: activeCount === 0,
              label: (
                <span className="flex items-center justify-center gap-1.5 py-0.5">
                  <Split size={14} /> Segments
                </span>
              ),
            },
          ]}
        />
        <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          {segmentsMode
            ? 'Only sessions matching active segments are captured.'
            : activeCount === 0
              ? 'Turn on a segment to enable segment capture.'
              : 'The agent samples across all traffic. Active segments apply when you switch.'}
        </span>
      </div>

      {listed.length === 0 ? (
        <div className="text-sm py-3" style={{ color: 'var(--color-gray-medium)' }}>
          No capturing segments yet — the agent captures the full traffic
          sample. Add one to capture only the part you care about.
        </div>
      ) : (
        /* in Full traffic mode the capture set is dormant — fade the list so
           it reads as "takes effect when you pick Segments" (still editable:
           you can stage the set before switching) */
        <div
          className={`transition-opacity duration-200${segmentsMode ? '' : ' opacity-50'}`}
        >
          {/* "Mine" (Gabriel 07-14) — matches the app's created-by-me jargon */}
          {mine.length > 0 && sectionTitle('Mine')}
          {mine.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
          {team.length > 0 && sectionTitle('Team')}
          {team.map((s) => (
            <SegmentRow key={s.id} segment={s} onEdit={startEdit} />
          ))}
        </div>
      )}

      <div className="border-t mt-2.5 pt-2 -mx-1 px-1">
        <Button
          type="text"
          icon={<Plus size={15} />}
          onClick={() => setView('picker')}
          className="w-full"
        >
          Add segment
        </Button>
      </div>
    </>
  );

  const pickerView = (
    <>
      {/* back header — same in-place swap pattern as antd cascaded panels */}
      <div className="flex items-center gap-1 pb-2.5 border-b -mx-1 px-1">
        <Button
          type="text"
          size="small"
          icon={<ChevronLeft size={15} />}
          onClick={() => setView('main')}
          aria-label="Back"
          className="px-1!"
        />
        <span className="text-base font-semibold" style={{ color: 'var(--color-gray-darkest)' }}>
          Add segment
        </span>
      </div>

      <div className="mt-2.5">
        <Input
          size="small"
          allowClear
          autoFocus
          placeholder="Search segments"
          prefix={<Search size={14} style={{ color: 'var(--color-gray-medium)', marginRight: 2 }} />}
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
        />
      </div>

      {/* the caption states the sort, so rows don't need a meta line */}
      {!q && candidates.length > 0 && sectionTitle('Recently updated')}

      <div className="overflow-y-auto mt-1 -mx-1 px-1" style={{ maxHeight: 264 }}>
        {candidates.length ? (
          candidates.map((s) => (
            <CandidateRow key={s.id} segment={s} onEnable={enable} />
          ))
        ) : (
          <div className="text-sm px-1 py-3" style={{ color: 'var(--color-gray-medium)' }}>
            {q
              ? `No segments match “${pickerQuery}”`
              : 'Every existing segment is already capturing — create a new one below.'}
          </div>
        )}
      </div>

      <div className="border-t mt-2 pt-2 -mx-1 px-1">
        <Button
          type="text"
          icon={<Plus size={15} />}
          onClick={startCreate}
          className="w-full"
        >
          Create new
        </Button>
      </div>
    </>
  );

  const content = (
    <div className="flex flex-col" style={{ width: 340 }}>
      {view === 'main' ? mainView : pickerView}
    </div>
  );

  // the pill's switch is the capture-mode control; with nothing to capture it
  // sits disabled and the pill (still clickable) is where you fix that
  const canSegment = activeCount > 0;
  const onSwitch = (on: boolean) => {
    issuesStore.setCaptureMode(on ? 'segments' : 'full');
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        trigger="click"
        placement="bottomLeft"
        content={content}
      >
        {/* the switcher-that-opens: a real Switch (flips capture in place,
            click stops there) inside a pill whose remaining surface opens the
            popover — same height/idiom as the small trigger buttons, but the
            embedded switch keeps it from reading as a list filter. Mehdi's
            "alive" cue (07-07) now pulses from the switch itself when on. */}
        <Tooltip
          placement="bottom"
          title={
            open
              ? ''
              : segmentsMode
                ? `Capturing only active segments (${activeCount}) — switch off for full traffic`
                : canSegment
                  ? 'Capturing full traffic — switch on to capture only active segments'
                  : 'Capturing full traffic — open to add a segment and capture less'
          }
        >
          <div
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label={`Traffic segments — ${segmentsMode ? `capturing ${activeCount} active` : 'off, capturing full traffic'}. Opens settings`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(!open);
              }
            }}
            className="capture-pill border rounded-md flex items-center gap-2 pl-1.5 pr-2 shrink-0 cursor-pointer select-none"
            style={{ height: 24 }}
          >
            {/* live switch owns its clicks; a disabled one passes them
                through, so tapping it still opens the popover (the only way
                to make it enableable) */}
            <span
              className="flex items-center"
              onClick={
                segmentsMode || canSegment
                  ? (e) => e.stopPropagation()
                  : undefined
              }
            >
              <Switch
                size="small"
                checked={segmentsMode}
                disabled={!segmentsMode && !canSegment}
                // capture-switch pins the label spans to the track height so
                // the SVG icons can't break antd's stacked-span slide
                className={`capture-switch${segmentsMode ? ' seg-live-border' : ''}`}
                style={
                  !segmentsMode && !canSegment
                    ? { pointerEvents: 'none' }
                    : undefined
                }
                // mode icons ride the switch: Split when capturing segments,
                // Globe when on full traffic — the same pair the popover's
                // Segmented uses
                checkedChildren={<Split size={10} />}
                unCheckedChildren={<Globe size={10} />}
                aria-label={`Segment capture ${segmentsMode ? 'on' : 'off'}`}
                onChange={onSwitch}
              />
            </span>
            <span className="text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
              Traffic segments
              {segmentsMode && (
                <span style={{ color: 'var(--color-gray-dark)' }}>
                  {' '}· {activeCount} active
                </span>
              )}
            </span>
            <ChevronDown size={13} style={{ opacity: 0.6 }} />
          </div>
        </Tooltip>
      </Popover>

      <SegmentDrawer
        open={drawerOpen}
        segment={editing}
        source="issues"
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export default observer(SegmentsIndicator);
