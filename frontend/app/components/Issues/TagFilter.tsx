import React from 'react';
import { Popover, Button, Input, Checkbox, Modal, Segmented, message } from 'antd';
import {
  Search,
  Tag as TagIcon,
  ChevronDown,
  CircleUser,
  Plus,
  Split,
  Globe,
} from 'lucide-react';
import type { IssueOrigin } from 'App/mstore/issuesStore';

/* The list's attribute filters, modeled on OpenReplay's FilterSelection +
   ValueAutoComplete: STABLE trigger buttons (they never resize as you select)
   opening Popovers where the selection happens, so nothing in the toolbar
   reflows.

   Tags and segments are SEPARATE dropdowns (Gabriel 07-27): they answer
   different questions (what happened vs where it was captured) and each has
   to scale on its own — 8+ predefined tags plus any number of custom ones,
   and ~10 segments. Both stay built for that scale: search when it grows,
   the app's picker grammar for the segment tail, scroll for tags. "New tag"
   opens the creation dialog: name + a natural-language description the agent
   matches automatically. */

export function CheckRow({
  on,
  onClick,
  icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-2 rounded cursor-pointer hover:bg-active-blue${on ? ' bg-active-blue-faded' : ''}`}
      style={{ height: 32 }}
    >
      <Checkbox checked={on} tabIndex={-1} />
      {icon}
      <span className="truncate text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
        {children}
      </span>
    </div>
  );
}

const panelFooter = (n: number, onClear: () => void) => (
  <div className="flex items-center justify-between border-t pt-2">
    <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
      {n} selected
    </span>
    <Button type="text" size="small" disabled={!n} onClick={onClear}>
      Clear
    </Button>
  </div>
);

const popoverClassNames = {
  root: 'rounded-lg border border-gray-200 shadow-xs overflow-hidden',
};

/* ──────────────────────────── Tags ──────────────────────────── */

export default function TagFilter({
  allTags,
  labels,
  match,
  onToggle,
  onSetMatch,
  onClear,
  onCreateTag,
}: {
  allTags: string[];
  labels: string[];
  match: 'all' | 'any';
  onToggle: (t: string) => void;
  onSetMatch: (m: 'all' | 'any') => void;
  onClear: () => void;
  /** creates a customer-defined journey tag (name + NL description) */
  onCreateTag?: (name: string, description: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const n = labels.length;
  const ql = q.toLowerCase().trim();
  const shown = allTags.filter((t) => t.toLowerCase().includes(ql));

  const closeCreate = () => {
    setCreating(false);
    setNewName('');
    setNewDesc('');
  };
  const createTag = () => {
    onCreateTag?.(newName.trim(), newDesc.trim());
    message.success('Tag created. The agent starts applying it to new sessions.');
    closeCreate();
  };

  const panel = (
    <div style={{ width: 272 }} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          size="small"
          allowClear
          placeholder="Search tags"
          prefix={<Search size={15} style={{ color: 'var(--color-gray-medium)', marginRight: 2 }} />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Segmented
          size="small"
          value={match}
          onChange={(v) => onSetMatch(v as 'all' | 'any')}
          options={[
            { label: 'AND', value: 'all' },
            { label: 'OR', value: 'any' },
          ]}
        />
      </div>

      <div className="overflow-y-auto -mx-1 px-1" style={{ maxHeight: 224 }}>
        {shown.length ? (
          shown.map((t) => (
            <CheckRow key={t} on={labels.includes(t)} onClick={() => onToggle(t)}>
              {t}
            </CheckRow>
          ))
        ) : (
          <div className="text-sm px-2 py-3" style={{ color: 'var(--color-gray-medium)' }}>
            No tags match “{q}”
          </div>
        )}
      </div>

      {/* creation entry rides the filter (Mehdi 07-27) — the same quiet link
          grammar as the segment drawer's "Add instructions" */}
      {onCreateTag && (
        <Button
          type="link"
          size="small"
          icon={<Plus size={14} />}
          onClick={() => setCreating(true)}
          className="self-start px-0!"
        >
          New tag
        </Button>
      )}

      {panelFooter(n, onClear)}
    </div>
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={panel}
        classNames={popoverClassNames}
      >
        <Button size="small" icon={<TagIcon size={14} />}>
          Tags{n ? ` · ${n}` : ''}
          <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6 }} />
        </Button>
      </Popover>

      {/* new-tag dialog — the app dialog grammar (Issues Hide modal): no icon,
          default width, explanation in a gray body line. Attribution is
          automatic from the description; the caption sets expectations so a
          zero-match tag is never a surprise discovered weeks later. */}
      <Modal
        title="New journey tag"
        open={creating}
        onCancel={closeCreate}
        onOk={createTag}
        okText="Create tag"
        okButtonProps={{ disabled: !newName.trim() || !newDesc.trim() }}
      >
        <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
          Describe the journey in plain words. The agent reads every captured
          session and applies the tag automatically when it matches.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            maxLength={40}
            placeholder="Name, e.g. Offer scheduling"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input.TextArea
            rows={3}
            maxLength={300}
            placeholder="e.g. Any session where the user schedules or reschedules an offer, from the offers page or the email link."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
            Applies to sessions captured from now on; existing sessions are not
            re-scanned.
          </span>
        </div>
      </Modal>
    </>
  );
}

/* ─────────────────────────── Segments ─────────────────────────── */

/** "Found in" filter as its own dropdown — origin is an issue attribute, but a
 *  different species from tags (where it was captured, not what happened).
 *  Same trigger grammar as the issue page's Segments control. Rows follow the
 *  SegmentsIndicator picker at rest: first 5 + "search to find them". */
export function SegmentFilter({
  segments,
  origins,
  onToggleOrigin,
  onClear,
}: {
  /** `mine` powers the aggregate "My segments" row */
  segments: { id: number; name: string; mine?: boolean }[];
  origins: IssueOrigin[];
  onToggleOrigin: (o: IssueOrigin) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const n = origins.length;
  const ql = q.toLowerCase().trim();
  const SEG_CAP = 5;

  const shown = ql
    ? segments.filter((s) => s.name.toLowerCase().includes(ql))
    : segments;
  const rest = ql ? shown : shown.slice(0, SEG_CAP);
  const hidden = shown.length - rest.length;
  const showFull = !ql || 'full traffic'.includes(ql);
  // aggregate "mine" shortcut over the segments I own (Mehdi 07-07): on when
  // every one of my segments is selected; a click toggles them as a set
  const myIds = segments.filter((s) => s.mine).map((s) => s.id);
  const mineOn = myIds.length > 0 && myIds.every((id) => origins.includes(id));
  const showMine = myIds.length > 0 && (!ql || 'my segments'.includes(ql));
  const toggleMine = () => {
    (mineOn ? myIds : myIds.filter((id) => !origins.includes(id))).forEach(
      onToggleOrigin,
    );
  };

  const panel = (
    <div style={{ width: 260 }} className="flex flex-col gap-2">
      {segments.length > SEG_CAP && (
        <Input
          size="small"
          allowClear
          placeholder="Search segments"
          prefix={<Search size={15} style={{ color: 'var(--color-gray-medium)', marginRight: 2 }} />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      <div className="-mx-1 px-1">
        {showFull && (
          <CheckRow
            on={origins.includes('full')}
            onClick={() => onToggleOrigin('full')}
            icon={<Globe size={14} style={{ color: 'var(--color-gray-medium)' }} />}
          >
            Full traffic
          </CheckRow>
        )}
        {showMine && (
          <CheckRow
            on={mineOn}
            onClick={toggleMine}
            icon={<CircleUser size={14} style={{ color: 'var(--color-main)' }} />}
          >
            My segments
          </CheckRow>
        )}
        {rest.map((s) => (
          <CheckRow
            key={s.id}
            on={origins.includes(s.id)}
            onClick={() => onToggleOrigin(s.id)}
            icon={<Split size={14} style={{ color: 'var(--color-main)' }} />}
          >
            {s.name}
          </CheckRow>
        ))}
        {hidden > 0 && (
          <div className="text-xs px-2 py-1" style={{ color: 'var(--color-gray-medium)' }}>
            {hidden} more · search to find them
          </div>
        )}
        {ql && !showFull && !showMine && shown.length === 0 && (
          <div className="text-xs px-2 py-1" style={{ color: 'var(--color-gray-medium)' }}>
            No segments match “{q}”
          </div>
        )}
      </div>
      {panelFooter(n, onClear)}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      content={panel}
      classNames={popoverClassNames}
    >
      <Button size="small" icon={<Split size={14} />}>
        Segments{n ? ` · ${n}` : ''}
        <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6 }} />
      </Button>
    </Popover>
  );
}
