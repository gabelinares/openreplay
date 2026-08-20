import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'App/routing';
import { ReplayQueueControls } from 'Components/shared/ReplayChrome';

import AutoplayToggle from 'Shared/AutoplayToggle/AutoplayToggle';

const PER_PAGE = 10;

/* `defaultList`, `latestRequestTime` and `sessionIds` used to be declared here
   and were never read — `sessionIds` comes off the store below and shadowed the
   prop. Declaring them made every callsite a type error, which is why rendering
   `<QueueControls />` has been erroring since before this branch. */
type Props = RouteComponentProps;

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
    <ReplayQueueControls
      onPrev={prevHandler}
      onNext={nextHandler}
      hasPrev={!!previousId}
      hasNext={!!nextId}
      prevLabel={t('Play Previous Session')}
      nextLabel={t('Play Next Session')}
      autoplay={<AutoplayToggle />}
    />
  );
}

export default withRouter(observer(QueueControls));
