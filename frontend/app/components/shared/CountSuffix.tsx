import React from 'react';

/** The faded count that rides a label: `All 11`, `By OpenReplay 10`.
 *
 *  It was written out inline in five places (the Issues list's category tabs,
 *  the Tests and Runs tabs, the Audits list, and the journey-tag manager), all
 *  identical — the kind of lookalike that drifts the first time someone nudges
 *  one of them. One definition, one look.
 *
 *  Note the two count grammars, both deliberate: a Segmented option's count is
 *  faded and unpunctuated (this), while counts inside prose or a checkbox label
 *  use a middot — "Critical only · 5", "Tags · 3".
 */
export default function CountSuffix({ n }: { n: number }) {
  return <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>;
}
