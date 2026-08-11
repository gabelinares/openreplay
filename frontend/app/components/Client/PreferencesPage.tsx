import { Tabs, Tooltip, Typography } from 'antd';
import type { TabsProps } from 'antd';
import { Button } from 'antd';
import { ArrowLeft, Info } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from 'App/routing';

/* THE Preferences page shell.

   Every page under Preferences was drawing its own card: nine of them carried a
   `shadow-xs` the agent pages had dropped, titles ran from text-lg to text-2xl,
   some had a header divider and some did not, and the padding inside varied per
   page. Moving between two pages in the same section read like moving between two
   products (OR-3678).

   The grammar here is the agent pages' (`Client/AgentsPreferences/index.tsx`,
   `Client/KaiSettings/index.tsx`), which Gabriel picked as the reference and
   AuditView already converted to. Taken verbatim from those files rather than
   re-derived:

     card    flex flex-col bg-white rounded-lg border      (NO shadow)
     header  flex items-center gap-2 border-b px-4 py-2
     title   font-semibold text-lg
     tabs    tabBarStyle paddingLeft/Right 16, marginBottom 0
     body    p-5

   Do not restyle a page by passing classes that fight these. If a page needs
   something the shell cannot express, change the shell so every page gets it. */

export interface PreferencesPageProps {
  /** the page title, in the header row */
  title: React.ReactNode;
  /** optional muted value right after the title — a count, a plan name */
  meta?: React.ReactNode;
  /** optional help tooltip, as the agent pages carry */
  info?: string;
  /** optional controls pinned to the right of the header row */
  actions?: React.ReactNode;
  /** optional antd Tabs directly under the header, as Agents and Tests have */
  tabs?: Pick<
    TabsProps,
    'items' | 'activeKey' | 'defaultActiveKey' | 'onChange'
  >;
  /** show a Back button above the card, for pages reached mid-flow */
  back?: boolean;
  /** set when the body manages its own padding (a full-bleed table, say) */
  flush?: boolean;
  /** the card fills the viewport and its body scrolls internally, for pages built
   *  around a sider or a long list rather than a column of sections */
  fillHeight?: boolean;
  children?: React.ReactNode;
}

export default function PreferencesPage({
  title,
  meta,
  info,
  actions,
  tabs,
  back,
  flush,
  fillHeight,
  children,
}: PreferencesPageProps) {
  const { t } = useTranslation();
  const history = useHistory();

  const card = (
    <div
      className="flex flex-col bg-white rounded-lg border"
      // 130px is the Preferences wrapper's chrome above the card, kept as the one
      // definition rather than repeated per page
      style={fillHeight ? { height: 'calc(100vh - 130px)' } : undefined}
    >
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="font-semibold text-lg">{title}</span>
        {meta != null && (
          <span style={{ color: 'var(--color-gray-medium)' }}>{meta}</span>
        )}
        {info && (
          <Tooltip placement="bottom" title={info}>
            <span
              className="flex items-center cursor-help"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Info size={15} />
            </span>
          </Tooltip>
        )}
        {actions && (
          <div className="flex items-center gap-2 ml-auto">{actions}</div>
        )}
      </div>

      {/* tabs own the space under the header; their panels carry the padding */}
      {tabs ? (
        <Tabs
          {...tabs}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
        />
      ) : (
        <div
          className={`${flush ? '' : 'flex flex-col p-5'} ${
            fillHeight ? 'flex-1 min-h-0 overflow-hidden' : ''
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );

  if (!back) return card;
  return (
    <div className="flex flex-col gap-2">
      {/* same back control as the issue detail page and Preferences > Agents */}
      <Button
        type="text"
        size="small"
        icon={<ArrowLeft size={15} />}
        onClick={() => history.goBack()}
        className="self-start -ml-2"
      >
        {t('Back')}
      </Button>
      {card}
    </div>
  );
}

/** A titled group inside a page, split from its neighbours by antd's Divider.
 *  Lifted from Preferences > Agents so the text hierarchy inside a page is one
 *  thing too: Title level 5 with no bottom margin, then a secondary hint. */
export function PreferencesSection({
  title,
  hint,
  actions,
  children,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {title}
          </Typography.Title>
          {hint && (
            <Typography.Text
              type="secondary"
              className="text-sm!"
              style={{ display: 'block' }}
            >
              {hint}
            </Typography.Text>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
