import {
  Badge,
  Button,
  Dropdown,
  Input,
  Modal,
  Segmented,
  Select,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { Calendar, EllipsisVertical, Merge, Play, Plus, Radar } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pagination } from 'UI';

import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import './kai-table.css';
import { needsReview } from './shared/revisions';
import { hasNoEnvironment, kaiStore, useKaiStore } from './shared/store';
import { RunData, TestCase } from './shared/types';
import {
  DisplayStatus,
  RowTags,
  VersionLabel,
  displayStatus,
  getStatusTag,
  isScheduled,
  relativeTime,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';

type StatusTab = 'all' | DisplayStatus;
const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  needs_review: 1,
  approved: 2,
  active: 3,
  paused: 4,
};

let manualCounter = 0;

function TestsTab() {
  const { t } = useTranslation();
  // tests live in the shared store — Settings (environment deletion) mutates them too.
  // pauseOnRevision decides whether a pending revision reads "Needs review" and
  // suspends the run controls, or the test keeps running while the review waits.
  const { tests, pauseOnRevision } = useKaiStore();
  const { setTests } = kaiStore;
  const statusOf = (tc: TestCase) => displayStatus(tc, pauseOnRevision);
  const [query, setQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // when a drawer is opened via the "Schedule" action, jump straight to the schedule
  const [focusSchedule, setFocusSchedule] = useState(false);
  // the open drawer belongs to a just-added test: creation mode (footer "Create test");
  // closing without creating discards the placeholder
  const [creating, setCreating] = useState(false);

  const PAGE_SIZE = 20;
  useEffect(() => {
    setPage(1);
  }, [query, statusTab, envFilter, tagFilter]);

  // the Needs review tab only exists while something needs review — reviewing the
  // last one from inside that tab falls back to All instead of an empty filter
  const anyReview = tests.some((tc) => needsReview(tc));
  useEffect(() => {
    if (statusTab === 'needs_review' && !anyReview) setStatusTab('all');
  }, [statusTab, anyReview]);

  const updateTest = (updated: TestCase) =>
    setTests((prev) =>
      prev.map((tc) => (tc.key === updated.key ? updated : tc)),
    );
  const removeMany = (keys: React.Key[]) => {
    const set = new Set(keys);
    setTests((prev) => {
      // deleting a merge-in-review kills the base only — the absorbed tests
      // were separate tests moments ago, so they come back instead of dying
      // as silent collateral
      const restored = prev
        .filter((tc) => set.has(tc.key) && tc.pendingMerge)
        .flatMap((tc) => tc.pendingMerge!.sources);
      return [...restored, ...prev.filter((tc) => !set.has(tc.key))];
    });
    setSelectedKeys((prev) => prev.filter((k) => !set.has(k)));
    setOpenKey((k) => (k && set.has(k) ? null : k));
  };
  const removeTest = (key: string) => removeMany([key]);

  // open a row's drawer; opening a new draft marks it seen (clears the dot)
  const openRow = (tc: TestCase) => {
    setFocusSchedule(false);
    setCreating(false);
    setOpenKey(tc.key);
    if (tc.status === 'draft' && tc.isNew) updateTest({ ...tc, isNew: false });
  };
  // open the Settings drawer scrolled to the schedule (from the "Schedule" action)
  const openSchedule = (tc: TestCase) => {
    setOpenKey(tc.key);
    setFocusSchedule(true);
  };
  // drop the schedule → the test goes back to "approved" (ready, not scheduled)
  const unschedule = (tc: TestCase) =>
    updateTest({ ...tc, status: 'approved', schedule: null });

  // Manual creation — writing steps by hand is easy, so a hand-made test skips the
  // draft/approve flow and starts life `approved` (ready, unscheduled), drawer open.
  const addTest = () => {
    // manual tests start from Settings' default run configuration, like drafts
    const { defaults } = kaiStore.get();
    const tc: TestCase = {
      key: `test-manual-${(manualCounter += 1)}-${Date.now()}`,
      title: t('Untitled test'),
      createdAt: Date.now(),
      steps: [],
      status: 'approved',
      schedule: null,
      tags: [],
      envNames: defaults.envName ? [defaults.envName] : undefined,
      resolutions: defaults.resolution ? [defaults.resolution] : undefined,
      regions: defaults.region ? [defaults.region] : undefined,
    };
    setTests((prev) => [tc, ...prev]);
    setFocusSchedule(false);
    setCreating(true);
    setOpenKey(tc.key);
  };

  // jump to the Runs tab pre-filtered to this test ("View all runs")
  const viewRuns = (tc: TestCase) => {
    setOpenKey(null);
    kaiStore.showRunsForTest(tc.title);
  };
  // jump to the Runs tab with one exact run's drawer open ("View" on last failed run)
  const viewRun = (run: RunData) => {
    setOpenKey(null);
    kaiStore.openRunInRunsTab(run);
  };

  // Duplicate (row ellipsis): copies the steps only — no environment, schedule or
  // tags travel with it — and lands as a draft at v1, floating to the top.
  // The brief pending toast models the async contract for production (report
  // 2.5): the action acknowledges immediately, the row lands with a confirm.
  const duplicateTest = (tc: TestCase) => {
    const hide = message.loading(t('Duplicating…'), 0);
    window.setTimeout(() => {
      const copy: TestCase = {
        key: `test-copy-${(manualCounter += 1)}-${Date.now()}`,
        title: `${tc.title} (copy)`,
        steps: [...tc.steps],
        status: 'draft',
        createdAt: Date.now(),
        isNew: true,
      };
      setTests((prev) => [copy, ...prev]);
      hide();
      message.success(t('Duplicated as a draft'));
    }, 450);
  };

  const openTest = tests.find((tc) => tc.key === openKey) ?? null;

  // counts follow the DISPLAY status. The Needs review count is always the pending
  // revisions (the tab must surface reviews even when they don't pause the test).
  const countOf = (s: DisplayStatus) =>
    tests.filter((tc) => statusOf(tc) === s).length;
  const draftCount = countOf('draft');
  const reviewCount = tests.filter((tc) => needsReview(tc)).length;
  const approvedCount = countOf('approved');
  const activeCount = countOf('active');
  const pausedCount = countOf('paused');

  const envNames = Array.from(
    new Set(tests.flatMap((tc) => tc.envNames ?? [])),
  ).sort();
  const allTags = Array.from(
    new Set(tests.flatMap((tc) => tc.tags ?? [])),
  ).sort();

  // ---- column sort ------------------------------------------------------
  // an active header sort is FLAT: it re-orders the whole filtered list (not
  // within groups) and the needs-attention grouping disappears until the sort
  // is cleared again (third click on the header). Sorting must happen on the
  // full list BEFORE pagination — antd only sees the current page.
  type SortKey = 'title' | 'envNames' | 'schedule' | 'status' | 'createdAt';
  const [sort, setSort] = useState<{
    key: SortKey;
    order: 'ascend' | 'descend';
  } | null>(null);
  const compare: Record<SortKey, (a: TestCase, b: TestCase) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    envNames: (a, b) =>
      (a.envNames?.[0] ?? '').localeCompare(b.envNames?.[0] ?? ''),
    schedule: (a, b) =>
      scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule)),
    status: (a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)],
    createdAt: (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  };

  const visible = useMemo(() => {
    let arr = tests;
    if (query.trim())
      arr = arr.filter((tc) =>
        tc.title.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab === 'needs_review')
      arr = arr.filter((tc) => needsReview(tc));
    else if (statusTab !== 'all')
      arr = arr.filter((tc) => statusOf(tc) === statusTab);
    if (envFilter !== 'all')
      arr = arr.filter((tc) => (tc.envNames ?? []).includes(envFilter));
    if (tagFilter !== 'all')
      arr = arr.filter((tc) => (tc.tags ?? []).includes(tagFilter));
    if (sort) {
      const sorted = [...arr].sort(compare[sort.key]);
      if (sort.order === 'descend') sorted.reverse();
      return sorted;
    }
    // no sort: needs-attention rows float to the top — drafts first, then tests
    // waiting on a revision review
    const drafts = arr.filter((tc) => tc.status === 'draft');
    // pending merges float with pending revisions — both are waiting on you
    const review = arr.filter(
      (tc) => tc.status !== 'draft' && (needsReview(tc) || tc.pendingMerge),
    );
    const rest = arr.filter(
      (tc) => tc.status !== 'draft' && !needsReview(tc) && !tc.pendingMerge,
    );
    return [...drafts, ...review, ...rest];
  }, [tests, query, statusTab, envFilter, tagFilter, sort]);

  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + pageItems.length;

  // ---- bulk actions over the current selection -------------------------
  // NOTE: no bulk approve/activate of drafts — activating a draft untested is
  // exactly what review is for, so drafts are approved one by one from their
  // drawer (Mehdi 07-07)
  const selected = tests.filter((tc) => selectedKeys.includes(tc.key));
  const selActive = selected.filter((tc) => tc.status === 'active').length;
  // merge-pending tests are paused by construction — bulk Resume skips them
  // (accepting the combined steps is the only way to wake them)
  const selPaused = selected.filter(
    (tc) => tc.status === 'paused' && !hasNoEnvironment(tc) && !tc.pendingMerge,
  ).length;

  const bulkSet = (
    predicate: (tc: TestCase) => boolean,
    patch: Partial<TestCase>,
  ) => {
    setTests((prev) =>
      prev.map((tc) =>
        selectedKeys.includes(tc.key) && predicate(tc)
          ? { ...tc, ...patch }
          : tc,
      ),
    );
    setSelectedKeys([]);
  };
  const pauseSelected = () =>
    bulkSet((tc) => tc.status === 'active', { status: 'paused' });
  // paused tests with no environment left can't resume — nothing to run against
  const resumeSelected = () =>
    bulkSet(
      (tc) =>
        tc.status === 'paused' && !hasNoEnvironment(tc) && !tc.pendingMerge,
      { status: 'active' },
    );
  const deleteSelected = () => removeMany(selectedKeys);

  // ---- merge (Mehdi 07-13): combine tests, steps arrive as groups -------
  // Base = FIRST selected: the merged test keeps its name, settings, tags,
  // schedule and (runs are linked by name) its run history. Everyone's steps
  // become reorderable groups pending review; nothing runs until accepted,
  // so a non-draft base parks at `paused`. Tests mid-review can't merge.
  const mergeBlocked = selected.some((tc) => needsReview(tc) || tc.pendingMerge);
  const doMerge = (base: TestCase, rest: TestCase[]) => {
    const merged: TestCase = {
      ...base,
      status: base.status === 'draft' ? 'draft' : 'paused',
      pendingMerge: {
        groups: [base, ...rest].map((tcx) => ({
          title: tcx.title,
          steps: [...tcx.steps],
        })),
        sources: rest,
        prevStatus: base.status,
      },
    };
    const dropped = new Set(rest.map((r) => r.key));
    setTests((prev) =>
      prev
        .filter((tc) => !dropped.has(tc.key))
        .map((tc) => (tc.key === base.key ? merged : tc)),
    );
    setSelectedKeys([]);
    setFocusSchedule(false);
    setCreating(false);
    setOpenKey(base.key);
  };
  const confirmMerge = () => {
    const sel = selectedKeys
      .map((k) => tests.find((tc) => tc.key === k))
      .filter(Boolean) as TestCase[];
    if (sel.length < 2) return;
    const [base, ...rest] = sel;
    Modal.confirm({
      title: t('Merge {{n}} tests into “{{name}}”?', {
        n: sel.length,
        name: base.title,
      }),
      content: t(
        'Steps combine as groups you arrange first — nothing runs until you accept. “{{name}}” keeps its name and settings; the rest fold into it.',
        { name: base.title },
      ),
      okText: t('Merge'),
      cancelText: t('Cancel'),
      onOk: () => doMerge(base, rest),
    });
  };
  // cancel from the drawer: the absorbed tests return untouched
  const cancelMerge = (tc: TestCase) => {
    const pm = tc.pendingMerge;
    if (!pm) return;
    setTests((prev) => [
      ...pm.sources,
      ...prev.map((x) =>
        x.key === tc.key
          ? { ...tc, status: pm.prevStatus, pendingMerge: undefined }
          : x,
      ),
    ]);
    message.info(t('Merge cancelled — the original tests are back.'));
  };

  const runNow = (tc: TestCase) =>
    message.success(`${tc.title} — ${t('run started, see Runs')}`);

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  const statusOptions = [
    {
      value: 'all',
      label: (
        <span>
          {t('All')}
          {faded(tests.length)}
        </span>
      ),
    },
    {
      value: 'draft',
      label: (
        <span>
          {t('Drafts')}
          {faded(draftCount)}
        </span>
      ),
    },
    // only appears when something actually needs review — a permanently-empty tab
    // would read as one more thing to worry about
    ...(reviewCount > 0
      ? [
          {
            value: 'needs_review',
            label: (
              <span>
                {t('Needs review')}
                {faded(reviewCount)}
              </span>
            ),
          },
        ]
      : []),
    {
      value: 'approved',
      label: (
        <span>
          {t('Approved')}
          {faded(approvedCount)}
        </span>
      ),
    },
    {
      value: 'active',
      label: (
        <span>
          {t('Active')}
          {faded(activeCount)}
        </span>
      ),
    },
    {
      value: 'paused',
      label: (
        <span>
          {t('Paused')}
          {faded(pausedCount)}
        </span>
      ),
    },
  ];

  const rowMenu = (tc: TestCase) => {
    let items;
    if (tc.pendingMerge) {
      // merge review pending — arranging + accepting is the only way forward;
      // Delete restores the absorbed tests (see removeMany)
      items = [
        { key: 'open', label: t('Review merge') },
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    } else if (tc.status === 'draft') {
      // Dismiss keeps the draft (Mehdi 07-20) — it just clears the "new" dot,
      // so it's quiet; Delete is the destructive one
      items = [
        { key: 'open', label: t('Review draft') },
        { key: 'merge', label: t('Merge with…') },
        ...(tc.isNew ? [{ key: 'dismiss', label: t('Dismiss') }] : []),
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    } else if (needsReview(tc) && pauseOnRevision) {
      // pause-on-revision: the run controls are suspended — reviewing is the only
      // way forward, so the menu leads with it
      items = [
        { key: 'open', label: t('Review changes') },
        { key: 'duplicate', label: t('Duplicate') },
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    } else {
      // state-dependent run controls, then Settings, then Delete
      const controls: {
        key: string;
        label: React.ReactNode;
        disabled?: boolean;
      }[] = [];
      if (tc.status === 'active')
        controls.push({ key: 'pause', label: t('Pause') });
      if (tc.status === 'paused') {
        // no environment → nothing to run against; Resume unlocks once one is set
        const blocked = hasNoEnvironment(tc);
        controls.push({
          key: 'resume',
          disabled: blocked,
          label: blocked ? (
            <Tooltip
              title={t('Set an environment in this test’s settings to resume.')}
              placement="left"
            >
              <span>{t('Resume')}</span>
            </Tooltip>
          ) : (
            t('Resume')
          ),
        });
      }
      if (tc.status === 'approved')
        controls.push({ key: 'schedule', label: t('Schedule') });
      if (tc.status === 'active' || tc.status === 'paused')
        controls.push({ key: 'unschedule', label: t('Unschedule') });
      items = [
        ...controls,
        // the drawer opens straight into the review while one is pending
        {
          key: 'open',
          label: needsReview(tc) ? t('Review changes') : t('Settings'),
        },
        { key: 'duplicate', label: t('Duplicate') },
        // Mehdi 07-13 — enters selection with this row, finish in the toolbar
        { key: 'merge', label: t('Merge with…') },
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    }
    return {
      items,
      onClick: ({ key, domEvent }: { key: string; domEvent: any }) => {
        domEvent.stopPropagation();
        if (key === 'open') openRow(tc);
        else if (key === 'schedule') openSchedule(tc);
        else if (key === 'unschedule') unschedule(tc);
        else if (key === 'duplicate') duplicateTest(tc);
        else if (key === 'merge') {
          setSelectedKeys((prev) =>
            prev.includes(tc.key) ? prev : [...prev, tc.key],
          );
          message.info(
            t('Select the tests to merge with, then hit Merge in the toolbar.'),
          );
        }
        else if (key === 'pause') updateTest({ ...tc, status: 'paused' });
        else if (key === 'resume') updateTest({ ...tc, status: 'active' });
        else if (key === 'dismiss') {
          // Dismiss keeps the draft (Mehdi 07-20) — clears the "new" dot only
          updateTest({ ...tc, isNew: false });
          message.info(t('Draft kept in your list — approve or delete it anytime.'));
        } else if (key === 'delete') removeTest(tc.key);
      },
    };
  };

  const columns: TableColumnsType<TestCase> = [
    {
      title: t('Test'),
      dataIndex: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      showSorterTooltip: false,
      render: (title: string, tc) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{title}</span>
          <VersionLabel version={tc.version} />
          {/* the same "something new is waiting" dot as new drafts — a pending
              revision is new until reviewed (no row tint here, though) */}
          {(needsReview(tc) ||
            tc.pendingMerge ||
            (tc.status === 'draft' && tc.isNew)) && (
            <Tooltip
              title={
                tc.pendingMerge
                  ? t('Merged — arrange and accept the combined steps')
                  : needsReview(tc)
                    ? t('New version — not reviewed yet')
                    : t('New — not reviewed yet')
              }
            >
              <span className="shrink-0 flex items-center">
                <Badge color="var(--color-main)" />
              </span>
            </Tooltip>
          )}
        </div>
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
      dataIndex: 'envNames',
      width: 150,
      sorter: (a, b) =>
        (a.envNames?.[0] ?? '').localeCompare(b.envNames?.[0] ?? ''),
      showSorterTooltip: false,
      render: (envNames?: string[]) => {
        if (!envNames || envNames.length === 0)
          return (
            <span className="text-disabled-text italic">{t('Not set')}</span>
          );
        const [first, ...rest] = envNames;
        return (
          <Tooltip title={envNames.join(', ')}>
            <span className="text-gray-dark">
              {first}
              {rest.length > 0 && (
                <span className="text-gray-medium"> +{rest.length}</span>
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t('Schedule'),
      dataIndex: 'schedule',
      width: 180,
      sorter: (a, b) =>
        scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule)),
      showSorterTooltip: false,
      render: (_: unknown, tc) =>
        !isScheduled(tc.schedule) ? (
          <span className="text-disabled-text italic">
            {t('Not scheduled')}
          </span>
        ) : (
          <Tooltip title={scheduleLabel(tc.schedule)}>
            <span className="flex items-center gap-1.5 text-gray-dark">
              <Calendar size={13} className="shrink-0 text-gray-medium" />
              <span className="truncate">{scheduleShort(tc.schedule)}</span>
            </span>
          </Tooltip>
        ),
    },
    {
      title: t('Created'),
      dataIndex: 'createdAt',
      width: 110,
      // newest first on the first click — the order people reach for
      sortDirections: ['descend', 'ascend'],
      sorter: (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      showSorterTooltip: false,
      render: (ts?: number) =>
        ts ? (
          <Tooltip
            title={new Date(ts).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          >
            <span className="text-gray-dark">{relativeTime(ts)}</span>
          </Tooltip>
        ) : (
          <span className="text-disabled-text">—</span>
        ),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      width: 120,
      sorter: (a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)],
      showSorterTooltip: false,
      render: (_: unknown, tc) => getStatusTag(statusOf(tc), t),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 104,
      align: 'right',
      render: (_: unknown, tc) => (
        <div className="flex items-center justify-end">
          {tc.status !== 'draft' && (
            <Tooltip
              title={
                tc.pendingMerge
                  ? t('Paused until the merged steps are accepted')
                  : pauseOnRevision && needsReview(tc)
                    ? t('Paused until the new version is reviewed')
                    : t('Run now')
              }
            >
              <Button
                type="text"
                disabled={(pauseOnRevision && needsReview(tc)) || !!tc.pendingMerge}
                icon={<Play size={16} />}
                aria-label={t('Run now')}
                onClick={(e) => {
                  e.stopPropagation();
                  runNow(tc);
                }}
              />
            </Tooltip>
          )}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={rowMenu(tc)}
          >
            <Button
              type="text"
              icon={<EllipsisVertical size={16} />}
              aria-label={t('Actions')}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  // first-run / empty state
  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-16 px-4">
        <div className="w-12 h-12 rounded-full bg-gray-lightest flex items-center justify-center">
          <Radar size={22} className="text-gray-medium" />
        </div>
        <Typography.Text strong className="text-base!">
          {t('Watching your sessions')}
        </Typography.Text>
        <Typography.Text type="secondary" className="max-w-md">
          {t(
            'As real users move through your app, the agent learns the journeys they take. Once it has seen a full journey across enough sessions, it drafts a test here for you to review.',
          )}
        </Typography.Text>
        <span className="text-sm text-disabled-text">
          {t('Nothing to set up — drafts will appear as they are ready.')}
        </span>
        <Button
          type="primary"
          icon={<Plus size={14} />}
          onClick={addTest}
          className="mt-1"
        >
          {t('Add test manually')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* controls bar — status tabs + search up front (left), filters trail
          (right). Search rides with the primary controls, wider (Mehdi 07-20:
          the filter cluster was getting crowded; same arrangement as Runs). */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        <div className="flex items-center gap-2">
          <Segmented
            size="small"
            value={statusTab}
            onChange={(v) => setStatusTab(v as StatusTab)}
            options={statusOptions}
          />
          <Input.Search
            size="small"
            allowClear
            placeholder={t('Search tests')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
        {/* selecting rows swaps the filters out for bulk actions — same row, no
            extra banner; each button carries the count it will affect */}
        {selectedKeys.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-disabled-text">
              {selectedKeys.length} {t('selected')}
            </span>
            {selActive > 0 && (
              <Button size="small" onClick={pauseSelected}>
                {t('Pause')} ({selActive})
              </Button>
            )}
            {selPaused > 0 && (
              <Button size="small" onClick={resumeSelected}>
                {t('Resume')} ({selPaused})
              </Button>
            )}
            {selectedKeys.length >= 2 && (
              <Tooltip
                title={
                  mergeBlocked
                    ? t('A selected test has a review pending — resolve it first.')
                    : undefined
                }
              >
                <Button
                  size="small"
                  disabled={mergeBlocked}
                  icon={<Merge size={13} />}
                  onClick={confirmMerge}
                >
                  {t('Merge')} ({selectedKeys.length})
                </Button>
              </Tooltip>
            )}
            <Button size="small" danger onClick={deleteSelected}>
              {t('Delete')} ({selectedKeys.length})
            </Button>
            <Button
              size="small"
              type="text"
              onClick={() => setSelectedKeys([])}
            >
              {t('Clear')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              size="small"
              value={envFilter}
              onChange={setEnvFilter}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: t('All environments') },
                ...envNames.map((n) => ({ value: n, label: n })),
              ]}
            />
            <Select
              size="small"
              value={tagFilter}
              onChange={setTagFilter}
              style={{ width: 120 }}
              options={[
                { value: 'all', label: t('All tags') },
                ...allTags.map((tag) => ({ value: tag, label: tag })),
              ]}
            />
            {/* manual creation — the agent drafts most tests, but writing steps by
                hand is easy enough to deserve a first-class button */}
            <Button
              size="small"
              type="primary"
              icon={<Plus size={14} />}
              onClick={addTest}
            >
              {t('Add test')}
            </Button>
          </div>
        )}
      </div>

      <Table<TestCase>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={pageItems}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
          columnWidth: 44,
        }}
        rowClassName={(tc) =>
          `cursor-pointer${tc.status === 'draft' && tc.isNew ? ' kai-row-new' : ''}`
        }
        // header sorts re-order the FULL filtered list (see the `sort` state);
        // antd itself only ever sees one page of rows
        onChange={(_, __, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          setSort(
            s?.order
              ? { key: s.field as SortKey, order: s.order }
              : null,
          );
          setPage(1);
        }}
        onRow={(tc) => ({
          onClick: (e) => {
            const el = e.target as HTMLElement;
            if (
              el.closest('button') ||
              el.closest('.ant-checkbox-wrapper') ||
              el.closest('.ant-table-selection-column') ||
              el.closest('.ant-dropdown')
            )
              return;
            openRow(tc);
          },
        })}
        locale={{ emptyText: t('No tests match these filters.') }}
      />

      {visible.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-disabled-text">
            {t('Showing')} {rangeStart}–{rangeEnd} {t('of')} {visible.length}{' '}
            {t('tests')}
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

      {/* one drawer instance; draft vs test is decided by the opened row's
          status — except a pending merge, which always reviews in TestDrawer
          (the draft wizard has no group arranging) */}
      <DraftDrawer
        test={
          openTest?.status === 'draft' && !openTest.pendingMerge
            ? openTest
            : null
        }
        open={openTest?.status === 'draft' && !openTest.pendingMerge}
        onClose={() => setOpenKey(null)}
        onChange={updateTest}
        onRemove={removeTest}
      />
      <TestDrawer
        test={
          openTest && (openTest.status !== 'draft' || openTest.pendingMerge)
            ? openTest
            : null
        }
        open={!!openTest && (openTest.status !== 'draft' || !!openTest.pendingMerge)}
        onCancelMerge={cancelMerge}
        focusSchedule={focusSchedule}
        creating={creating}
        onCreate={() => {
          setCreating(false);
          setOpenKey(null);
          message.success(t('Test created'));
        }}
        onViewRuns={viewRuns}
        onViewRun={viewRun}
        onClose={() => {
          // abandoning creation discards the placeholder test
          if (creating && openKey) removeTest(openKey);
          setCreating(false);
          setOpenKey(null);
          setFocusSchedule(false);
        }}
        onChange={updateTest}
        onRemove={removeTest}
      />
    </div>
  );
}

export default TestsTab;
