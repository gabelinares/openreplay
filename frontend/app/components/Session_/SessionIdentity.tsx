import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { countries } from 'App/constants';
import { IFRAME } from 'App/constants/storageKeys';
import { formatTimeOrDate } from 'App/date';
import { browserIcon, deviceTypeIcon, osIcon } from 'App/iconNames';
import { useStore } from 'App/mstore';
import { capitalize } from 'App/utils';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { ReplayIdentity } from 'Components/shared/ReplayChrome';
import { Avatar, CountryFlag, DbIPNotice, Icon, Tooltip } from 'UI';

import MetaItem from 'Shared/SessionItem/MetaItem';
import UserSessionsModal from 'Shared/UserSessionsModal';

/* Session replay's identity line, on the shared atom
   (context/player-makeup-plan-2026-08-20.md).
 *
 * This replaces `UserCard` for the web player only; mobile replay and live still
 * render `UserCard`, and they are out of scope for this pass.
 *
 * Two things move. Browser, OS and device come off the line and go behind
 * "More", because the shared line shows two meta items before the rest has to
 * fold — otherwise the run grows into the action cluster. And the customer's
 * metadata comes off the FAR RIGHT of the bar, where it was a `SessionMetaList`
 * capped at two, and becomes one more row in the same popover: it was the third
 * different home the same kind of data had across the three players.
 */
function SessionIdentity({
  width = 0,
  height = 0,
  live,
}: {
  width?: number;
  height?: number;
  /** the "continuing live" link, when the session is still running. It takes
   *  the second meta slot and pushes the location behind "More": on a live
   *  session that link is the most useful thing on the line. */
  live?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { settingsStore, sessionStore, customFieldStore } = useStore();
  const session = sessionStore.current;
  const { timezone } = settingsStore.sessionSettings;

  React.useEffect(() => {
    if (customFieldStore.list.length === 0) customFieldStore.fetchList();
  }, []);

  const {
    userBrowser,
    userBrowserVersion,
    userCity,
    userCountry,
    userDeviceType,
    userDisplayName,
    userId,
    userNumericHash,
    userOs,
    userOsVersion,
    userState,
    revId,
    screenWidth,
    screenHeight,
    startedAt,
    metadata,
  } = session;

  const safeOs = userOs === 'IOS' ? 'iOS' : userOs;
  const metaKeys = customFieldStore.list.map((i: any) => i.key);
  const metaList = Object.keys(metadata || {})
    .filter((k) => metaKeys.includes(k))
    .map((key) => ({ label: key, value: metadata[key] }));

  const dimension =
    (width || screenWidth) && (height || screenHeight) ? (
      <div className="flex items-center">
        {width || screenWidth}
        <Icon name="close" size="12" className="mx-1" />
        {height || screenHeight}
      </div>
    ) : (
      <span>{t('Resolution N/A')}</span>
    );

  const more = (
    <div className="text-left bg-white">
      <SessionInfoItem
        comp={<CountryFlag country={userCountry} height={11} />}
        label={countries[userCountry] || t('Unknown')}
        value={
          <span
            className="inline-flex items-center"
            style={{ whiteSpace: 'nowrap' }}
          >
            {userCity && <span className="mr-1">{userCity},</span>}
            {userState && <span className="mr-1">{userState}</span>}
            <DbIPNotice className="ml-1" />
          </span>
        }
      />
      {userBrowser && (
        <SessionInfoItem
          icon={browserIcon(userBrowser)}
          label={userBrowser}
          value={userBrowserVersion ? `v${userBrowserVersion}` : ''}
        />
      )}
      {userOs && (
        <SessionInfoItem
          icon={osIcon(userOs)}
          label={safeOs}
          value={userOsVersion}
        />
      )}
      <SessionInfoItem
        icon={deviceTypeIcon(userDeviceType)}
        label={capitalize(userDeviceType)}
        value={dimension}
        isLast={!revId && metaList.length === 0}
      />
      {revId && (
        <SessionInfoItem
          icon="info"
          label="Rev ID:"
          value={revId}
          isLast={metaList.length === 0}
        />
      )}
      {/* the customer's own metadata, as one more row in this list rather than a
          block with its own grammar — the same shape the issue player uses */}
      {metaList.length > 0 && (
        <SessionInfoItem
          icon="tags"
          label={t('Metadata')}
          isLast
          value={
            <div
              className="flex flex-wrap gap-1 color-gray-darkest"
              style={{ width: 280 }}
            >
              {metaList.map((m) => (
                <MetaItem key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          }
        />
      )}
    </div>
  );

  const location =
    [userCity, countries[userCountry]].filter(Boolean).join(', ') || undefined;

  return (
    <ReplayIdentity
      lead={
        <div className="hidden lg:block shrink-0">
          <Avatar
            iconSize={23}
            width="38px"
            height="38px"
            seed={userNumericHash}
          />
        </div>
      }
      primary={
        <UserName
          name={userDisplayName}
          userId={userId}
          hash={userNumericHash}
        />
      }
      primaryTooltip={userDisplayName}
      meta={[
        startedAt ? (
          <Tooltip
            title={`${formatTimeOrDate(startedAt, timezone, true)} ${timezone.label}`}
          >
            {formatTimeOrDate(startedAt, timezone)}
          </Tooltip>
        ) : undefined,
        live ?? location ?? undefined,
      ]}
      more={more}
    />
  );
}

/* Kept from `UserCard`: the display name opens that user's other sessions, but
   not inside an iframe embed, where there is nowhere for a modal to go. */
function UserName({
  name,
  userId,
  hash,
}: {
  name?: string;
  userId?: string;
  hash?: string | number;
}) {
  const hasIframe = localStorage.getItem(IFRAME) === 'true';
  const { showModal } = useModal();
  const clickable = !!userId && !hasIframe;
  return (
    <span
      className={clickable ? 'color-teal cursor-pointer' : undefined}
      onClick={
        clickable
          ? () =>
              showModal(
                /* `userNumericHash` is a number on the session but the modal
                   types it as a string — `UserCard` got away with passing it raw
                   only because that file is untyped JS */
                <UserSessionsModal
                  userId={userId}
                  hash={hash === undefined ? undefined : String(hash)}
                  name={name}
                />,
                { right: true, width: 700 },
              )
          : undefined
      }
    >
      {name}
    </span>
  );
}

export default observer(SessionIdentity);
