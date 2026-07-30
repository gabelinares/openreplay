import { Divider, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PANEL_SIZES } from 'App/constants/panelSizes';

import Defaults from './Defaults';
import Environments from './Environments';
import { kaiStore, useKaiStore } from './shared/store';

/* The "Environments" tab (renamed from Settings, Mehdi 07-27): only what is
   CORE to running tests lives here — environments and the default run
   configuration. Behavior toggles (pause on revisions) and notifications
   moved to Preferences > Agents, so agent pages don't grow Settings tabs
   that compete with Preferences. */
function SettingsTab() {
  const { t } = useTranslation();

  // environments + defaults live in the shared store — deleting an environment has
  // to reach the tests, and the defaults pre-fill new drafts / manual tests
  const { environments, defaults } = useKaiStore();
  const setEnvironments = kaiStore.setEnvironments;

  return (
    /* the same settings width as Preferences > Agents (Gabriel 07-30), so the
       two agent settings surfaces agree instead of one sitting at 672 and the
       other at 1024. The card itself stays at the app width because the Tests
       and Runs tabs next door are wide data tables. */
    <div
      className="flex flex-col p-5"
      style={{ maxWidth: PANEL_SIZES.settingsMaxWidth }}
    >
      <Environments
        environments={environments}
        setEnvironments={setEnvironments}
      />

      <Divider />

      {/* Defaults — pre-fill new tests' run settings */}
      <section className="flex flex-col gap-3">
        <div>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {t('Default run configuration')}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm!">
            {t('New tests start with these. You can override them per test.')}
          </Typography.Text>
        </div>
        <Defaults
          environments={environments}
          value={defaults}
          onChange={(patch) => kaiStore.setDefaults(patch)}
        />
      </section>
    </div>
  );
}

export default SettingsTab;
