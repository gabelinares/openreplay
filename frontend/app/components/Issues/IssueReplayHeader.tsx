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
import { Button, Dropdown, Popover, Switch, Tooltip, message } from 'antd';
import { AlertTriangle, Bookmark, BookmarkCheck, File } from 'lucide-react';
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
  ReplayIdentity,
  ReplayQueueControls,
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
      <Tooltip title={critTip}>
        <Button
          type="text"
          size="small"
          aria-label={critTip}
          aria-pressed={critState !== 'none'}
          className={`critical-toggle flex items-center justify-center shrink-0${
            critState !== 'none' ? ' critical-on' : ''
          }${critState === 'mine' ? ' critical-mine' : ''}`}
          icon={
            // same chip-color language as the list (`critical-mine` in
            // issues.css): gray chip = agent's critical, red chip = mine —
            // the icon itself stays the project-critical red outline
            <AlertTriangle
              size={15}
              strokeWidth={2}
              style={{
                // none-state color is left to issues.css so the hover preview
                // (gray → red) can take effect; inline style would win over it
                color: critState !== 'none' ? 'var(--color-red)' : undefined,
                fill: 'none',
              }}
            />
          }
          onClick={() => setDialog(true)}
        />
      </Tooltip>
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
            <Popover
              trigger="click"
              placement="bottomRight"
              zIndex={POPUP_Z}
              content={
                <div style={{ width: 248 }}>
                  <SessionCopyLink time={time} />
                </div>
              }
            >
              <Tooltip title="Share session" placement="bottom">
                <Button size="small" icon={<ShareAltOutlined />} />
              </Tooltip>
            </Popover>
          }
          highlight={
            <HighlightButton
              onClick={() => message.info('Highlight this moment')}
            />
          }
          overflow={
            <Dropdown
              placement="bottomRight"
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
                ],
              }}
            >
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
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
