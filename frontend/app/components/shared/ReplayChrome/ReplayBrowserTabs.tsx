import { observer } from 'mobx-react-lite';
import React from 'react';

import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';
import { PlayerContext } from 'Components/Session/playerContext';

/* The browser-tab strip, as a second bar that only exists when there is
   something to put in it.

   The strip itself is unchanged: on a session with several tabs this renders
   exactly what Sessions renders today, overflow modal and closed-tab
   strikethrough included. Nothing is removed (Gabriel 08-20). What changes is
   that a session with ONE tab no longer gets a whole second bar and a rule to
   hold a single chip — which, in the issue player, was where three of its six
   strokes came from.

   Note this is correct whether or not the wiring bug behind the tab set is ever
   fixed. Today the set is never populated past one entry
   (`MessageManager.ts:113` and `:504` assign it twice and never add to it), so
   the strip is simply absent everywhere. The day that lands, multi-tab sessions
   grow it back on their own with no change here. */
function ReplayBrowserTabs({ isLive }: { isLive?: boolean }) {
  const { store } = React.useContext(PlayerContext);

  /* `SessionTabs` defaults this to `new Set('back-compat')`, which is a set of
     nine CHARACTERS rather than one tab — so a bare `size > 1` on the store's
     value would show the strip on every session whose store has not filled in
     yet. Default to empty here and let a real Set be the only thing that
     opens it. */
  const tabs: Set<string> = store?.get?.()?.tabs ?? new Set<string>();
  if (!(tabs instanceof Set) || tabs.size <= 1) return null;

  return (
    /* Height and `items-end` are the whole point of this row, and I had left
       both out. `Tab` positions itself with `self-end` and a -2px bottom margin
       so it sits ON the row's bottom rule with air above it — that air is what
       makes it read as a browser tab rather than a chip. In the old `Subheader`
       the height came for free from the tools cluster sitting beside the tabs;
       moving the tools up into the header bar collapsed this row to the tab's
       own height and the gap vanished with it.
       Mehdi named exactly this on 08-19: "it's a tab but it's not clear it's a
       tab because it's very close to the header." */
    <div
      className="w-full px-4 flex items-end shrink-0 bg-white border-b border-gray-lighter"
      style={{ height: 36 }}
    >
      <SessionTabs isLive={isLive} />
    </div>
  );
}

export default observer(ReplayBrowserTabs);
