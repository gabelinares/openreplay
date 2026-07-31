import { Divider, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
    /* full width, like the Tests and Runs tabs beside it (Gabriel 07-30): the
       672px cap left a white gap down the right of this one tab. Nothing here is
       pinned to the right edge — the environment rows live in a bordered list
       and the run defaults are a label-above-control grid — so filling the card
       maroons nothing. */
    <div className="flex flex-col p-5">
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
