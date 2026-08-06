import { Button, Dropdown, Tooltip, message } from 'antd';
import {
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MoveRight,
  Pause,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirms } from '../shared/confirms';
import { MOCK_RUNS } from '../shared/mockData';
import {
  StepItem,
  applyRevision,
  buildReviewItems,
  keepCurrentVersion,
  resolveItems,
  stepHistory,
  testVersion,
} from '../shared/revisions';
import { hasNoEnvironment, useKaiStore } from '../shared/store';
import { RunData, TestCase } from '../shared/types';
import {
  VersionLabel,
  formatDuration,
  isScheduled,
  relativeTime,
} from '../shared/utils';
import EditableSteps from './EditableSteps';
import { EntityDrawer, Section, TagEditor } from './EntityDrawer';
import RunSettingsFields, { RunSettings } from './RunSettingsFields';

const versionDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

interface Props {
  test: TestCase | null;
  open: boolean;
  /** open scrolled to the run settings / schedule (from the "Schedule" action) */
  focusSchedule?: boolean;
  onClose: () => void;
  onChange: (updated: TestCase) => void;
  onRemove: (key: string) => void;
  /** "View all runs" — jump to the Runs tab filtered to this test */
  onViewRuns?: (tc: TestCase) => void;
  /** "View" on the last-failed-run row — open that exact run in the Runs tab */
  onViewRun?: (run: RunData) => void;
  /** creation mode: footer "Create test" instead of header run controls */
  creating?: boolean;
  onCreate?: () => void;
  /** Cancel merge — the list restores the absorbed tests (TestsTab owns them) */
  onCancelMerge?: (tc: TestCase) => void;
}

/** A live, approved test. Single-column control panel. Save is the drawer's PRIMARY
 *  action (Mehdi 07-20) — plain edits (title, steps, run settings, tags) buffer
 *  locally and commit on Save; Run now rides second in the footer and commits
 *  pending edits before running. Pause/Resume stays an immediate header control.
 *  Special modes (creating, merge review, revision review, old-version view) keep
 *  their own commit actions and don't buffer. Statuses: approved (no schedule) ·
 *  active (scheduled) · paused. A schedule activates the test; clearing it returns
 *  to approved — resolved when the buffer saves. */
function TestDrawer({
  test,
  open,
  focusSchedule,
  onClose,
  onChange,
  onRemove,
  onViewRuns,
  onViewRun,
  creating,
  onCreate,
  onCancelMerge,
}: Props) {
  const { t } = useTranslation();
  const { confirmDelete, confirmDiscard } = useConfirms();
  const settingsRef = useRef<HTMLDivElement>(null);
  // Settings → "Pause tests on new revisions": decides whether a pending revision
  // pauses the test (Needs review status, run controls off) or it keeps running
  const { pauseOnRevision } = useKaiStore();

  // review state: the proposal materialised as a live, fully-editable step list
  // (plain rows + marked add/remove rows) — rebuilt when another test or another
  // revision opens. Edits during a review land here, not on test.steps.
  const [reviewItems, setReviewItems] = useState<StepItem[] | null>(null);
  // version switcher: non-null = viewing an older read-only snapshot
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  // merge review: the SAME EditableSteps list, with each source test's steps
  // under a draggable group label — full editing (add/remove/rename/drag)
  // stays available; the labels drop away when the merge is accepted
  const [mergeItems, setMergeItems] = useState<StepItem[] | null>(null);
  // the Save-primary buffer: plain edits land here and commit on Save (null =
  // no pending edits, render the live test)
  const [pending, setPending] = useState<TestCase | null>(null);
  useEffect(() => {
    setPending(null);
    setReviewItems(
      test?.pendingRevision
        ? buildReviewItems(test.steps, test.pendingRevision.changes)
        : null,
    );
    setViewVersion(null);
    setMergeItems(
      test?.pendingMerge
        ? test.pendingMerge.groups.flatMap((g) => [
            { text: g.title, kind: 'group' as const },
            ...g.steps.map((text) => ({ text })),
          ])
        : null,
    );
  }, [test?.key, test?.pendingRevision, test?.pendingMerge]);

  // jump to the schedule when opened via the Schedule action
  useEffect(() => {
    if (open && focusSchedule && settingsRef.current) {
      const el = settingsRef.current;
      const id = window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('kai-flash');
        window.setTimeout(() => el.classList.remove('kai-flash'), 1200);
      }, 250);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, focusSchedule]);

  if (!test) return null;

  const revision = test.pendingRevision;
  const merge = test.pendingMerge;
  // plain editing buffers; the special modes commit through their own actions
  const buffered = !creating && !merge && !revision && viewVersion == null;
  // what the drawer renders: pending edits when they exist, the live test otherwise
  const view = pending && buffered ? pending : test;
  const paused = view.status === 'paused';
  const version = testVersion(test);
  const history = test.history ?? [];
  const viewedSnapshot =
    viewVersion != null
      ? history.find((h) => h.version === viewVersion)
      : undefined;

  // ---- pending revision (needs review) ---------------------------------
  // the per-line ✓/✕ pair: clicking a side decides the suggestion; clicking the
  // same side again un-decides it — every click gives feedback
  const decideChange = (idx: number, decision: 'accepted' | 'rejected') =>
    setReviewItems(
      (prev) =>
        prev &&
        prev.map((it, i) =>
          i === idx
            ? { ...it, decision: it.decision === decision ? undefined : decision }
            : it,
        ),
    );
  // review progress next to Steps · v1 → v2 — undecided suggestions apply on save
  const changedCount = reviewItems?.filter((it) => it.kind).length ?? 0;
  const decidedCount =
    reviewItems?.filter((it) => it.kind && it.decision).length ?? 0;
  const allAccepted =
    changedCount > 0 &&
    (reviewItems?.every((it) => !it.kind || it.decision === 'accepted') ??
      false);
  const acceptAll = () =>
    setReviewItems(
      (prev) =>
        prev &&
        prev.map((it) => (it.kind ? { ...it, decision: 'accepted' } : it)),
    );
  const reviewSummary =
    changedCount > 0 ? (
      <span className="flex items-center gap-2">
        <span className="text-sm text-disabled-text">
          {decidedCount > 0
            ? `${decidedCount} ${t('of')} ${changedCount} ${t('reviewed')}`
            : `${changedCount} ${changedCount === 1 ? t('change') : t('changes')}`}
        </span>
        <Button
          size="small"
          type="text"
          disabled={allAccepted}
          icon={<CheckCheck size={14} />}
          onClick={acceptAll}
        >
          {t('Accept all')}
        </Button>
      </span>
    ) : undefined;
  // finishing a review closes the drawer — the test is active and scheduled again,
  // and a lingering primary "Run now" would read like a required next step
  const saveRevision = () => {
    if (!revision || !reviewItems) return;
    onChange(applyRevision(test, resolveItems(reviewItems), Date.now()));
    message.success(
      pauseOnRevision && test.status === 'active'
        ? t('Saved as v{{v}} — schedule resumed', { v: revision.toVersion })
        : t('Saved as v{{v}}', { v: revision.toVersion }),
    );
    onClose();
  };
  const keepVersion = () => {
    if (!revision) return;
    onChange(keepCurrentVersion(test));
    message.success(t('Kept v{{v}}', { v: version }));
    onClose();
  };

  // ---- pending merge (Mehdi 07-13) --------------------------------------
  // accepting flattens the arranged groups into ONE plain step list and bumps
  // the version (old steps snapshot into history, like a revision). Status:
  // a previously-ACTIVE test stays paused — resuming a freshly combined test
  // is a deliberate act, not a side effect; approved/draft return as they were.
  const mergedSteps =
    mergeItems?.filter((it) => it.kind !== 'group' && it.text.trim()) ?? [];
  const mergedStepCount = mergedSteps.length;
  const mergedGroupCount =
    mergeItems?.filter((it) => it.kind === 'group').length ?? 0;
  const acceptMerge = () => {
    if (!merge || !mergeItems) return;
    const steps = mergedSteps.map((it) => it.text);
    onChange({
      ...test,
      steps,
      status: merge.prevStatus === 'active' ? 'paused' : merge.prevStatus,
      pendingMerge: undefined,
      version: version + 1,
      history: [
        ...(test.history ?? []),
        { version, savedAt: Date.now(), steps: test.steps },
      ],
    });
    message.success(
      merge.prevStatus === 'active'
        ? t('Combined into {{n}} steps (v{{v}}) — resume when ready', {
            n: steps.length,
            v: version + 1,
          })
        : t('Combined into {{n}} steps (v{{v}})', {
            n: steps.length,
            v: version + 1,
          }),
    );
    onClose();
  };
  const cancelMerge = () => {
    onCancelMerge?.(test);
    onClose();
  };

  // ---- version switcher (older versions are read-only history) ---------
  const versionMenu = {
    items: [
      {
        key: String(version),
        label: `v${version} · ${t('Current')}`,
      },
      ...[...history]
        .sort((a, b) => b.version - a.version)
        .map((h) => ({
          key: String(h.version),
          label: `v${h.version} · ${versionDate(h.savedAt)}`,
        })),
    ],
    selectedKeys: [String(viewVersion ?? version)],
    onClick: ({ key }: { key: string }) => {
      // switching versions leaves plain-edit mode — drop any pending edits
      setPending(null);
      setViewVersion(Number(key) === version ? null : Number(key));
    },
  };
  // the version chip + dropdown next to the Steps title — only once v2 exists
  const versionSwitcher =
    history.length > 0 ? (
      <Dropdown menu={versionMenu} trigger={['click']} placement="bottomRight">
        <button
          type="button"
          aria-label={t('Switch version')}
          className="flex items-center gap-1 text-sm text-gray-dark border rounded px-2 py-0.5 hover:bg-gray-lightest"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          v{viewVersion ?? version}
          <ChevronDown size={13} className="text-gray-medium" />
        </button>
      </Dropdown>
    ) : undefined;
  // a paused test with no environment can't resume until one is set below
  const resumeBlocked = paused && hasNoEnvironment(test);
  // viewing an older version scopes the runs to it too — runs from before the
  // bump belong to that version's story (no version recorded = v1)
  const runs = MOCK_RUNS.filter(
    (r) =>
      r.testName === test.title &&
      (viewVersion == null || (r.version ?? 1) === viewVersion),
  );
  // trend: the last 10 completed runs, oldest → newest (newest on the right)
  const trend = runs
    .filter((r) => r.status !== 'running')
    .sort((a, b) => a.date - b.date)
    .slice(-10);
  const settings: RunSettings = {
    envNames: view.envNames,
    resolutions: view.resolutions,
    regions: view.regions,
    schedule: view.schedule,
  };

  // plain edits buffer until Save (Mehdi 07-20); special modes stay live. A
  // schedule still activates the test, clearing it drops it back to approved —
  // resolved in the buffer, committed on Save.
  const edit = (p: Partial<TestCase>) =>
    buffered ? setPending({ ...view, ...p }) : onChange({ ...test, ...p });
  const patch = (p: Partial<RunSettings>) => {
    const next: TestCase = { ...view, ...p };
    if ('schedule' in p) next.status = isScheduled(p.schedule) ? 'active' : 'approved';
    if (buffered) setPending(next);
    else onChange(next);
  };

  const dirty =
    pending != null && buffered && JSON.stringify(pending) !== JSON.stringify(test);
  const save = () => {
    if (dirty) onChange(pending!);
    setPending(null);
    message.success(t('Saved'));
    onClose();
  };
  // Run now commits pending edits first — running an unsaved state would lie
  // about what actually ran
  const runNow = () => {
    if (dirty) {
      onChange(pending!);
      setPending(null);
    }
    message.success(`${view.title} — ${t('run started, see Runs')}`);
  };
  // Pause/Resume stays immediate (it's a state control, not an edit); a live
  // buffer follows along so Save doesn't undo the toggle
  const togglePause = () => {
    const status = paused ? 'active' : 'paused';
    onChange({ ...test, status });
    if (pending) setPending({ ...pending, status });
  };
  // closing with unsaved edits asks — silent discard reads as data loss
  const handleDrawerClose = () => {
    if (dirty) {
      confirmDiscard(() => {
        setPending(null);
        onClose();
      });
      return;
    }
    setPending(null);
    onClose();
  };
  const remove = () => {
    onRemove(test.key);
    onClose();
  };

  return (
    <EntityDrawer
      type="test"
      open={open}
      onClose={handleDrawerClose}
      title={view.title}
      onTitleChange={(title) => edit({ title })}
      autoEditTitle={creating}
      eyebrow={
        creating
          ? `${t('Test')} · ${t('New')}`
          : merge
            ? `${t('Test')} · ${t('Merge review')}`
            : revision && pauseOnRevision
              ? `${t('Test')} · ${t('Needs review')}`
              : `${t('Test')} · ${
                  paused
                    ? t('Paused')
                    : view.status === 'approved'
                      ? t('Approved')
                      : t('Active')
                }${version > 1 ? ` · v${version}` : ''}${
                  revision ? ` · ${t('Needs review')}` : ''
                }`
      }
      headerActions={
        // Run now left the header for the footer's secondary slot (Mehdi 07-20:
        // Save is the primary action). Pause/Resume stays here — an immediate
        // state control, quiet (no primary in the header, one accent per view).
        // Merge/revision reviews suspend runs; the eyebrow already says so.
        creating || merge || revision || view.status === 'approved' ? undefined : (
          <Tooltip
            title={
              resumeBlocked
                ? t('Set an environment below to resume this test.')
                : undefined
            }
          >
            <Button
              size="small"
              disabled={resumeBlocked}
              icon={paused ? <Play size={13} /> : <Pause size={13} />}
              onClick={togglePause}
            >
              {paused ? t('Resume') : t('Pause')}
            </Button>
          </Tooltip>
        )
      }
      footer={
        creating ? (
          // creation flow: commit action lives in the footer, like the draft workflow
          <div className="flex items-center justify-between">
            <Button type="text" onClick={onClose}>
              {t('Discard')}
            </Button>
            <Button type="primary" icon={<Check size={15} />} onClick={onCreate}>
              {t('Create test')}
            </Button>
          </div>
        ) : merge ? (
          // merge review: cancel restores the absorbed tests; accepting
          // flattens the groups in their arranged order
          <div className="flex items-center justify-between">
            <Button type="text" onClick={cancelMerge}>
              {t('Cancel merge')}
            </Button>
            <Button
              type="primary"
              icon={<Check size={15} />}
              onClick={acceptMerge}
            >
              {t('Combine {{n}} steps', { n: mergedStepCount })}
            </Button>
          </div>
        ) : revision ? (
          // reviewing: stay on the current version, or save the reviewed one
          <div className="flex items-center justify-between">
            <Button type="text" onClick={keepVersion}>
              {t('Keep v{{v}}', { v: version })}
            </Button>
            <Button
              type="primary"
              icon={<Check size={15} />}
              onClick={saveRevision}
            >
              {t('Save v{{v}}', { v: revision.toVersion })}
            </Button>
          </div>
        ) : (
          // Save is the primary action (Mehdi 07-20; there was no Save before) —
          // Run now rides second and commits pending edits before running
          <div className="flex items-center justify-between">
            <Button
              type="text"
              danger
              icon={<Trash2 size={15} />}
              onClick={() =>
                confirmDelete({ what: t('test'), name: view.title, onOk: remove })
              }
            >
              {t('Delete test')}
            </Button>
            <div className="flex items-center gap-2">
              <Tooltip
                title={dirty ? t('Saves your changes, then runs') : undefined}
              >
                <Button icon={<Play size={15} />} onClick={runNow}>
                  {t('Run now')}
                </Button>
              </Tooltip>
              <Button type="primary" icon={<Check size={15} />} onClick={save}>
                {t('Save')}
              </Button>
            </div>
          </div>
        )
      }
    >
      {/* the steps section wears three hats: reviewing a proposed version (the same
          fully-editable list, with the proposal's add/remove rows dressed as a
          diff), viewing an older snapshot (read-only), or plain editing */}
      {merge && mergeItems ? (
        // the regular steps editor, group labels included — dragging a label
        // moves its whole block; steps edit/insert/delete/drag as always
        <EditableSteps
          steps={[]}
          bounded
          title={`${t('Steps')} · ${t('merge review')}`}
          headerAction={
            <span className="text-sm text-disabled-text">
              {mergedGroupCount} {t('groups')} · {mergedStepCount} {t('steps')}
            </span>
          }
          reviewItems={mergeItems}
          onItemsChange={setMergeItems}
          onStepsChange={() => {}}
        />
      ) : revision && reviewItems ? (
        <EditableSteps
          steps={[]}
          bounded
          title={
            // same version chips as the table's title label, gray arrow between
            <span className="flex items-center gap-1.5">
              {t('Steps')}
              <span className="text-gray-medium font-normal">·</span>
              <VersionLabel version={version} always />
              <MoveRight size={15} className="text-gray-medium" />
              <VersionLabel version={revision.toVersion} always />
            </span>
          }
          headerAction={reviewSummary}
          reviewItems={reviewItems}
          onItemsChange={setReviewItems}
          onDecide={decideChange}
          onStepsChange={() => {}}
        />
      ) : viewedSnapshot ? (
        <Section
          title={
            // an approved version is history — read-only, no way back; the version
            // dropdown already names it (no chip), the rest fits the title line.
            <span className="flex items-center gap-1.5">
              {`${t('Steps')} · ${viewedSnapshot.steps.length}`}
              <span className="text-sm text-disabled-text font-normal">
                {t('saved {{date}} · read-only', {
                  date: versionDate(viewedSnapshot.savedAt),
                })}
              </span>
            </span>
          }
          action={versionSwitcher}
        >
          <div className="flex flex-col max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
            {viewedSnapshot.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5"
              >
                <span className="w-5 h-6 flex items-center justify-center shrink-0 leading-6 text-sm text-disabled-text">
                  {idx + 1}
                </span>
                <span className="flex-1 text-[15px] leading-6 break-words text-gray-dark">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        /* bounded: run settings / tags / runs stay reachable even with 50 steps */
        <EditableSteps
          steps={view.steps}
          bounded
          headerAction={versionSwitcher}
          historyFor={history.length > 0 ? (idx) => stepHistory(test, idx) : undefined}
          onStepsChange={(steps) => edit({ steps })}
        />
      )}

      <div ref={settingsRef}>
        <Section title={t('Run settings')}>
          {view.status === 'approved' && (
            <div className="-mt-1 mb-3 text-sm text-disabled-text">
              {t(
                'Not scheduled — this test runs manually until you set a schedule below.',
              )}
            </div>
          )}
          <RunSettingsFields value={settings} onChange={patch} />
        </Section>
      </div>

      {/* compact — the hint rides the header so tags stay a single row */}
      <Section
        title={t('Tags')}
        className="py-3!"
        action={
          <span className="text-sm text-disabled-text">
            {t('Up to 3 tags')}
          </span>
        }
      >
        <TagEditor
          value={view.tags}
          onChange={(tags) => edit({ tags })}
        />
      </Section>

      {/* Runs: just the "last 10" trend strip inline with the section title
          (glanceable pattern — always-red / just-started-failing / healthy).
          Each icon is one run: hover for result · duration · when, click to open
          that exact run's drawer; the trailing chevron opens the full filtered list. */}
      {(onViewRuns || onViewRun) && !creating && (
        <Section
          title={t('Runs')}
          className="py-3!"
          action={
            runs.length > 0 ? (
              <span className="flex items-center gap-1.5">
                {trend.map((r) => {
                  const failed = r.status === 'failed';
                  // same icons as the Failed/Passed pill everywhere else (getRunResult)
                  // — a custom heavier-stroke circle here read inconsistent next to it
                  const Icon = failed ? XCircle : CheckCircle2;
                  const info = [
                    failed ? t('Failed') : t('Passed'),
                    r.duration != null ? formatDuration(r.duration) : null,
                    relativeTime(r.date),
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Tooltip key={r.key} title={info}>
                      <button
                        type="button"
                        onClick={() => onViewRun?.(r)}
                        aria-label={`${info} — ${t('View run')}`}
                        className="flex items-center shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <Icon
                          size={14}
                          className={failed ? 'text-red' : 'text-green'}
                        />
                      </button>
                    </Tooltip>
                  );
                })}
                {onViewRuns && (
                  <Tooltip
                    title={t('View all {{count}} runs', { count: runs.length })}
                  >
                    <button
                      type="button"
                      onClick={() => onViewRuns(test)}
                      aria-label={t('View all runs')}
                      className="text-disabled-text hover:text-main transition-colors shrink-0 flex items-center"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </Tooltip>
                )}
              </span>
            ) : undefined
          }
        >
          {runs.length === 0 ? (
            <div className="text-sm text-disabled-text">
              {viewVersion != null
                ? t('No runs on v{{v}}.', { v: viewVersion })
                : t('No runs yet — run now or set a schedule above.')}
            </div>
          ) : null}
        </Section>
      )}
    </EntityDrawer>
  );
}

export default TestDrawer;
