import withPageTitle from 'HOCs/withPageTitle';
import {
  App,
  Button,
  Divider,
  Dropdown,
  Select,
  Switch,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowLeft, ChevronRight, EllipsisVertical, Info, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from 'App/routing';
import { useStore } from 'App/mstore';
import { PREDEFINED_JOURNEY_TAGS } from 'App/mstore/issuesStore';
import TagDialog from 'Components/Issues/TagDialog';
import { kaiStore, useKaiStore } from '../KaiSettings/components/shared/store';

/* Preferences > Agents (Mehdi 07-27): the formula is MAIN components stay as
   tabs in each agent's page (Tests keeps Environments + run defaults), while
   preferences, notifications and behavior toggles live HERE — otherwise every
   agent grows a Settings tab that competes with Preferences.

   One page, three sections:
   · Notifications — by CATEGORY, not per agent (one surface for all agents)
   · Journey tags  — the predefined labels + the customer's own (§13)
   · Tests         — the pause-on-revision behavior toggle (moved from the
                     Tests page's old Settings tab) */

type TagRow = { name: string; description: string };

function AgentsPreferences() {
  const { t } = useTranslation();
  const { issuesStore } = useStore();
  const { pauseOnRevision } = useKaiStore();
  const { modal } = App.useApp();
  const history = useHistory();

  const [showPredefined, setShowPredefined] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TagRow | null>(null);

  // notification preferences — mock-local, the shape is the spec
  const [issuesDigest, setIssuesDigest] = React.useState<'off' | 'daily' | 'weekly'>('daily');
  const [issuesSlack, setIssuesSlack] = React.useState(false);
  const [runFailEmail, setRunFailEmail] = React.useState(true);
  const [runFailSlack, setRunFailSlack] = React.useState(false);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (row: TagRow) => {
    setEditing(row);
    setDialogOpen(true);
  };
  const saveTag = (name: string, description: string) => {
    if (editing) issuesStore.updateCustomTag(editing.name, name, description);
    else {
      issuesStore.addCustomTag(name, description);
      message.success(t('Tag created. The agent starts applying it to new sessions.'));
    }
    setDialogOpen(false);
    setEditing(null);
  };
  const confirmDelete = (row: TagRow) =>
    modal.confirm({
      title: t('Delete this tag?'),
      icon: null,
      content: (
        <p style={{ color: 'var(--color-gray-dark)' }}>
          “{row.name}” will be removed and the agent stops applying it to new
          sessions.
        </p>
      ),
      okText: t('Delete tag'),
      okButtonProps: { danger: true },
      onOk: () => issuesStore.removeCustomTag(row.name),
    });

  const nameCol = {
    title: t('Name'),
    dataIndex: 'name',
    width: 200,
    render: (n: string) => <span className="font-medium">{n}</span>,
  };
  const descCol = {
    title: t('Description'),
    dataIndex: 'description',
    render: (d: string) => (
      <span style={{ color: 'var(--color-gray-dark)' }}>{d}</span>
    ),
  };
  const customColumns: TableColumnsType<TagRow> = [
    nameCol,
    descCol,
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
            onClick: ({ key }) =>
              key === 'edit' ? openEdit(row) : confirmDelete(row),
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

  return (
    <div className="flex flex-col gap-2">
      {/* the Settings shortcut on the agent pages lands here mid-flow — the
          same back button as the issue detail page returns the user */}
      <Button
        type="text"
        size="small"
        icon={<ArrowLeft size={15} />}
        onClick={() => history.goBack()}
        className="self-start -ml-2"
      >
        {t('Back')}
      </Button>
      <div className="flex flex-col rounded-lg border bg-white">
      {/* header — mirrors the agent pages' header grammar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="font-semibold text-lg">{t('Agents')}</span>
        <Tooltip
          placement="bottom"
          title={t(
            'Preferences shared by the Issues, Tests and Audits agents. Environments and run defaults live with each agent.',
          )}
        >
          <span
            className="flex items-center cursor-help"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <Info size={15} />
          </span>
        </Tooltip>
      </div>

      <div className="flex flex-col p-5 max-w-3xl">
        {/* Notifications — by category, one surface for every agent */}
        <section className="flex flex-col gap-4">
          <div>
            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              {t('Notifications')}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm!">
              {t('How you hear from the agents, by category.')}
            </Typography.Text>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-medium">{t('New issues')}</span>
              <Typography.Text type="secondary" className="text-sm!">
                {t('A digest of what the Issues agent found.')}
              </Typography.Text>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Select
                size="small"
                value={issuesDigest}
                onChange={setIssuesDigest}
                style={{ width: 110 }}
                options={[
                  { value: 'daily', label: t('Daily email') },
                  { value: 'weekly', label: t('Weekly email') },
                  { value: 'off', label: t('No email') },
                ]}
              />
              <span className="flex items-center gap-2 text-sm">
                {t('Slack')}
                <Switch
                  size="small"
                  checked={issuesSlack}
                  onChange={setIssuesSlack}
                />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-medium">{t('Failed test runs')}</span>
              <Typography.Text type="secondary" className="text-sm!">
                {t('When a scheduled test run fails.')}
              </Typography.Text>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="flex items-center gap-2 text-sm">
                {t('Email')}
                <Switch
                  size="small"
                  checked={runFailEmail}
                  onChange={setRunFailEmail}
                />
              </span>
              <span className="flex items-center gap-2 text-sm">
                {t('Slack')}
                <Switch
                  size="small"
                  checked={runFailSlack}
                  onChange={setRunFailSlack}
                />
              </span>
            </div>
          </div>
        </section>

        <Divider />

        {/* Journey tags — §13. The description IS the matching rule. */}
        <section className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {t('Journey tags')}
              </Typography.Title>
              <Typography.Text type="secondary" className="text-sm!">
                {t(
                  'The labels the agent applies to each session. Write descriptions in plain words; matching is automatic.',
                )}
              </Typography.Text>
            </div>
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              {t('Add label')}
            </Button>
          </div>

          {/* predefined set, collapsed by default (Mehdi's sketch) */}
          <button
            type="button"
            onClick={() => setShowPredefined((v) => !v)}
            className="flex items-center gap-1 self-start text-sm font-medium cursor-pointer"
            style={{ color: 'var(--color-gray-darkest)' }}
          >
            <ChevronRight
              size={14}
              className="transition-transform"
              style={{
                color: 'var(--color-gray-medium)',
                transform: showPredefined ? 'rotate(90deg)' : undefined,
              }}
            />
            {t('By OpenReplay')} · {PREDEFINED_JOURNEY_TAGS.length}
          </button>
          {showPredefined && (
            <Table<TagRow>
              size="small"
              rowKey="name"
              columns={[nameCol, descCol]}
              dataSource={PREDEFINED_JOURNEY_TAGS}
              pagination={false}
            />
          )}

          <span className="font-medium text-sm">{t('Your tags')}</span>
          <Table<TagRow>
            size="small"
            rowKey="name"
            columns={customColumns}
            dataSource={issuesStore.customTags.slice()}
            pagination={false}
            locale={{
              emptyText: t(
                'No custom tags yet. Add a label and describe the journey; the agent applies it automatically.',
              ),
            }}
          />
        </section>

        <Divider />

        {/* Tests behavior — moved here from the Tests page's old Settings tab */}
        <section className="flex flex-col gap-4">
          <div>
            <Typography.Title level={5} style={{ marginBottom: 0 }}>
              {t('Tests')}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm!">
              {t('What happens when the agent proposes a new version of a test.')}
            </Typography.Text>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-medium">
                {t('Pause tests on new revisions')}
              </span>
              <Typography.Text type="secondary" className="text-sm!">
                {t(
                  'A changed flow usually breaks the current steps. When on, tests pause until the new version is reviewed; when off, they keep running on the current version.',
                )}
              </Typography.Text>
            </div>
            <Switch
              checked={pauseOnRevision}
              onChange={kaiStore.setPauseOnRevision}
            />
          </div>
        </section>
      </div>

      </div>

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

export default withPageTitle('Agents - OpenReplay')(observer(AgentsPreferences));
