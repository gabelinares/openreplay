import React, { useEffect } from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import Select from 'Shared/Select';
import SelectDateRange from 'Shared/SelectDateRange';
import { numberWithCommas } from 'App/utils';
import withPageTitle from 'HOCs/withPageTitle';
import AuditSearchField from '../AuditSearchField';
import AuditList from '../AuditList';
import { useTranslation } from 'react-i18next';

function AuditView() {
  const { t } = useTranslation();
  const { auditStore } = useStore();
  const order = useObserver(() => auditStore.order);
  const total = useObserver(() => numberWithCommas(auditStore.total));

  useEffect(
    () => () => {
      auditStore.updateKey('searchQuery', '');
    },
    [],
  );

  const exportToCsv = () => {
    auditStore.exportToCsv();
  };

  const onChange = (data) => {
    auditStore.setDateRange(data);
  };

  return useObserver(() => (
    /* container + header follow the shared preferences grammar (Gabriel
       07-27, first page of the consistency pass): bordered white card, NO
       shadow, one bordered header row with the 18px semibold title, count as
       a gray suffix, controls right with uniform gaps */
    <div className="flex flex-col bg-white rounded-lg border">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="font-semibold text-lg">{t('Audit Trail')}</span>
        <span style={{ color: 'var(--color-gray-medium)' }}>{total}</span>
        <div className="flex items-center gap-2 ml-auto">
          <SelectDateRange
            period={auditStore.period}
            onChange={onChange}
            right
          />
          <Select
            options={[
              { label: t('Newest First'), value: 'desc' },
              { label: t('Oldest First'), value: 'asc' },
            ]}
            defaultValue={order}
            plain
            onChange={({ value }) =>
              auditStore.updateKey('order', value.value)
            }
          />
          <AuditSearchField
            onChange={(value) => {
              auditStore.updateKey('searchQuery', value);
              auditStore.updateKey('page', 1);
            }}
          />
          <Button
            type="text"
            icon={<Icon name="grid-3x3" color="teal" />}
            onClick={exportToCsv}
          >
            {t('Export to CSV')}
          </Button>
        </div>
      </div>

      <AuditList />
    </div>
  ));
}

export default withPageTitle('Audit Trail - OpenReplay Preferences')(AuditView);
