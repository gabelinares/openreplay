import {
  CaretRightOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  MoreOutlined,
  PauseOutlined,
  RightOutlined,
  ShareAltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Button, Switch, Tooltip, message } from 'antd';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  File,
  Keyboard,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Issue } from 'App/mstore/issuesStore';
import HighlightButton from 'Components/Session_/Highlight/HighlightButton';
import 'Components/shared/AutoplayToggle/AutoplayToggle.css';
import {
  ReplayActionCluster,
  ReplayBackButton,
  ReplayHeaderBar,
  ReplayIconButton,
  ReplayIdentity,
  ReplayQueueControls,
  ReplayStateToggle,
  ReplayTabStrip,
} from 'Components/shared/ReplayChrome';
import SessionCopyLink from 'Components/shared/SharePopup/SessionCopyLink';

import CriticalDialog from './CriticalDialog';

/* The z-index the popovers in here sit at. The replay overlay itself is just
   under the maximum, so anything opening from its header has to clear it. */
const POPUP_Z = 2147483647;

type SideTab = 'activity' | 'issue' | null;

/* Critical control for the header — the exact issue-list control (triangle:
   red outline = a description matched, tinted fill = one of MINE did). It
   reports state and opens the shared CriticalDialog, exactly like the list row
   and the detail chip, because criticality is derived from descriptions now
   (Mehdi 07-28) and no surface sets it directly. Kept in sync via issuesStore. */
const HeaderCriticalToggle = observer(({ issue }: { issue: Issue }) => {
  const { issuesStore } = useStore();
  const [dialog, setDialog] = React.useState(false);
  const critState = issuesStore.critState(issue.id);
  const matched = issuesStore.matchedRules(issue.id);
  const critTip =
    issuesStore.notCritical[issue.id] != null
      ? 'Not critical for you'
      : critState === 'mine'
        ? 'Matches your description'
        : critState === 'team'
          ? `Matches ${matched[0]?.createdBy}’s description`
          : 'Describe what’s critical';
  return (
    /* the dialog is a SIBLING of the tooltip, never its second child: antd's
       trigger runs React.Children.only over whatever Tooltip wraps, so a second
       child throws on render and takes the whole replay header down with it.
       The list row and the detail chip already keep their dialog outside. */
    <>
      <ReplayStateToggle
        on={critState !== 'none'}
        strong={critState === 'mine'}
        color="var(--color-red)"
        title={critTip}
        icon={
          <AlertTriangle size={15} strokeWidth={2} style={{ fill: 'none' }} />
        }
        onClick={() => setDialog(true)}
      />
      <CriticalDialog
        issueId={dialog ? issue.id : null}
        issueHead={issue.head}
        onClose={() => setDialog(false)}
      />
    </>
  );
});

interface Props {
  hidden?: boolean;
  issue?: Issue;
  variation?: string;
  date: string;
  /** the popover body holding everything that does not fit the line */
  more: React.ReactNode;
  onBack: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  prevId: string | null;
  nextId: string | null;
  onGoSession: (id: string) => void;
  autoplay: boolean;
  onToggleAutoplay: (v: boolean) => void;
  tab: SideTab;
  setTab: (t: SideTab) => void;
  /** playhead position, so a shared link lands on this moment */
  time: number;
  onShowShortcuts?: () => void;
}

function IssueReplayHeader({
  hidden = false,
  issue,
  variation,
  date,
  more,
  onBack,
  bookmarked,
  onToggleBookmark,
  prevId,
  nextId,
  onGoSession,
  autoplay,
  onToggleAutoplay,
  tab,
  setTab,
  time,
  onShowShortcuts,
}: Props) {
  /* The bar owns its 50px height, its fill, the single full-bleed divider after
     Back, the gaps, and the fact that it draws NO bottom rule: it is white on
     the page tone, so it separates from the stage by tone the way the session
     page does, and the one line under the chrome is the location strip's. That
     is the whole of "there are too many lines" (Mehdi 08-19) — one stroke here,
     down from six in production.

     Everything below is data. Nothing here sets a spacing or a stroke, so this
     header cannot drift away from Spot's or session's. */
  return (
    <ReplayHeaderBar
      hidden={hidden}
      back={
        <ReplayBackButton
          label="Back to issue"
          tooltip={issue ? `Back to “${issue.head}”` : 'Back to issues'}
          onClick={onBack}
        />
      }
      identity={
        <ReplayIdentity
          lead={issue ? <HeaderCriticalToggle issue={issue} /> : undefined}
          primary={variation ?? 'Session replay'}
          primaryTooltip={variation}
          meta={[date]}
          more={more}
          popupZIndex={POPUP_Z}
        />
      }
      actions={
        <ReplayActionCluster
          share={
            <ReplayIconButton
              title="Share session"
              icon={<ShareAltOutlined />}
              popupZIndex={POPUP_Z}
              popover={
                <div style={{ width: 248 }}>
                  <SessionCopyLink time={time} />
                </div>
              }
            />
          }
          highlight={
            <HighlightButton
              onClick={() => message.info('Highlight this moment')}
            />
          }
          overflow={
            <ReplayIconButton
              title="More"
              icon={<MoreOutlined />}
              menu={{
                items: [
                  {
                    key: 'bookmark',
                    label: (
                      <div className="flex items-center gap-2">
                        {bookmarked ? (
                          <BookmarkCheck size={16} strokeWidth={1.5} />
                        ) : (
                          <Bookmark size={16} strokeWidth={1.5} />
                        )}
                        <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </div>
                    ),
                    onClick: onToggleBookmark,
                  },
                  {
                    key: 'dl',
                    label: (
                      <div className="flex items-center gap-2">
                        <File size={16} strokeWidth={1.5} />
                        <span>Download video</span>
                      </div>
                    ),
                  },
                  { type: 'divider' as const },
                  {
                    /* every player's overflow carries this now (Gabriel 08-20) */
                    key: 'kb',
                    label: (
                      <div className="flex items-center gap-2">
                        <Keyboard size={16} strokeWidth={1.5} />
                        <span>Keyboard shortcuts</span>
                      </div>
                    ),
                    onClick: onShowShortcuts,
                  },
                ],
              }}
            />
          }
          queue={
            <ReplayQueueControls
              onPrev={() => prevId && onGoSession(prevId)}
              onNext={() => nextId && onGoSession(nextId)}
              hasPrev={!!prevId}
              hasNext={!!nextId}
              prevLabel="Previous session"
              nextLabel="Next session"
              autoplay={
                <Tooltip title="Toggle autoplay" placement="bottom">
                  <Switch
                    className="custom-switch"
                    checked={autoplay}
                    onChange={onToggleAutoplay}
                    checkedChildren={
                      <CaretRightOutlined className="switch-icon" />
                    }
                    unCheckedChildren={
                      <PauseOutlined className="switch-icon" />
                    }
                  />
                </Tooltip>
              }
            />
          }
        />
      }
      tabs={
        <ReplayTabStrip
          active={tab}
          onClick={(k: any) => (k === tab ? setTab(null) : setTab(k))}
          tabs={[
            {
              key: 'activity',
              text: 'Activity',
              iconComp: (
                <div className="mr-1">
                  <UserSwitchOutlined />
                </div>
              ),
            },
            {
              key: 'issue',
              text: 'Issue',
              iconComp: (
                <div className="mr-1">
                  <InfoCircleOutlined />
                </div>
              ),
            },
          ]}
        />
      }
    />
  );
}

export default observer(IssueReplayHeader);
