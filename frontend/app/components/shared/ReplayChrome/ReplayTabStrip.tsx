import React from 'react';

import Tabs from 'Components/Session/Tabs';

interface Props {
  tabs: Array<any>;
  /** '' or null means no side panel is open */
  active: string | null;
  onClick: (key: any) => void;
}

/* The side-panel tab strip. `Tabs` was already shared by all three players; what
   diverged was how each one turned its underline off. Session passed the real
   prop (`border={false}`) while Spot and the issue player both reached for a
   class override (`w-fit! border-b-0!`) — two ways to say one thing, and only
   one of them survives a change to the component.

   This standardises on the prop, and keeps `w-fit!` for the width, which the
   class genuinely is needed for: `tabs.module.css` sets `width: 100%` with
   `justify-content: space-around`, so inside a header bar the strip would
   otherwise stretch and space its own items out. */
export default function ReplayTabStrip({ tabs, active, onClick }: Props) {
  return (
    <Tabs
      className="w-fit!"
      border={false}
      tabs={tabs}
      active={active ?? ''}
      onClick={onClick}
    />
  );
}
