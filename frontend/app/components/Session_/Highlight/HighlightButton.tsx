import React from 'react';
import { useTranslation } from 'react-i18next';

import { ReplayIconButton } from 'Components/shared/ReplayChrome';
import { Icon } from 'UI';

/* Routed through `ReplayIconButton` so it is the same width as share and the
   overflow menu. It used to pass its icon as a CHILD of an antd Button, which
   skips `ant-btn-icon-only`, so it rendered wider than the icon-prop buttons
   beside it in every player. */
function HighlightButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <ReplayIconButton
      title={t('Highlight a moment')}
      onClick={onClick}
      icon={<Icon name="chat-square-quote" color="inherit" size={15} />}
    />
  );
}

export default HighlightButton;
