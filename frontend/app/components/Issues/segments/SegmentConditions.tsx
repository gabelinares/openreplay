import React from 'react';
import { Button, Space, Tag } from 'antd';
import { getIconForFilter } from 'Shared/Filters/FilterModal';
import type { SavedSegment } from 'App/mstore/issuesStore';
import { hydrate } from './segmentUtils';

/* Read-only view of a segment's query, for hover cards (Gabriel 07-14: the
   plain-text one-liner was unreadable past ~2 conditions). Each condition is
   the LITERAL omni-search chip — the same antd Button + icon + "Category •
   Name" markup FilterItem renders in the drawer (chip recipe copied from
   FilterItem.tsx, incl. its w-6 rounded-full event numbering), so the two
   surfaces can never drift apart visually. Values follow as tags. Rendered
   inside a light Popover, never a dark Tooltip: chips need a surface. */

/** the FilterItem trigger chip, verbatim, minus interactivity */
function ConditionChip({ f }: { f: any }) {
  const categoryPart = f.subCategory || f.category;
  const namePart = f.displayName || f.label || f.name;
  return (
    <Button
      type="default"
      size="small"
      style={{ maxWidth: '20rem', flexShrink: 0, pointerEvents: 'none' }}
    >
      <Space size={4} align="center">
        <span className="text-gray-600 shrink-0">{getIconForFilter(f)}</span>
        {categoryPart && (
          <span className="text-neutral-500/90 capitalize truncate">
            {categoryPart}
          </span>
        )}
        {categoryPart && namePart && (
          <span className="text-neutral-400">•</span>
        )}
        <span className="text-black truncate">{namePart}</span>
      </Space>
    </Button>
  );
}

function SegmentConditions({ segment }: { segment: SavedSegment }) {
  const filters = React.useMemo(() => hydrate(segment.seeds), [segment.seeds]);
  const events = filters.filter((f) => f.isEvent);
  const rest = filters.filter((f) => !f.isEvent);

  const section = (label: string) => (
    <div
      className="text-[11px] font-medium uppercase tracking-wider mt-1 first:mt-0"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </div>
  );

  const row = (f: any, idx?: number) => {
    const vals = (f.value ?? []).filter((v: string) => v !== '' && v != null);
    return (
      <div
        key={`${f.name}-${idx ?? 'f'}`}
        className="flex items-center gap-2 flex-wrap"
      >
        {idx != null && (
          // the event-index badge, verbatim from FilterItem
          <span className="shrink-0 w-6 h-6 text-xs flex items-center justify-center rounded-full bg-gray-lightest text-gray-600 font-medium">
            {idx + 1}
          </span>
        )}
        <ConditionChip f={f} />
        {vals.length > 0 && f.operator && (
          <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
            {f.operator}
          </span>
        )}
        {vals.map((v: string) => (
          <Tag key={v} className="m-0!">
            {v}
          </Tag>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2" style={{ maxWidth: 340 }}>
      {filters.length ? (
        <>
          {events.length > 0 && section('Events — in order')}
          {events.map((f, i) => row(f, i))}
          {rest.length > 0 && section('Filters')}
          {rest.map((f) => row(f))}
        </>
      ) : (
        <div className="text-sm" style={{ color: 'var(--color-gray-medium)' }}>
          Matches all traffic
        </div>
      )}
      {/* footer: traffic share left, author right (Gabriel 07-14). Rhythm:
          the popover's inner padding is 12px, so every gap around the
          divider is 12 too — 8 (root gap) + mt-1 above it, pt-3 below. */}
      <div
        className="flex items-center justify-between gap-4 border-t mt-1 pt-3 text-xs"
        style={{ color: 'var(--color-gray-medium)' }}
      >
        <span>~{segment.trafficPct}% of traffic</span>
        {!segment.mine && <span>by {segment.createdBy}</span>}
      </div>
    </div>
  );
}

export default SegmentConditions;
