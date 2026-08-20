import {
  CommentOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MoreOutlined,
  SettingOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Badge, Button, MenuProps, Modal, message } from 'antd';
import copy from 'copy-to-clipboard';
import { Keyboard } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { spotsList } from 'App/routes';
import { useHistory } from 'App/routing';
import { hashString } from 'App/types/session/session';
import { mobileScreen } from 'App/utils/isMobile';
import { ShortcutGrid } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import {
  ReplayActionCluster,
  ReplayBackButton,
  ReplayHeaderBar,
  ReplayIconButton,
  ReplayIdentity,
  ReplayMoreDetails,
  ReplayTabStrip,
} from 'Components/shared/ReplayChrome';
import { Avatar, Icon } from 'UI';

import { TABS, Tab } from '../consts';
import spotPlayerStore from '../spotPlayerStore';
import AccessModal from './AccessModal';

const spotLink = spotsList();

/* Spot's header, on the shared chrome. See
   context/player-makeup-plan-2026-08-20.md.

   What changed here, and all of it is the shared contract rather than a Spot
   decision:

   - the bar is 50px fixed instead of growing with its content, so the second
     line of meta (browser version, resolution, platform) moves behind "More"
   - "Copy" and "Manage Access" lose their labels. Spot was the only player that
     labelled its buttons and it is most of why its bar read as different
     software. They are now one share popover, since both of them are sharing:
     one copies the internal link, the other governs who can open it
   - the two full-height dividers on the right go. Nothing on that side has one
   - the bar's own bottom rule goes; the location strip below carries the line */
function SpotPlayerHeader({
  activeTab,
  setActiveTab,
  title,
  user,
  date,
  browserVersion,
  resolution,
  platform,
}: {
  activeTab: Tab | null;
  setActiveTab: (tab: Tab | null) => void;
  title: string;
  user: string;
  date: string;
  browserVersion: string | null;
  resolution: string | null;
  platform: string | null;
}) {
  const { t } = useTranslation();
  const { spotStore, userStore } = useStore();
  const isLoggedIn = !!userStore.jwt;
  const hasShareAccess = userStore.isEnterprise
    ? userStore.account.permissions.includes('SPOT_PUBLIC')
    : true;
  const comments = spotStore.currentSpot?.comments ?? [];

  const history = useHistory();
  const [accessOpen, setAccessOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const loc = spotPlayerStore.getClosestLocation(
    spotPlayerStore.time,
  )?.location;
  const currentUrl = loc === 'loading' ? null : loc;

  const onCopy = () => {
    copy(window.location.href);
    message.success(t('Internal sharing link copied to clipboard'));
  };

  const navigateToSpotsList = () => {
    history.push(spotLink);
  };

  /* Copy and Manage Access move in here (Gabriel 08-20). They were the only
     labelled buttons in any replay header, and a fixed 50px single line has no
     room for words. Keyboard Shortcuts joins them because every player's overflow
     carries it now. */
  const items: MenuProps['items'] = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: t('Copy internal link'),
    },
    ...(hasShareAccess
      ? [
          {
            key: 'access',
            icon: <SettingOutlined />,
            label: t('Manage Access'),
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      key: '1',
      icon: <DownloadOutlined />,
      label: t('Download Video'),
    },
    {
      key: '2',
      icon: <DeleteOutlined />,
      label: t('Delete'),
    },
    { type: 'divider' as const },
    {
      key: 'kb',
      icon: <Keyboard size={14} strokeWidth={1.5} />,
      label: t('Keyboard Shortcuts'),
    },
  ];

  const onMenuClick = async ({ key }: { key: string }) => {
    if (key === 'copy') {
      onCopy();
    } else if (key === 'access') {
      setAccessOpen(true);
    } else if (key === 'kb') {
      setShortcutsOpen(true);
    } else if (key === '1') {
      const loader = toast.loading('Retrieving Spot video...');
      const { url } = await spotStore.getVideo(spotStore.currentSpot!.spotId);
      await downloadFile(url, `${spotStore.currentSpot!.title}.webm`);
      setTimeout(() => {
        toast.dismiss(loader);
      }, 0);
    } else if (key === '2') {
      spotStore.deleteSpot([spotStore.currentSpot!.spotId]).then(() => {
        history.push(spotsList());
        message.success(t('Spot successfully deleted'));
      });
    }
  };

  /* Everything that used to sit on the bar's second line, on the shared popover
     body so the rows read identically in all three players. Spot has no browser
     tab strip, so by the single-tab rule it never draws a location strip either
     and the page always belongs in here (Gabriel 08-20). */
  const more = (
    <ReplayMoreDetails
      user={user}
      browser={browserVersion ? 'Chromium' : undefined}
      browserVersion={browserVersion ?? undefined}
      os={platform ?? undefined}
      resolution={resolution ?? ''}
      url={currentUrl}
    />
  );

  const tabs = mobileScreen ? (
    <Button
      size="small"
      onClick={() =>
        setActiveTab(activeTab === TABS.COMMENTS ? null : TABS.COMMENTS)
      }
    >
      {t('Comments')}{' '}
      {comments.length > 0 && (
        <Badge
          count={comments.length}
          className="mr-2"
          style={{ fontSize: '10px' }}
          size="small"
          color="#454545"
        />
      )}
    </Button>
  ) : (
    <ReplayTabStrip
      active={activeTab}
      onClick={(k) => (k === activeTab ? setActiveTab(null) : setActiveTab(k))}
      tabs={[
        {
          key: TABS.ACTIVITY,
          text: t('Activity'),
          iconComp: (
            <div className="mr-1">
              <UserSwitchOutlined />
            </div>
          ),
        },
        {
          key: TABS.COMMENTS,
          iconComp: (
            <div className="mr-1">
              <CommentOutlined />
            </div>
          ),
          text: (
            <div>
              {t('Comments')}{' '}
              {comments.length > 0 && (
                <Badge
                  count={comments.length}
                  className="mr-2"
                  style={{ fontSize: '10px' }}
                  size="small"
                  color="#454545"
                />
              )}
            </div>
          ),
        },
      ]}
    />
  );

  return (
    <>
      {/* the two overflow items that open something. `AccessModal` used to live
          in a Popover hung off a labelled button; it is the same component, just
          reached from the menu now. */}
      <Modal
        open={accessOpen}
        onCancel={() => setAccessOpen(false)}
        footer={null}
        title={t('Manage Access')}
        width={360}
      >
        <AccessModal />
      </Modal>
      <Modal
        open={shortcutsOpen}
        onCancel={() => setShortcutsOpen(false)}
        footer={null}
        title={t('Keyboard Shortcuts')}
        width={320}
      >
        <ShortcutGrid />
      </Modal>

      <ReplayHeaderBar
        back={
          isLoggedIn ? (
            <ReplayBackButton
              label={t('All Spots')}
              onClick={navigateToSpotsList}
            />
          ) : (
            /* the public, not-logged-in view: OpenReplay's own mark instead of a
             back button, since there is no list to go back to */
            <a
              href="https://openreplay.com/platform/spot/"
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              <Button
                type="text"
                className="orSpotBranding flex gap-1 items-center"
              >
                <Icon name="orSpot" size={28} />
                <div className="flex flex-col justify-start text-start leading-tight">
                  <div className="font-semibold">{t('Spot')}</div>
                  <div className="text-disabled-text text-xs">
                    {t('by OpenReplay')}
                  </div>
                </div>
              </Button>
            </a>
          )
        }
        identity={
          <ReplayIdentity
            lead={<Avatar seed={hashString(user)} />}
            primary={title}
            primaryTooltip={title}
            meta={[user, <span className="capitalize">{date}</span>]}
            more={more}
          />
        }
        actions={
          !mobileScreen && isLoggedIn ? (
            <ReplayActionCluster
              overflow={
                <ReplayIconButton
                  title={t('More')}
                  icon={<MoreOutlined />}
                  menu={{ items, onClick: onMenuClick }}
                />
              }
            />
          ) : undefined
        }
        tabs={tabs}
      />
    </>
  );
}

async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    toast.error('Error downloading file.');
    console.error('Error downloading file:', error);
  }
}

export default observer(SpotPlayerHeader);
