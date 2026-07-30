import withPageTitle from 'HOCs/withPageTitle';
import { Button, Divider, Switch, Tooltip, Typography } from 'antd';
import { ArrowLeft, Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from 'App/routing';

import { kaiStore, useKaiStore } from '../KaiSettings/components/shared/store';
import JourneyTags from './JourneyTags';

/* Preferences > Agents (Mehdi 07-27): the formula is MAIN components stay as
   tabs in each agent's page (Tests keeps Environments + run defaults), while
   preferences, notifications and behavior toggles live HERE — otherwise every
   agent grows a Settings tab that competes with Preferences.

   Organized BY AGENT (Mehdi 07-28: "it's not clear what's for issues, what's
   for test, and what's for audit"). One section per agent, each holding its own
   notifications and settings, so attribution is readable and a fourth agent is
   one more section. It stays ONE page, which was the point of not giving each
   agent its own Settings tab; the rows are self-describing, so there is no
   "Notifications" sub-heading repeated three times. */

/** one preferences row: what it is on the left, its controls on the right */
function PrefRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="font-medium">{label}</span>
        <Typography.Text type="secondary" className="text-sm!">
          {hint}
        </Typography.Text>
      </div>
      <div className="flex items-center gap-4 shrink-0">{children}</div>
    </div>
  );
}

/** a labelled switch — every channel reads at a glance (Gabriel 07-27: toggles,
    not a dropdown, and the rows share one control grammar) */
function Channel({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {label}
      <Switch size="small" checked={checked} onChange={onChange} />
    </span>
  );
}

/** one agent's block; the title is what answers "what is this for" */
function AgentSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className="text-sm!">
          {hint}
        </Typography.Text>
      </div>
      {children}
    </section>
  );
}

function AgentsPreferences() {
  const { t } = useTranslation();
  const { pauseOnRevision } = useKaiStore();
  const history = useHistory();

  // notification preferences — mock-local, the shape is the spec
  const [issuesDaily, setIssuesDaily] = React.useState(true);
  const [issuesWeekly, setIssuesWeekly] = React.useState(false);
  const [issuesSlack, setIssuesSlack] = React.useState(false);
  const [runFailEmail, setRunFailEmail] = React.useState(true);
  const [runFailSlack, setRunFailSlack] = React.useState(false);
  const [auditEmail, setAuditEmail] = React.useState(true);
  const [auditSlack, setAuditSlack] = React.useState(false);

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
          <AgentSection
            title={t('Issues agent')}
            hint={t(
              'Finds issues in captured sessions, groups them, and tags what each session was doing.',
            )}
          >
            <PrefRow
              label={t('New issues')}
              hint={t('A digest of what the agent found.')}
            >
              <Channel
                label={t('Daily email')}
                checked={issuesDaily}
                onChange={setIssuesDaily}
              />
              <Channel
                label={t('Weekly email')}
                checked={issuesWeekly}
                onChange={setIssuesWeekly}
              />
              <Channel
                label={t('Slack')}
                checked={issuesSlack}
                onChange={setIssuesSlack}
              />
            </PrefRow>

            {/* journey tags — §13. The description IS the matching rule. */}
            <div className="flex flex-col gap-3">
              <div>
                <span className="font-medium">{t('Journey tags')}</span>
                <Typography.Text
                  type="secondary"
                  className="text-sm! block"
                >
                  {t(
                    'The tags the agent applies to each session. Write descriptions in plain words; matching is automatic.',
                  )}
                </Typography.Text>
              </div>
              <JourneyTags />
            </div>
          </AgentSection>

          <Divider />

          <AgentSection
            title={t('Tests agent')}
            hint={t(
              'Writes tests from real sessions and runs them against your environments.',
            )}
          >
            <PrefRow
              label={t('Failed test runs')}
              hint={t('When a scheduled run fails.')}
            >
              <Channel
                label={t('Email')}
                checked={runFailEmail}
                onChange={setRunFailEmail}
              />
              <Channel
                label={t('Slack')}
                checked={runFailSlack}
                onChange={setRunFailSlack}
              />
            </PrefRow>

            {/* moved here from the Tests page's old Settings tab */}
            <PrefRow
              label={t('Pause tests on new revisions')}
              hint={t(
                'A changed flow usually breaks the current steps. When on, tests pause until the new version is reviewed; when off, they keep running on the current version.',
              )}
            >
              <Switch
                checked={pauseOnRevision}
                onChange={kaiStore.setPauseOnRevision}
              />
            </PrefRow>
          </AgentSection>

          <Divider />

          <AgentSection
            title={t('Audits agent')}
            hint={t('Reviews a whole flow and reports what to fix.')}
          >
            <PrefRow
              label={t('Audit ready')}
              hint={t(
                'When an audit finishes and its report is ready. Sets the default for new audits; each audit can still choose.',
              )}
            >
              <Channel
                label={t('Email')}
                checked={auditEmail}
                onChange={setAuditEmail}
              />
              <Channel
                label={t('Slack')}
                checked={auditSlack}
                onChange={setAuditSlack}
              />
            </PrefRow>
          </AgentSection>
        </div>
      </div>
    </div>
  );
}

export default withPageTitle('Agents - OpenReplay')(observer(AgentsPreferences));
