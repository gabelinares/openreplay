import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import WarnBadge from 'Components/Session_/WarnBadge';
import {
  ReplayBrowserTabs,
  ReplayLocationBar,
  hasMultipleTabs,
} from 'Components/shared/ReplayChrome';

/* What is left of the session player's second bar.
 *
 * It used to be a full bar: the browser-tab strip on the left and the whole
 * tools cluster on the right, with a rule under it, and then the location strip
 * with a rule of its own. Three of session replay's strokes came from here.
 *
 * The tools moved up into the identity bar (`SessionToolsCluster`), which left
 * this holding the tab strip and nothing else — and the tab strip has something
 * to show only when a session genuinely has more than one tab, which is what
 * `ReplayBrowserTabs` now decides for itself. So on a normal session this
 * renders one hairline, the location strip's, and that is the only stroke in the
 * whole header region.
 *
 * See context/player-makeup-plan-2026-08-20.md.
 */
function SubHeader() {
  const { sessionStore, projectsStore, settingsStore } = useStore();
  const currentSession = sessionStore.current;
  const projectId = projectsStore.siteId;
  const { player, store } = React.useContext(PlayerContext);
  const { location: currentLocation = '' } = store.get();

  const showVModeBadge = store.get().vModeBadge;
  const onVMode = () => {
    settingsStore.sessionSettings.updateKey('virtualMode', true);
    player.enableVMode?.();
    location.reload();
  };

  return (
    <>
      <WarnBadge
        siteId={projectId!}
        currentLocation={currentLocation}
        version={currentSession?.trackerVersion ?? ''}
        containerStyle={{
          position: 'relative',
          left: 0,
          top: 0,
          transform: 'none',
          zIndex: 10,
        }}
        trackerWarnStyle={{
          backgroundColor: 'var(--color-yellow)',
          color: 'var(--color-gray-darkest)',
        }}
        virtualElsFailed={showVModeBadge}
        onVMode={onVMode}
      />
      <ReplayBrowserTabs />
      {/* the URL strip appears only where the tab strip does, i.e. only on a
          session with more than one tab. On the ordinary single-tab session the
          page is a row in the header's "More" popover instead, and the header is
          then the bar and nothing else (Gabriel 08-20). */}
      <ReplayLocationBar
        url={currentLocation}
        visible={hasMultipleTabs(store.get().tabs)}
      />
    </>
  );
}

export default observer(SubHeader);
