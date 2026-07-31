import withPageTitle from 'HOCs/withPageTitle';
import { Button, Divider, Switch, Tabs, Tooltip, Typography } from 'antd';
import { ArrowLeft, Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory, useLocation } from 'App/routing';

import { kaiStore, useKaiStore } from '../KaiSettings/components/shared/store';
import CriticalRules from './CriticalRules';
import JourneyTags from './JourneyTags';

/* Preferences > Agents (Mehdi 07-27): the formula is MAIN components stay as
   tabs in each agent's page (Tests keeps Environments + run defaults), while
   preferences, notifications and behavior toggles live HERE — otherwise every
   agent grows a Settings tab that competes with Preferences.

   ONE TAB PER AGENT (Gabriel 07-30, replacing the three stacked sections that
   answered Mehdi's "it's not clear what's for issues, what's for test, and
   what's for audit"). The tab says which agent, so the sections inside are free
   to say what they are — Notifications, Journey tags, Behaviour. It also stays
   flat as agents are added, where stacked sections would grow a longer and
   longer scroll.

   The chrome is the Tests agent page's, deliberately (KaiSettings/index.tsx):
   bordered white card, one border-b header row with the 18px semibold title,
   then antd Tabs with the same 16px tab-bar padding, and each panel is `p-5`
   with Title level 5 sections split by Dividers, exactly like the Environments
   tab. FULL WIDTH: the page fills the 1360 the Preferences wrapper already
   gives every page, which only works because no control is pinned right (see
   PrefRow) — so nothing is ever marooned from its label. */

/* Hints run the full width of the card (Gabriel 07-31). They used to carry a
   72ch measure so prose would wrap "where the eye expects", but once the card
   itself went full width that cap stopped reading as a measure and started
   reading as a BUG: a one-sentence hint broke onto a second line halfway
   across the card, leaving a visibly empty right half. Every hint here is one
   or two sentences, so at full width they simply sit on one line, which is what
   Gabriel meant by "should be normal".

   The constraint this buys: hints must STAY short. A genuinely long paragraph
   would now stretch to ~1300px, which is an unreadable measure. If one ever
   needs that much text, it is a sign the hint should be shorter, not that the
   cap should come back. */
const PROSE = { display: 'block' } as const;

type AgentKey = 'issues' | 'tests' | 'audits';
const AGENTS: AgentKey[] = ['issues', 'tests', 'audits'];

/** one preference: label, hint, then its controls DIRECTLY BENEATH, left
    aligned (Gabriel 07-30). A label on the left with its control pinned right
    puts an arbitrary 700 to 1000px between two things that belong together, and
    padding cannot fix a gap that size — so the pairing goes vertical instead and
    the distance is a constant ~12px at any width. This is the grammar the
    Weekly Report preferences page already uses, and the same shape as the Tests
    page's run defaults (Field: label above control). It is what lets these
    surfaces run full width with nothing marooned. */
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
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{label}</span>
      <Typography.Text type="secondary" className="text-sm!" style={PROSE}>
        {hint}
      </Typography.Text>
      <div className="flex flex-col gap-2.5 mt-3">{children}</div>
    </div>
  );
}

/** a labelled switch — every channel reads at a glance (Gabriel 07-27: toggles,
    not a dropdown, and the rows share one control grammar). ONE switch size on
    the page (Gabriel 07-30), and it is the small one the other agent surfaces
    already use — Environments, the segment drawer, the capture pill. The switch
    leads and the label follows, as on the Weekly Report page. */
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
    <span className="flex items-center gap-2.5">
      <Switch size="small" checked={checked} onChange={onChange} />
      {label}
    </span>
  );
}

/** a titled group inside a panel — the Environments tab's section shape.
    No width of its own: sections, dividers and the tags table all fill the card,
    so the page has ONE edge. Capping sections instead put four widths on one
    page — card and divider at 1360, tags at 896, rows at 672 (Gabriel 07-30). */
function PrefSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    /* rhythm: ~9px inside a control group, ~16px from the heading to its first
       row, ~21px between rows, and the divider's 48px between sections */
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5 -mb-1.5">
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Typography.Title>
        <Typography.Text type="secondary" className="text-sm!" style={PROSE}>
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
  const location = useLocation();

  // the agent pages' Settings buttons deep-link to their own tab, the same
  // query-param pattern Data Management's Properties page uses (?view=)
  const requested = new URLSearchParams(location.search).get(
    'agent',
  ) as AgentKey | null;
  const [agent, setAgent] = React.useState<AgentKey>(
    requested && AGENTS.includes(requested) ? requested : 'issues',
  );
  const openTab = (key: string) => {
    setAgent(key as AgentKey);
    // replace, not push: switching tabs should not stack up back steps
    history.replace(`/client/agents?agent=${key}`);
  };

  // notification preferences — mock-local, the shape is the spec
  const [issuesDaily, setIssuesDaily] = React.useState(true);
  const [issuesWeekly, setIssuesWeekly] = React.useState(false);
  const [issuesSlack, setIssuesSlack] = React.useState(false);
  const [runFailEmail, setRunFailEmail] = React.useState(true);
  const [runFailSlack, setRunFailSlack] = React.useState(false);
  const [auditEmail, setAuditEmail] = React.useState(true);
  const [auditSlack, setAuditSlack] = React.useState(false);

  const tabItems = [
    {
      key: 'issues',
      label: t('Issues'),
      children: (
        <div className="flex flex-col p-5">
          <PrefSection
            title={t('Notifications')}
            hint={t('How you hear from the Issues agent.')}
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
          </PrefSection>

          <Divider />

          {/* journey tags — §13. The description IS the matching rule. */}
          <PrefSection
            title={t('Journey tags')}
            hint={t(
              'The tags the agent applies to each session. Write descriptions in plain words; matching is automatic.',
            )}
          >
            <JourneyTags />
          </PrefSection>

          <Divider />

          {/* §14 — the centralized "what's critical" list (Mehdi 07-28). Same
              shape as the tags manager above it on purpose: describe it once,
              the agent applies it. */}
          <PrefSection
            title={t('Critical')}
            hint={t(
              'What matters to you, in plain words. The agent flags the issues that match, and “Critical to me” on the Issues list filters by whose description matched.',
            )}
          >
            <CriticalRules />
          </PrefSection>
        </div>
      ),
    },
    {
      key: 'tests',
      label: t('Tests'),
      children: (
        <div className="flex flex-col p-5">
          <PrefSection
            title={t('Notifications')}
            hint={t('How you hear from the Tests agent.')}
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
          </PrefSection>

          <Divider />

          {/* moved here from the Tests page's old Settings tab */}
          <PrefSection
            title={t('Behaviour')}
            hint={t('What the agent does when it proposes a new version.')}
          >
            <PrefRow
              label={t('Pause tests on new revisions')}
              hint={t(
                'A changed flow usually breaks the current steps. When on, tests pause until the new version is reviewed; when off, they keep running on the current version.',
              )}
            >
              {/* a lone boolean still gets a word beside it, the way the Weekly
                  Report page pairs its switch with Yes/No — a naked switch under
                  a paragraph leaves you guessing which way is on */}
              <Channel
                label={pauseOnRevision ? t('On') : t('Off')}
                checked={pauseOnRevision}
                onChange={kaiStore.setPauseOnRevision}
              />
            </PrefRow>
          </PrefSection>
        </div>
      ),
    },
    {
      key: 'audits',
      label: t('Audits'),
      children: (
        <div className="flex flex-col p-5">
          <PrefSection
            title={t('Notifications')}
            hint={t('How you hear from the Audits agent.')}
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
          </PrefSection>
        </div>
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
              'Notifications and behaviour for each agent. Core configuration like environments and run defaults lives with the agent itself.',
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
        <Tabs
          activeKey={agent}
          onChange={openTab}
          items={tabItems}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
        />
      </div>
    </div>
  );
}

export default withPageTitle('Agents - OpenReplay')(observer(AgentsPreferences));
