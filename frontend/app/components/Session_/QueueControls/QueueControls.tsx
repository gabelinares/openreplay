import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'App/routing';

import AutoplayToggle from 'Shared/AutoplayToggle/AutoplayToggle';

const PER_PAGE = 10;

interface Props extends RouteComponentProps {
  defaultList: any;
  latestRequestTime: any;
  sessionIds: any;
}

function QueueControls(props: Props) {
  const { t } = useTranslation();
  const { projectsStore, sessionStore, searchStore } = useStore();
  const { previousId } = sessionStore;
  const { nextId } = sessionStore;
  const { total } = sessionStore;
  const sessionIds = sessionStore.sessionIds ?? [];
  const { setAutoplayValues } = sessionStore;
  const {
    match: {
      // @ts-ignore
      params: { sessionId },
    },
  } = props;

  const { currentPage } = searchStore;

  useEffect(() => {
    setAutoplayValues();
    const totalPages = Math.ceil(total / PER_PAGE);
    const index = sessionIds.indexOf(sessionId);

    // sync the page number and refetch list when user navigates into next-page sessions
    const sessionPage = Math.floor(index / PER_PAGE) + 1;
    if (sessionPage > 1 && currentPage < sessionPage) {
      searchStore.updateCurrentPage(currentPage + sessionPage - 1);
    }

    if (currentPage !== totalPages && index === sessionIds.length - 1) {
      sessionStore.fetchAutoplayList(currentPage + 1).then(setAutoplayValues);
    }
  }, []);

  const nextHandler = () => {
    const siteId = projectsStore.getSiteId().siteId!;
    props.history.push(withSiteId(sessionRoute(nextId), siteId));
  };

  const prevHandler = () => {
    const siteId = projectsStore.getSiteId().siteId!;
    props.history.push(withSiteId(sessionRoute(previousId), siteId));
  };

  return (
    /* No wrapper divs around the buttons any more: the shared action cluster
       already spaces its queue group at gap-1, and the old `p-1` / `ml-1`
       padding made session replay's arrows sit differently from the issue
       player's. The click handlers move onto the buttons, where they belong —
       a disabled antd Button swallows the click, so the pointer-events dance on
       the wrapper was never doing anything the `disabled` prop wasn't. */
    <>
      <Popover
        placement="bottom"
        content={
          <div className="whitespace-nowrap">{t('Play Previous Session')}</div>
        }
        open={previousId ? undefined : false}
      >
        <Button
          size="small"
          shape="circle"
          disabled={!previousId}
          onClick={prevHandler}
          className="flex items-center justify-center"
        >
          <LeftOutlined />
        </Button>
      </Popover>
      <AutoplayToggle />
      <Popover
        placement="bottom"
        content={
          <div className="whitespace-nowrap">{t('Play Next Session')}</div>
        }
        open={nextId ? undefined : false}
      >
        <Button
          size="small"
          shape="circle"
          disabled={!nextId}
          onClick={nextHandler}
          className="flex items-center justify-center"
        >
          <RightOutlined />
        </Button>
      </Popover>
    </>
  );
}

export default withRouter(observer(QueueControls));
