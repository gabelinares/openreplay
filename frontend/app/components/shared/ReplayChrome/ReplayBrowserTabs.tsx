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
    <div className="w-full px-4 flex items-center shrink-0 bg-white">
      <SessionTabs isLive={isLive} />
    </div>
  );
}

export default observer(ReplayBrowserTabs);
