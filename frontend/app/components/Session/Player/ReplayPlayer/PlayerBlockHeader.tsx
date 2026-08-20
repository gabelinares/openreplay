import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import {
  liveSession as liveSessionRoute,
  sessions as sessionsRoute,
  withSiteId,
} from 'App/routes';
import { useNavigate } from 'App/routing';
import SessionIdentity from 'Components/Session_/SessionIdentity';
import SessionToolsCluster from 'Components/Session_/SessionToolsCluster';
import {
  ReplayBackButton,
  ReplayHeaderBar,
  ReplayTabStrip,
} from 'Components/shared/ReplayChrome';
import { Link } from 'UI';

import stl from './playerBlockHeader.module.css';

const SESSIONS_ROUTE = sessionsRoute();

/* Session replay's header, on the shared chrome
   (context/player-makeup-plan-2026-08-20.md).
 *
 * This was already the closest of the three to right — one fixed 50px line,
 * separating from the stage by tone rather than a rule — which is why Mehdi
 * pointed at this page as the clean reference. What it gains here is the tools
 * cluster, which used to live on a second bar below (`Subheader`), and that is
 * what lets the second bar disappear on a single-tab session.
 *
 * What it gives up: the custom `BackLink` on its sprite icon, its inlined
 * divider, `UserCard`, and the `SessionMetaList` that sat on the far right. All
 * four are now the shared versions, so Spot and issue replay get the same ones.
 */
function PlayerBlockHeader(props: any) {
  const { t } = useTranslation();
  const [hideBack, setHideBack] = React.useState(false);
  const { player, store } = React.useContext(PlayerContext);
  const { projectsStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const { sessionPath } = sessionStore;
  const siteId = projectsStore.siteId!;
  const {
    width = 0,
    height = 0,
    showEvents = false,
  } = store?.get?.() || { width: 0, height: 0, showEvents: false };
  const navigate = useNavigate();
  const { fullscreen, closedLive = false, setActiveTab, activeTab } = props;

  React.useEffect(() => {
    const iframe = localStorage.getItem(IFRAME) || false;
    setHideBack(!!iframe && iframe === 'true');
  }, []);

  const backHandler = () => {
    if (
      sessionPath.pathname === document.location.pathname ||
      sessionPath.pathname.includes('/session/') ||
      sessionPath.pathname.includes('/assist/')
    ) {
      navigate(withSiteId(SESSIONS_ROUTE, siteId));
    } else {
      navigate(
        sessionPath
          ? sessionPath.pathname + sessionPath.search
          : withSiteId(SESSIONS_ROUTE, siteId),
      );
    }
  };

  const { sessionId, live } = session;

  const TABS = Object.keys(props.tabs ?? {}).map((tab) => ({
    text: props.tabs[tab],
    key: tab,
  }));

  return (
    <ReplayHeaderBar
      hidden={fullscreen}
      back={
        hideBack ? undefined : (
          <ReplayBackButton label={t('Back')} onClick={backHandler} />
        )
      }
      identity={
        <SessionIdentity
          width={width}
          height={height}
          /* a session that is still running says so in the meta run. It used to
             be a floating link on the far right with a divider of its own
             beside it, which was two of session replay's strokes. */
          live={
            live && !hideBack ? (
              <Link
                to={withSiteId(liveSessionRoute(sessionId), siteId)}
                className={stl.liveSwitchButton}
              >
                {t('This Session is Now Continuing Live')}
              </Link>
            ) : undefined
          }
        />
      }
      actions={
        closedLive ? undefined : (
          <SessionToolsCluster setActiveTab={setActiveTab} />
        )
      }
      tabs={
        TABS.length > 0 ? (
          <ReplayTabStrip
            tabs={TABS}
            active={activeTab}
            onClick={(tab) => {
              /* the side panel and the player's own event tracking are the same
                 switch here — kept exactly as it was, since dropping it would
                 leave the panel open over a player that had stopped feeding it */
              if (activeTab === tab) {
                setActiveTab('');
                player.toggleEvents();
              } else {
                setActiveTab(tab);
                if (!showEvents) player.toggleEvents();
              }
            }}
          />
        ) : undefined
      }
    />
  );
}

const PlayerHeaderCont = observer(PlayerBlockHeader);

export default PlayerHeaderCont;
