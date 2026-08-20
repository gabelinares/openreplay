import { MoreOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Button as AntButton, Dropdown, Tooltip } from 'antd';
import cn from 'classnames';
import {
  BookmarkCheck,
  Bookmark as BookmarkIcn,
  Check,
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
import { ReplayActionCluster } from 'Components/shared/ReplayChrome';
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
 * that the "Search Events Only" switch becomes a menu item: it was a labelled
 * antd Switch sitting in the bar, and a labelled control cannot live in a fixed
 * 50px single line.
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
    {
      key: '1',
      label: (
        <div className="flex items-center gap-2">
          <Keyboard size={16} strokeWidth={1} />
          <span>{t('Keyboard Shortcuts')}</span>
        </div>
      ),
      onClick: showKbHelp,
    },
  ];

  /* Was a labelled Switch in the bar. It is conditional on the search that
     opened this session having had event filters, so it also came and went,
     changing the bar's width as it did. */
  if (uiPlayerStore.showSearchEventsSwitchButton) {
    dropdownItems.push({
      key: '6',
      label: (
        <div className="flex items-center gap-2">
          <Check
            size={16}
            strokeWidth={1}
            style={{
              opacity: uiPlayerStore.showOnlySearchEvents ? 1 : 0,
            }}
          />
          <span>{t('Search Events Only')}</span>
        </div>
      ),
      onClick: () =>
        uiPlayerStore.setShowOnlySearchEvents(
          !uiPlayerStore.showOnlySearchEvents,
        ),
    });
  }

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

  return (
    <div className={cn(hasIframe ? 'opacity-50 pointer-events-none' : '')}>
      <ReplayActionCluster
        share={
          <Tooltip title={t('Share Session')} placement="bottom">
            <AntButton
              size="small"
              className="flex items-center justify-center"
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
            >
              <ShareAltOutlined />
            </AntButton>
          </Tooltip>
        }
        highlight={
          <HighlightButton onClick={() => setActiveTab('HIGHLIGHT')} />
        }
        overflow={
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <AntButton size="small">
              <MoreOutlined />
            </AntButton>
          </Dropdown>
        }
        queue={<QueueControls />}
      />
    </div>
  );
}

export default observer(SessionToolsCluster);
