import { Button, Input, Segmented, Table, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { PencilIcon, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type { JourneyTag } from 'App/mstore/issuesStore';
import TagDialog from 'Components/Issues/TagDialog';
import CountSuffix from 'Shared/CountSuffix';

import { useConfirms } from '../KaiSettings/components/shared/confirms';

/* The journey-tag manager.

   Mehdi 07-28: the predefined tags CAN be renamed and removed like any other
   ("we can have a mixed list… on each line you can change it or you can remove
   it"), and it takes the Data Management > Events shape he pointed at — a
   switcher over one table with the controls beside it ("same as in events.
   Exactly."). So `source` here is provenance, not permission: every row edits
   and deletes, whichever side it sits on.

   The switcher is a Segmented, NOT tabs (Gabriel 07-30): the page itself is now
   one tab per agent, so a second tab bar nested inside a tab would read as
   duplicated chrome. Segmented over a table with the controls on the right is
   the Issues list's own bar (IssuesList.tsx: category Segmented left, filters
   right), so this stays inside the platform's grammar either way.

   The critical-definitions table (§14) will want the same shell; extract a
   shared one when its columns are settled, not before. */

type SourceKey = 'openreplay' | 'yours';

function JourneyTags() {
  const { t } = useTranslation();
  const { issuesStore } = useStore();
  const { confirmDelete } = useConfirms();

  const [source, setSource] = React.useState<SourceKey>('openreplay');
  const [q, setQ] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<JourneyTag | null>(null);

  const rows =
    source === 'openreplay'
      ? issuesStore.predefinedTags
      : issuesStore.customTags;
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
      // a tag you author is yours, so show the side it landed on
      setSource('yours');
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
      width: 84,
      render: (_, row) => (
        /* the Environments list's action pair, verbatim (KaiSettings/components/
           Environments.tsx): a direct pencil and a danger trash revealed on row
           hover, not a menu. Two actions do not need a menu to hide behind, and
           the agent surfaces already do it this way. */
        <div className="flex items-center justify-end gap-1">
          <Button
            type="text"
            className="invisible group-hover:visible"
            icon={<PencilIcon size={16} />}
            aria-label={t('Edit')}
            onClick={() => {
              setEditing(row);
              setDialogOpen(true);
            }}
          />
          <Button
            type="text"
            danger
            className="invisible group-hover:visible"
            icon={<Trash2 size={16} />}
            aria-label={t('Delete')}
            onClick={() =>
              confirmDelete({
                what: 'tag',
                name: row.name,
                consequence: t(
                  'The agent stops applying it to new sessions; sessions already tagged keep it.',
                ),
                onOk: () => issuesStore.removeTag(row.name),
              })
            }
          />
        </div>
      ),
    },
  ];

  // the Issues list's category-switcher grammar: Segmented + a faded count
  const sourceOptions = [
    {
      value: 'openreplay',
      label: (
        <span>
          {t('By OpenReplay')}
          <CountSuffix n={issuesStore.predefinedTags.length} />
        </span>
      ),
    },
    {
      value: 'yours',
      label: (
        <span>
          {t('Mine')}
          <CountSuffix n={issuesStore.customTags.length} />
        </span>
      ),
    },
  ];

  /* empty states wear the Environments list's quiet grammar (a muted lucide
     icon at 36 over centered text), not a plain sentence and not an
     illustration — the ghost artwork read off-brand in the 07-15 review */
  const emptyText = ql ? (
    t('No tags match “{{q}}”', { q: q.trim() })
  ) : (
    <div className="flex flex-col items-center justify-center py-4">
      <TagIcon size={36} style={{ color: 'var(--color-gray-medium)' }} />
      <div className="text-center my-4">
        {source === 'yours'
          ? t(
              'No tags of your own yet. Add one and describe the journey in plain words; the agent applies it automatically.',
            )
          : t('No tags left in OpenReplay’s set. Your own tags still apply.')}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col rounded-lg border bg-white">
      {/* source switcher + controls on one bar — the Issues list's controls row
          (px-4 py-3, Segmented left, controls right) */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        <Segmented
          size="small"
          value={source}
          onChange={(v) => {
            setSource(v as SourceKey);
            setQ('');
          }}
          options={sourceOptions}
        />
        <div className="flex items-center gap-2">
          <Input.Search
            size="small"
            allowClear
            maxLength={256}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Filter by name or description')}
            // 170 is the width the Audits list's search uses on the same bar
            style={{ width: 170 }}
          />
          <Button size="small" icon={<Plus size={14} />} onClick={openCreate}>
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
        // the row is the hover group the actions above reveal against
        rowClassName="group"
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
