import withPageTitle from 'HOCs/withPageTitle';
import { Button, Input } from 'antd';
import { Album, Settings as SettingsIcon } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from 'App/routing';

import PreferencesPage from '../PreferencesPage';
import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import TestsTab from './components/TestsTab';
import { KaiTab, kaiStore, useKaiStore } from './components/shared/store';

function KaiSettings() {
  const { t } = useTranslation();
  // controlled by the store so drawers can deep-link across tabs ("View runs")
  const { activeTab, testsQuery, runsQuery } = useKaiStore();
  const history = useHistory();

  // search sits on the main tab line (Gabriel 07-27: keeps each tab's controls
  // bar to a single line) and targets whichever tab is active
  const search =
    activeTab === 'settings' ? null : (
      <Input.Search
        size="small"
        allowClear
        placeholder={
          activeTab === 'tests' ? t('Search tests') : t('Search runs')
        }
        value={activeTab === 'tests' ? testsQuery : runsQuery}
        onChange={(e) =>
          activeTab === 'tests'
            ? kaiStore.setTestsQuery(e.target.value)
            : kaiStore.setRunsQuery(e.target.value)
        }
        style={{ width: 220 }}
      />
    );

  const tabItems = [
    {
      key: 'tests',
      label: t('Tests'),
      children: <TestsTab />,
    },
    {
      key: 'runs',
      label: t('Runs'),
      children: <RunsTab />,
    },
    {
      // renamed from "Settings" (Mehdi 07-27): only core config lives here;
      // behavior toggles + notifications moved to Preferences > Agents
      key: 'settings',
      label: t('Environments'),
      children: <SettingsTab />,
    },
  ];

  return (
    /* through the shared Preferences shell, like every other page in the section */
    <PreferencesPage
      title={t('Tests')}
      info={t(
        'End-to-end tests our agents write and maintain from your real user journeys. Review a draft, approve it, and schedule it — the agent runs it and reports every regression here.',
      )}
      actions={
        <>
          {/* shortcut to the shared agent preferences (Gabriel 07-27) — same
              treatment on the Issues page so the grammar is identical */}
          <Button
            type="text"
            icon={<SettingsIcon size={14} />}
            onClick={() => history.push('/client/agents?agent=tests')}
          >
            {t('Settings')}
          </Button>
          <a
            href="https://docs.openreplay.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Button type="text" icon={<Album size={14} />}>
              {t('Docs')}
            </Button>
          </a>
        </>
      }
      tabs={{
        activeKey: activeTab,
        onChange: (k) => kaiStore.setActiveTab(k as KaiTab),
        items: tabItems,
        tabBarExtraContent: { right: search },
      }}
    />
  );
}

export default withPageTitle('Tests - OpenReplay')(KaiSettings);
