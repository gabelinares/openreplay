import { Button, Popover, Tooltip } from 'antd';
import { ChevronDown, Globe, Split } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import type { Issue } from 'App/mstore/issuesStore';
import { CheckRow } from '../TagFilter';

/* Issue-page segment scope (Mehdi 07-20, design approved by Gabriel 07-21).
   Two reusable pieces, shared grammar with the list's TagFilter dropdown:

   · FoundInChips — the header meta line: which segments this issue lives in
     (surfacing origin first, share-of-sample on hover). Clicking a chip
     scopes the example sessions to it.
   · SegmentScopeFilter — the sessions-toolbar control: a stable trigger
     button opening a checkbox list (multi-select, same pattern as Tags).

   Scope = SESSIONS ONLY: headline stats stay global. State lives in
   issuesStore.detailScope and is mirrored to the URL (?seg=1,2) so a scoped
   view is shareable and survives issue → session → back. */

/** write the current scope into the URL without a navigation */
export const syncScopeToUrl = (ids: number[]) => {
  const url = new URL(window.location.href);
  if (ids.length) url.searchParams.set('seg', ids.join(','));
  else url.searchParams.delete('seg');
  window.history.replaceState(null, '', url.toString());
};

export const FoundInChips = observer(function FoundInChips({
  issue,
}: {
  issue: Issue;
}) {
  const { issuesStore } = useStore();
  const rows = issuesStore.issueSegments(issue);
  const scoped = issuesStore.detailScope;
  const toggle = (id: number) => {
    issuesStore.toggleDetailScope(id);
    syncScopeToUrl(issuesStore.detailScope);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span style={{ color: 'var(--color-gray-medium)' }}>Found in:</span>
      {issue.segmentId == null && (
        <span
          className="inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          <Globe size={12} /> full traffic
        </span>
      )}
      {rows.map(({ segment, matched, total }) => {
        const on = scoped.includes(segment.id);
        return (
          <Tooltip
            key={segment.id}
            title={
              on
                ? 'Showing this segment’s sessions — click to clear'
                : `${matched} of ${total} sampled sessions · click to show only these`
            }
          >
            <button
              type="button"
              onClick={() => toggle(segment.id)}
              className="inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 cursor-pointer transition-colors"
              style={
                on
                  ? {
                      color: 'var(--color-main)',
                      borderColor: 'var(--color-main)',
                      background: 'var(--color-active-blue)',
                    }
                  : { color: 'var(--color-gray-darkest)' }
              }
            >
              <Split
                size={12}
                style={{ color: on ? 'var(--color-main)' : 'var(--color-gray-medium)' }}
              />
              {segment.name}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
});

export const SegmentScopeFilter = observer(function SegmentScopeFilter({
  issue,
}: {
  issue: Issue;
}) {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const rows = issuesStore.issueSegments(issue);
  const scoped = issuesStore.detailScope;
  const toggle = (id: number) => {
    issuesStore.toggleDetailScope(id);
    syncScopeToUrl(issuesStore.detailScope);
  };
  const clear = () => {
    issuesStore.clearDetailScope();
    syncScopeToUrl([]);
  };

  const label =
    scoped.length === 0
      ? 'All segments'
      : scoped.length === 1
        ? `Segment: ${issuesStore.segmentById(scoped[0])?.name ?? '…'}`
        : `Segments (${scoped.length})`;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="flex flex-col gap-0.5 w-64">
          {rows.map(({ segment, matched, total }) => (
            <CheckRow
              key={segment.id}
              on={scoped.includes(segment.id)}
              onClick={() => toggle(segment.id)}
              icon={<Split size={13} style={{ color: 'var(--color-gray-medium)' }} />}
            >
              {segment.name}
              <span style={{ color: 'var(--color-gray-medium)' }}>
                {' '}
                · {matched}/{total}
              </span>
            </CheckRow>
          ))}
          {rows.length === 0 && (
            <span className="text-sm px-2 py-1" style={{ color: 'var(--color-gray-medium)' }}>
              No segments match this issue’s sessions.
            </span>
          )}
          {scoped.length > 0 && (
            <>
              <div className="border-t my-1" />
              <Button type="text" size="small" onClick={clear} className="self-start">
                Clear
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* stable trigger — never resizes as selection changes (TagFilter grammar) */}
      <Button size="small" className={scoped.length ? 'border-main! text-main!' : undefined}>
        <span className="flex items-center gap-1.5">
          <Split size={13} />
          {label}
          <ChevronDown size={13} />
        </span>
      </Button>
    </Popover>
  );
});
