import { MoreOutlined, ShareAltOutlined } from '@ant-design/icons';
import cn from 'classnames';
import {
  BookmarkCheck,
  Bookmark as BookmarkIcn,
  File,
  Keyboard,
  Vault,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { PlayerContext } from 'App/components/Session/playerContext';
import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { checkParam } from 'App/utils';
import { mobileScreen } from 'App/utils/isMobile';
import { useModal } from 'Components/ModalContext';
import IssueForm from 'Components/Session_/Issues/IssueForm';
import { ShortcutGrid } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import {
  ReplayActionCluster,
  ReplayIconButton,
} from 'Components/shared/ReplayChrome';
import { Icon } from 'UI';

import ShareModal from '../shared/SharePopup/SharePopup';
import HighlightButton from './Highlight/HighlightButton';
import QueueControls from './QueueControls';

/* Session replay's right-hand tools, lifted out of `Subheader` and onto the
   shared cluster (context/player-makeup-plan-2026-08-20.md).
 *
 * They used to sit on a SECOND bar below the identity bar, which is what made
 * session replay's chrome two rows tall while Spot's and the issue player's were
 * one. Moving them up is what lets that second bar become conditional: all it
 * held besides these was the browser-tab strip, and that strip has something to
 * show only on a multi-tab session.
 *
 * The logic here is moved verbatim, not rewritten. The one behavioural change is
 * that the "Search Events Only" switch becomes a compact icon TOGGLE beside the
 * other actions. It was a labelled antd Switch sitting in the bar, which a fixed
 * 50px single line has no room for; it spent one round as a menu item, which was
 * worse — a mode reading as a checked list row. It keeps its orange.
 */
function SessionToolsCluster({
  setActiveTab,
}: {
  setActiveTab: (tab: string) => void;
}) {
  const {
    integrationsStore,
    sessionStore,
    userStore,
    issueReportingStore,
    recordingsStore,
    uiPlayerStore,
  } = useStore();
  const { t } = useTranslation();
  const { isEnterprise, account } = userStore;
  const currentSession = sessionStore.current;
  const { favorite } = currentSession;
  const integrations = integrationsStore.issues.list;
  const { store } = React.useContext(PlayerContext);
  const hasIframe = localStorage.getItem(IFRAME) === 'true';
  const [hideTools, setHideTools] = React.useState(mobileScreen);
  const [isFavorite, setIsFavorite] = React.useState(favorite);
  const { openModal, closeModal } = useModal();

  React.useEffect(() => {
    if (favorite) setIsFavorite(favorite);
  }, [favorite]);

  React.useEffect(() => {
    if (checkParam('hideTools')) setHideTools(true);
  }, []);

  const enabledIntegration = useMemo(() => {
    if (!integrations || !integrations.length) return false;
    return integrations.some((i) => i.token);
  }, [integrations]);

  const issuesIntegrationList = integrationsStore.issues.list;
  const reportingProvider = issuesIntegrationList[0]?.provider || '';

  const handleOpenIssueModal = () => {
    issueReportingStore.init({});
    if (!issueReportingStore.projectsFetched) {
      issueReportingStore.fetchProjects().then((projects) => {
        if (projects && projects[0]) {
          void issueReportingStore.fetchMeta(projects[0].id);
        }
      });
    }
    openModal(
      <IssueForm
        sessionId={currentSession.sessionId}
        closeHandler={closeModal}
        errors={[]}
      />,
      { title: t('Create Issue') },
    );
  };

  const showKbHelp = () => {
    openModal(<ShortcutGrid />, { width: 320, title: t('Keyboard Shortcuts') });
  };

  const vaultIcon = isEnterprise ? (
    <Vault size={16} strokeWidth={1} />
  ) : isFavorite ? (
    <BookmarkCheck size={16} strokeWidth={1} />
  ) : (
    <BookmarkIcn size={16} strokeWidth={1} />
  );

  const toggleFavorite = () => {
    const onToggleFavorite = sessionStore.toggleFavorite;
    const ADDED_MESSAGE = isEnterprise
      ? t('Session added to vault')
      : t('Session added to your bookmarks');
    const REMOVED_MESSAGE = isEnterprise
      ? t('Session removed from vault')
      : t('Session removed from your bookmarks');

    onToggleFavorite(currentSession.sessionId).then(() => {
      toast.success(isFavorite ? REMOVED_MESSAGE : ADDED_MESSAGE);
      setIsFavorite(!isFavorite);
    });
  };

  const onExport = async () => {
    const status = await recordingsStore.triggerExport(
      currentSession.sessionId,
    );
    const statusLabels = {
      pending: 'Session export started',
      success: 'Session already exported, go to Preferences > Exported Videos',
      failure: 'Session export failed, please try again later',
    };
    // @ts-ignore
    toast.info(statusLabels[status ?? 'pending']);
  };

  if (hideTools) return null;

  const dropdownItems: any[] = [
    {
      key: '2',
      label: (
        <div className="flex items-center gap-2">
          {vaultIcon}
          <span>{isEnterprise ? t('Vault') : t('Bookmark')}</span>
        </div>
      ),
      onClick: toggleFavorite,
    },
    {
      key: '4',
      label: (
        <div className="flex items-center gap-2">
          <Icon name={`integrations/${reportingProvider || 'github'}`} />
          <span>{t('Issues')}</span>
        </div>
      ),
      disabled: !enabledIntegration,
      onClick: handleOpenIssueModal,
    },
  ];

  if (account.hasVideoExport) {
    dropdownItems.push({
      key: '5',
      label: (
        <div className="flex items-center gap-2">
          <File size={16} strokeWidth={1} />
          <span>{t('Export Video')}</span>
        </div>
      ),
      onClick: onExport,
      disabled: !account.hasExportPermission,
    });
  }

  /* grouped the way Spot's and issue replay's menus are: what this session IS,
     then a rule, then Keyboard Shortcuts last */
  dropdownItems.push({ type: 'divider' as const });
  dropdownItems.push({
    key: '1',
    label: (
      <div className="flex items-center gap-2">
        <Keyboard size={16} strokeWidth={1} />
        <span>{t('Keyboard Shortcuts')}</span>
      </div>
    ),
    onClick: showKbHelp,
  });

  return (
    <div className={cn(hasIframe ? 'opacity-50 pointer-events-none' : '')}>
      <ReplayActionCluster
        toggles={
          /* Its own group: this is the only control here that holds a state
             rather than doing something once, and sitting among the actions made
             it look like a button stuck in a pressed state.
             The tooltip carries the state, because the orange alone says "on"
             without saying on for what — off invites, on reports. */
          uiPlayerStore.showSearchEventsSwitchButton ? (
            <ReplayIconButton
              title={
                uiPlayerStore.showOnlySearchEvents
                  ? t('Showing only search events')
                  : t('Show only search events')
              }
              active={uiPlayerStore.showOnlySearchEvents}
              icon={
                /* the app's OWN funnel, not a fresh lucide glyph: the sprite
                   already carries one and `frontend/CLAUDE.md` says reuse before
                   importing.

                   Outline in BOTH states. It was filled when on, which gave the
                   state a shape cue as well as a colour one — but nothing else in
                   the app uses fill to mean state. The filled glyphs that do
                   exist (`play-fill`, `caret-down-fill`, `check-circle-fill`) are
                   shapes that are solid by nature, not the on-half of a pair. A
                   pattern invented in one button is a pattern nobody reads, so
                   the orange and the tooltip carry the state alone
                   (Gabriel 08-20). */
                <Icon name="funnel" color="inherit" size={15} />
              }
              onClick={() =>
                uiPlayerStore.setShowOnlySearchEvents(
                  !uiPlayerStore.showOnlySearchEvents,
                )
              }
            />
          ) : undefined
        }
        share={
          <ReplayIconButton
            title={t('Share Session')}
            icon={<ShareAltOutlined />}
            onClick={() =>
              openModal(
                <ShareModal
                  showCopyLink
                  hideModal={closeModal}
                  time={store?.get().time}
                />,
                { title: t('Share Session') },
              )
            }
          />
        }
        highlight={
          <HighlightButton onClick={() => setActiveTab('HIGHLIGHT')} />
        }
        overflow={
          <ReplayIconButton
            title={t('More')}
            icon={<MoreOutlined />}
            menu={{ items: dropdownItems }}
          />
        }
        queue={<QueueControls />}
      />
    </div>
  );
}

export default observer(SessionToolsCluster);
