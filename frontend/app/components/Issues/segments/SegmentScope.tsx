import { Globe, Split } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import type { Issue } from 'App/mstore/issuesStore';

import MoreCount from '../MoreCount';

/* Issue-page segment scope (Mehdi 07-20, design approved by Gabriel 07-21).

   · FoundInChips — the header meta line: which segments this issue lives in
     (surfacing origin first, share-of-sample on hover). Clicking a chip
     scopes the example sessions to it.
   · The sessions-toolbar control is the list's own SegmentFilter dropdown
     (TagFilter.tsx), reused verbatim since 07-28 — same grammar, same look.

   Scope = SESSIONS ONLY: headline stats stay global. State lives in
   issuesStore.detailScope and is mirrored to the URL (?seg=1,2) so a scoped
   view is shareable and survives issue → session → back. */

/** THE segment chip — one look everywhere a segment is named (issue page
 *  "Found in", replay session panel). Interactive when onClick is given. */
export function SegmentChip({
  name,
  on = false,
  onClick,
}: {
  name: string;
  on?: boolean;
  onClick?: () => void;
}) {
  const className =
    'inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 transition-colors';
  const style = on
    ? {
        color: 'var(--color-main)',
        borderColor: 'var(--color-main)',
        background: 'var(--color-active-blue)',
      }
    : { color: 'var(--color-gray-darkest)' };
  const icon = (
    <Split
      size={12}
      style={{ color: on ? 'var(--color-main)' : 'var(--color-gray-medium)' }}
    />
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} cursor-pointer`}
      style={style}
    >
      {icon}
      {name}
    </button>
  ) : (
    <span className={`${className} cursor-default`} style={style}>
      {icon}
      {name}
    </span>
  );
}

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
  const [showAll, setShowAll] = React.useState(false);
  const rows = issuesStore.issueSegments(issue);
  const scoped = issuesStore.detailScope;
  const toggle = (id: number) => {
    issuesStore.toggleDetailScope(id);
    syncScopeToUrl(issuesStore.detailScope);
  };

  // many segments collapse behind a "+N" (same grammar as the list's tag
  // overflow) — scoped ones are always kept visible so an active filter can't
  // hide its own control
  const CAP = 3;
  const visible =
    showAll || rows.length <= CAP
      ? rows
      : rows.filter(
          ({ segment }, i) => i < CAP || scoped.includes(segment.id),
        );
  const hiddenCount = rows.length - visible.length;

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
      {visible.map(({ segment }) => (
        <SegmentChip
          key={segment.id}
          name={segment.name}
          on={scoped.includes(segment.id)}
          onClick={() => toggle(segment.id)}
        />
      ))}
      <MoreCount n={hiddenCount} onClick={() => setShowAll(true)} />
    </div>
  );
});

