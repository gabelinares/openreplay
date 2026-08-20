import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons';
import { Switch, Tooltip, message } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';

import './AutoplayToggle.css';

const AutoplayToggle: React.FC = () => {
  const { t } = useTranslation();
  const { player, store } = useContext(PlayerContext);
  /* `store.get()` unguarded took the whole replay header down wherever the
     player context has not been built yet — the chrome review route mounts the
     real headers before any playback engine exists, and that is where it showed
     up. The context's own default is `{ player: undefined, store: undefined }`,
     so this was always reachable. */
  const { autoplay } = store?.get?.() ?? {};

  const handleToggle = () => {
    player?.toggleAutoplay?.();
    if (!autoplay) {
      message.success(t('Autoplay is ON'));
    } else {
      message.info(t('Autoplay is OFF'));
    }
  };

  return (
    <Tooltip title={t('Toggle Autoplay')} placement="bottom">
      <Switch
        className="custom-switch"
        onChange={handleToggle}
        checked={!!autoplay}
        checkedChildren={<CaretRightOutlined className="switch-icon" />}
        unCheckedChildren={<PauseOutlined className="switch-icon" />}
      />
    </Tooltip>
  );
};

export default observer(AutoplayToggle);
