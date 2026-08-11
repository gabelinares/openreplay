import { Tooltip } from 'antd';
import React from 'react';

/* THE quiet overflow counter: "+2" in small gray text, no chip around it.

   Used wherever a row shows what fits and folds the rest — the segments line, the
   issue list's tag cell, the session panel's metadata row. It was the same three
   lines of markup copy-pasted in each of those, so this is the one definition
   (Gabriel 08-11).

   Deliberately NOT a chip. A chip-shaped "+N" reads as one more item of the kind
   beside it, which is right for hidden tags on the issue cards and wrong
   everywhere else: next to metadata pairs or a segment name it announces itself
   as a peer when it is really a footnote about the row.

   Give it `titles` for the hover list, or `onClick` to expand in place. */
export default function MoreCount({
  n,
  titles,
  onClick,
}: {
  n: number;
  titles?: string[];
  onClick?: () => void;
}) {
  if (n <= 0) return null;
  const label = `+${n}`;
  const style = { color: 'var(--color-gray-medium)' };

  const body = onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="text-xs shrink-0 cursor-pointer"
      style={style}
    >
      {label}
    </button>
  ) : (
    <span className="text-xs shrink-0 cursor-default" style={style}>
      {label}
    </span>
  );

  if (!titles || titles.length === 0) return body;
  return (
    <Tooltip title={titles.join(', ')} placement="top">
      {body}
    </Tooltip>
  );
}
