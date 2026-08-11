import { Tooltip } from 'antd';
import React from 'react';

import MetaItem from 'Shared/SessionItem/MetaItem';

import { RowTagChip } from './IssuesList';
import MoreCount from './MoreCount';

/* One-line chip row (Mehdi 07-28): wrapping tag rows made the session cards
   misalign, so chips never wrap — the row shows as many as fit and folds the
   rest behind a "+N" chip whose tooltip lists them. A hidden clone of the full
   row is measured (chips + the +N probe), so the visible row never clips a chip
   mid-way. Re-measures on container resize.

   Carries plain tags (one word each) and session metadata (a key and a value)
   alike, because the folding is the same problem either way — the session panel
   needs it more than the cards do, with a dozen-plus metadata fields in a narrow
   popover (Gabriel 08-11, OR-3665).

   A metadata pair renders through MetaItem, the app's OWN metadata pill, not
   through a chip of ours that merely resembles it: metadata already has a
   component and the sessions list uses it, so a second one here would be a
   lookalike drifting from the real thing (Gabriel 08-11). */

const GAP = 6; // = the row's gap-1.5

/** a chip's content: a bare tag, or a metadata key with its value */
export type RowChip = string | { label: string; value?: string };

const asChip = (c: RowChip) => (typeof c === 'string' ? { label: c } : c);
/** what the +N tooltip and the measuring key read */
const chipText = (c: RowChip) => {
  const { label, value } = asChip(c);
  return value === undefined ? label : `${label} ${value}`;
};

/** a bare tag is a tag chip; a key/value pair is the app's metadata pill */
function Chip({ chip }: { chip: RowChip }) {
  const { label, value } = asChip(chip);
  return value === undefined ? (
    <RowTagChip label={label} />
  ) : (
    <MetaItem label={label} value={value} className="shrink-0" />
  );
}

export default function TagsRow({ tags }: { tags: RowChip[] }) {
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState(tags.length);
  /* How the overflow reads depends on what the row holds. Hidden TAGS fold into a
     chip-shaped "+N" (Mehdi 07-28) — it sits among tags as one of them. Metadata
     pairs fold into the quiet gray "+N" the segments line uses, because a chip
     there would pose as another pair (Gabriel 08-11). */
  const pairs = tags.some((t) => typeof t !== 'string');

  React.useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return undefined;
    const compute = () => {
      const max = el.clientWidth;
      const kids = Array.from(el.children) as HTMLElement[];
      const probeW = kids[kids.length - 1]?.offsetWidth ?? 0;
      const widths = kids.slice(0, tags.length).map((k) => k.offsetWidth);
      const fits = (n: number) => {
        const chipsW =
          widths.slice(0, n).reduce((a, w) => a + w, 0) +
          Math.max(0, n - 1) * GAP;
        const overflowW = n < tags.length ? (n ? GAP : 0) + probeW : 0;
        return chipsW + overflowW <= max;
      };
      let n = tags.length;
      while (n > 0 && !fits(n)) n -= 1;
      setFit(n);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tags.map(chipText).join('\u0000')]);

  if (tags.length === 0) return null;
  const hidden = tags.slice(fit);

  return (
    <div className="relative w-full">
      {/* hidden measuring clone: every chip + the +N probe, natural widths */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute inset-x-0 top-0 flex items-center gap-1.5 invisible overflow-hidden"
      >
        {tags.map((t) => (
          <Chip key={chipText(t)} chip={t} />
        ))}
        {/* the probe must be whichever overflow this row will actually render, or
            the measurement reserves the wrong width */}
        {pairs ? (
          <MoreCount n={tags.length} />
        ) : (
          <RowTagChip label={`+${tags.length}`} />
        )}
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden">
        {tags.slice(0, fit).map((t) => (
          <Chip key={chipText(t)} chip={t} />
        ))}
        {hidden.length > 0 &&
          (pairs ? (
            <MoreCount n={hidden.length} titles={hidden.map(chipText)} />
          ) : (
            <Tooltip title={hidden.map(chipText).join(' · ')}>
              <span className="shrink-0 cursor-default">
                <RowTagChip label={`+${hidden.length}`} />
              </span>
            </Tooltip>
          ))}
      </div>
    </div>
  );
}
