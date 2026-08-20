import { Button, Tooltip } from 'antd';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

interface Props {
  /** what the button says. Products differ here on purpose: "Back", "All
   *  Spots", "Back to issue" — the shape is shared, the destination is not. */
  label: string;
  /** the long form, when the label has to truncate a real name. Defaults to the
   *  label so the two can never disagree the way they did in the issue header,
   *  where the tooltip said "Back to <issue name>" over a label reading "Back to
   *  issue" and one hover named the same control twice. */
  tooltip?: string;
  onClick: () => void;
}

/* The one back button for every replay header. Three existed: session's custom
   `BackLink.js` on a sprite icon, Spot's antd icon, and the issue player's
   lucide arrow — three icon libraries for one arrow.

   This is the issue player's shape, which won because it is already an antd
   button (so it inherits the theme) at `size="small"` (so it fits a 50px bar
   without setting the bar's height itself).

   `BackLink.js` is deliberately NOT deleted: mobile replay and live still use
   it and they are out of scope for this pass. */
export default function ReplayBackButton({ label, tooltip, onClick }: Props) {
  return (
    <Tooltip title={tooltip ?? label} placement="bottom">
      <Button
        type="text"
        size="small"
        icon={<ArrowLeft size={15} />}
        onClick={onClick}
        className="px-2 shrink-0"
      >
        {label}
      </Button>
    </Tooltip>
  );
}
