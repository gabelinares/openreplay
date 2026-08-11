import withPageTitle from 'HOCs/withPageTitle';
import { Switch } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import PreferencesPage, { PreferencesSection } from '../PreferencesPage';

function Notifications() {
  const { weeklyReportStore } = useStore();
  const { t } = useTranslation();

  useEffect(() => {
    void weeklyReportStore.fetchReport();
  }, []);

  const onChange = () => {
    const newValue = !weeklyReportStore.weeklyReport;
    void weeklyReportStore.fetchEditReport(newValue);
  };

  return (
    <PreferencesPage title={t('Weekly Report')}>
      <PreferencesSection
        title={t('Weekly project summary')}
        hint={t('Receive weekly report for each project on email.')}
      >
        {/* switch first, its word after — the grammar Preferences > Agents took
            from this very page */}
        <span className="flex items-center gap-2.5">
          <Switch
            size="small"
            checked={weeklyReportStore.weeklyReport}
            onChange={onChange}
          />
          {weeklyReportStore.weeklyReport ? t('Yes') : t('No')}
        </span>
      </PreferencesSection>
    </PreferencesPage>
  );
}

export default withPageTitle('Weekly Report - OpenReplay Preferences')(
  observer(Notifications),
);
