import { Button, Dropdown, Input, Table, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { EllipsisVertical, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { JourneyTag } from 'App/mstore/issuesStore';
import TagDialog from 'Components/Issues/TagDialog';
import Tabs from 'Shared/Tabs';

import { useConfirms } from '../KaiSettings/components/shared/confirms';

/* The journey-tag manager.

   Mehdi 07-28: the predefined tags CAN be renamed and removed like any other
   ("we can have a mixed list… on each line you can change it or you can remove
   it"), and the page should wear the Data Management > Events chrome he pointed
   at — tabs over one table, controls on the right of the tab bar ("same as in
   events. Exactly."). So `source` here is provenance, not permission: every row
   edits and deletes, whichever tab it sits in.

   Reference implementation for the chrome: DataManagement/Properties/ListPage.
   The critical-definitions table (§14) will want the same shell; extract a
   shared one when its columns are settled, not before. */

type TabKey = 'openreplay' | 'yours';

function JourneyTags() {
  const { t } = useTranslation();
  const { issuesStore } = useStore();
  const { confirmDelete } = useConfirms();

  const [tab, setTab] = React.useState<TabKey>('openreplay');
  const [q, setQ] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<JourneyTag | null>(null);

  const rows = tab === 'openreplay' ? issuesStore.predefinedTags : issuesStore.customTags;
  const ql = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      !ql ||
      r.name.toLowerCase().includes(ql) ||
      r.description.toLowerCase().includes(ql),
  );

  const nameTaken = (name: string, except?: string) =>
    [...issuesStore.predefinedTags, ...issuesStore.customTags].some(
      (x) => x.name.toLowerCase() === name.toLowerCase() && x.name !== except,
    );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const saveTag = (name: string, description: string) => {
    if (nameTaken(name, editing?.name)) {
      // the dialog stays open so the name can be fixed in place
      message.warning(t('A tag called “{{name}}” already exists.', { name }));
      return;
    }
    if (editing) {
      issuesStore.updateTag(editing.name, name, description);
    } else {
      issuesStore.addCustomTag(name, description);
      // a tag you author is yours, so show the tab it landed in
      setTab('yours');
      message.success(
        t('Tag created. The agent starts applying it to new sessions.'),
      );
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const columns: TableColumnsType<JourneyTag> = [
    {
      title: t('Name'),
      dataIndex: 'name',
      width: 190,
      render: (n: string) => <span className="font-medium">{n}</span>,
    },
    {
      title: t('Description'),
      dataIndex: 'description',
      render: (d: string) => (
        <span style={{ color: 'var(--color-gray-dark)' }}>{d}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, row) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'edit', label: t('Edit') },
              { key: 'delete', label: t('Delete'), danger: true },
            ],
            onClick: ({ key }) => {
              if (key === 'edit') {
                setEditing(row);
                setDialogOpen(true);
                return;
              }
              confirmDelete({
                what: 'tag',
                name: row.name,
                consequence: t(
                  'The agent stops applying it to new sessions; sessions already tagged keep it.',
                ),
                onOk: () => issuesStore.removeTag(row.name),
              });
            },
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<EllipsisVertical size={14} />}
            aria-label={t('Tag actions')}
          />
        </Dropdown>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'openreplay',
      label: (
        <span className="font-medium">
          {t('By OpenReplay')} · {issuesStore.predefinedTags.length}
        </span>
      ),
    },
    {
      key: 'yours',
      label: (
        <span className="font-medium">
          {t('Your tags')} · {issuesStore.customTags.length}
        </span>
      ),
    },
  ];

  const emptyText = ql
    ? t('No tags match “{{q}}”', { q: q.trim() })
    : tab === 'yours'
      ? t(
          'No tags of your own yet. Add one and describe the journey in plain words; the agent applies it automatically.',
        )
      : t('No tags left in OpenReplay’s set. Your own tags still apply.');

  return (
    <div className="flex flex-col rounded-lg border">
      {/* tab bar + controls, the Events page's header row */}
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between border-b px-4">
        <Tabs
          activeKey={tab}
          onChange={(key) => {
            setTab(key as TabKey);
            setQ('');
          }}
          items={tabItems}
        />
        <div className="flex items-center gap-2 pb-2 md:pb-0">
          <div className="w-full md:w-48">
            <Input.Search
              size="small"
              allowClear
              maxLength={256}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('Filter by name or description')}
            />
          </div>
          <Button size="small" icon={<Plus size={15} />} onClick={openCreate}>
            {t('Add tag')}
          </Button>
        </div>
      </div>

      <Table<JourneyTag>
        size="small"
        rowKey="name"
        columns={columns}
        dataSource={shown}
        pagination={false}
        locale={{ emptyText }}
      />

      {/* THE tag dialog, the same one the Issues filter opens */}
      <TagDialog
        open={dialogOpen}
        initial={editing}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={saveTag}
      />
    </div>
  );
}

export default observer(JourneyTags);
