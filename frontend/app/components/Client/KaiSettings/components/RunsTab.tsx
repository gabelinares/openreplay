import { Button, Segmented, Select, Table, Tooltip, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { RotateCw } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';
import { Pagination } from 'UI';

import CountSuffix from 'Shared/CountSuffix';

import RunDrawer from './drawers/RunDrawer';
import './kai-table.css';
import { MOCK_RUNS } from './shared/mockData';
import { kaiStore, runStatusIn, useKaiStore } from './shared/store';
import { RunData, RunStatus } from './shared/types';
import {
  LiveDuration,
  REGION_OPTIONS,
  RESOLUTION_OPTIONS,
  RowTags,
  VersionLabel,
  formatDuration,
  getRunResult,
  relativeTime,
} from './shared/utils';

type StatusTab = 'all' | RunStatus;
const RESULT_ORDER: Record<RunStatus, number> = {
  running: 0,
  paused: 1,
  failed: 2,
  passed: 3,
};

const ENV_NAMES = Array.from(
  new Set(MOCK_RUNS.map((r) => r.envName).filter(Boolean)),
) as string[];
const TAG_NAMES = Array.from(
  new Set(MOCK_RUNS.flatMap((r) => r.tags ?? [])),
).sort();

function RunsTab() {
  const { t } = useTranslation();
  // search input renders in the page's main tab bar (index.tsx); query is shared
  const {
    runsQuery: query,
    runsTestFilter,
    runsOpenRunKey,
    runStatus,
  } = useKaiStore();
  // a run paused or stopped from its drawer reads that way here too — same overlay
  const statusOf = (run: RunData): RunStatus => runStatusIn(runStatus, run);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [resFilter, setResFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  // period filter (Mehdi 07-20): useful HERE, not on Tests — recent runs are
  // what you check; defaults to the last 7 days, not all time
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  // any filter change resets to page 1
  useEffect(() => {
    setPage(1);
  }, [query, statusTab, envFilter, tagFilter, resFilter, regionFilter]);

  // a test drawer's "View all runs" shortcut lands here: adopt the test as the search
  // query (one-shot — clearing the search shows everything again)
  useEffect(() => {
    if (runsTestFilter) {
      kaiStore.setRunsQuery(runsTestFilter);
      setStatusTab('all');
      kaiStore.clearRunsTestFilter();
    }
  }, [runsTestFilter]);

  // "View" on a specific run (the last-failed-run row) opens that run's drawer here,
  // on top of whatever filter just landed above
  useEffect(() => {
    if (runsOpenRunKey) {
      setOpenKey(runsOpenRunKey);
      kaiStore.clearRunsOpenRunKey();
    }
  }, [runsOpenRunKey]);

  const openRun = MOCK_RUNS.find((r) => r.key === openKey) ?? null;

  const countOf = (s: RunStatus) =>
    MOCK_RUNS.filter((r) => statusOf(r) === s).length;
  const runningCount = countOf('running');
  const pausedCount = countOf('paused');
  const failedCount = countOf('failed');
  const passedCount = countOf('passed');

  const visible = useMemo(() => {
    let arr = MOCK_RUNS;
    if (query.trim())
      arr = arr.filter((r) =>
        r.testName.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab !== 'all') arr = arr.filter((r) => statusOf(r) === statusTab);
    if (envFilter !== 'all') arr = arr.filter((r) => r.envName === envFilter);
    if (tagFilter !== 'all')
      arr = arr.filter((r) => (r.tags ?? []).includes(tagFilter));
    if (resFilter !== 'all')
      arr = arr.filter((r) => (r.resolution ?? 'desktop') === resFilter);
    if (regionFilter !== 'all')
      arr = arr.filter((r) => r.region === regionFilter);
    if (period !== 'all') {
      const HOUR = 3600000;
      const cutoff =
        Date.now() -
        (period === '24h' ? 24 : period === '7d' ? 7 * 24 : 30 * 24) * HOUR;
      arr = arr.filter((r) => r.date >= cutoff);
    }
    return arr;
    // runStatus included: pausing a run has to move it between the status tabs
  }, [
    query,
    statusTab,
    envFilter,
    tagFilter,
    resFilter,
    regionFilter,
    period,
    runStatus,
  ]);

  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + pageItems.length;

  const rerun = (run: RunData) =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);

  const faded = (n: number) => <CountSuffix n={n} />;
  const statusOptions = [
    {
      value: 'all',
      label: (
        <span>
          {t('All')}
          {faded(MOCK_RUNS.length)}
        </span>
      ),
    },
    {
      value: 'running',
      label: (
        <span>
          {t('Running')}
          {faded(runningCount)}
        </span>
      ),
    },
    // only offered once something is actually held — an always-visible "Paused 0"
    // tab would advertise a state most people never reach
    ...(pausedCount > 0
      ? [
          {
            value: 'paused',
            label: (
              <span>
                {t('Paused')}
                {faded(pausedCount)}
              </span>
            ),
          },
        ]
      : []),
    {
      value: 'failed',
      label: (
        <span>
          {t('Failed')}
          {faded(failedCount)}
        </span>
      ),
    },
    {
      value: 'passed',
      label: (
        <span>
          {t('Passed')}
          {faded(passedCount)}
        </span>
      ),
    },
  ];

  const columns: TableColumnsType<RunData> = [
    {
      title: t('Result'),
      dataIndex: 'status',
      width: 130,
      sorter: (a, b) => RESULT_ORDER[statusOf(a)] - RESULT_ORDER[statusOf(b)],
      showSorterTooltip: false,
      render: (_: unknown, run) => getRunResult(statusOf(run), t),
    },
    {
      title: t('Test'),
      dataIndex: 'testName',
      sorter: (a, b) => a.testName.localeCompare(b.testName),
      showSorterTooltip: false,
      render: (name: string, run) => (
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{name}</span>
          <VersionLabel version={run.version} />
        </span>
      ),
    },
    {
      title: t('Tags'),
      dataIndex: 'tags',
      width: 190,
      render: (tags: string[]) => <RowTags tags={tags} />,
    },
    {
      title: t('Environment'),
      dataIndex: 'envName',
      width: 150,
      sorter: (a, b) => (a.envName ?? '').localeCompare(b.envName ?? ''),
      showSorterTooltip: false,
      render: (env?: string) =>
        env ? (
          <span className="text-gray-dark">{env}</span>
        ) : (
          <span className="text-disabled-text">—</span>
        ),
    },
    {
      title: t('Duration'),
      dataIndex: 'duration',
      width: 120,
      sorter: (a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity),
      showSorterTooltip: false,
      render: (_: unknown, run) =>
        statusOf(run) === 'running' ? (
          <LiveDuration start={run.date} />
        ) : statusOf(run) === 'paused' ? (
          <LiveDuration start={run.date} frozen />
        ) : (
          <span className="text-disabled-text">
            {run.duration ? formatDuration(run.duration) : '—'}
          </span>
        ),
    },
    {
      title: t('When'),
      dataIndex: 'date',
      width: 150,
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.date - b.date,
      showSorterTooltip: false,
      render: (date: number) => (
        <Tooltip title={formatDateTimeDefault(date)}>
          <span className="text-disabled-text">{relativeTime(date)}</span>
        </Tooltip>
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 64,
      align: 'right',
      // Rerun on FAILED runs only (Mehdi 07-20) — rerunning a pass has no
      // purpose, the icon was noise on every row
      render: (_: unknown, run) =>
        statusOf(run) !== 'failed' ? null : (
          <Tooltip title={t('Rerun')}>
            <Button
              type="text"
              icon={<RotateCw size={16} />}
              aria-label={t('Rerun')}
              onClick={(e) => {
                e.stopPropagation();
                rerun(run);
              }}
            />
          </Tooltip>
        ),
    },
  ];

  return (
    <div className="flex flex-col">
      {/* controls bar — status tabs (left), filters (right). Search lives in
          the page's MAIN tab bar (index.tsx), not here: keeps this row to one
          line (Gabriel 07-27; same arrangement as Tests). */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        <div className="flex items-center gap-2">
          <Segmented
            size="small"
            value={statusTab}
            onChange={(v) => setStatusTab(v as StatusTab)}
            options={statusOptions}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            size="small"
            value={envFilter}
            onChange={setEnvFilter}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: t('All environments') },
              ...ENV_NAMES.map((n) => ({ value: n, label: n })),
            ]}
          />
          <Select
            size="small"
            value={tagFilter}
            onChange={setTagFilter}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('All tags') },
              ...TAG_NAMES.map((tag) => ({ value: tag, label: tag })),
            ]}
          />
          <Select
            size="small"
            value={resFilter}
            onChange={setResFilter}
            style={{ width: 130 }}
            options={[
              { value: 'all', label: t('All viewports') },
              ...RESOLUTION_OPTIONS.map((o) => ({
                value: o.value,
                label: t(o.label),
              })),
            ]}
          />
          <Select
            size="small"
            value={regionFilter}
            onChange={setRegionFilter}
            style={{ width: 130 }}
            options={[
              { value: 'all', label: t('All regions') },
              ...REGION_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              })),
            ]}
          />
          <Select
            size="small"
            value={period}
            onChange={setPeriod}
            style={{ width: 140 }}
            options={[
              { value: '24h', label: t('Last 24 hours') },
              { value: '7d', label: t('Last 7 days') },
              { value: '30d', label: t('Last 30 days') },
              { value: 'all', label: t('All time') },
            ]}
          />
        </div>
      </div>

      <Table<RunData>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={pageItems}
        pagination={false}
        rowClassName="cursor-pointer"
        onRow={(run) => ({
          onClick: (e) => {
            const el = e.target as HTMLElement;
            if (el.closest('button')) return;
            setOpenKey(run.key);
          },
        })}
        locale={{ emptyText: t('No runs match these filters.') }}
      />

      {visible.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-disabled-text">
            {t('Showing')} {rangeStart}–{rangeEnd} {t('of')} {visible.length}{' '}
            {t('runs')}
          </span>
          <div className="w-[200px]">
            <Pagination
              page={page}
              total={visible.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <RunDrawer
        run={openRun}
        open={!!openRun}
        onClose={() => setOpenKey(null)}
      />
    </div>
  );
}

export default RunsTab;
