import { Button, Modal, Segmented, Select, Tooltip, message } from 'antd';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Images,
  Info,
  Loader,
  Maximize2,
  Minus,
  Network,
  Pause,
  PauseCircle,
  Play,
  RotateCw,
  Server,
  Square,
  Tag as TagIcon,
  Terminal,
  Timer,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { useConfirms } from '../shared/confirms';
import { kaiStore, runStatusIn, useKaiStore } from '../shared/store';
import { ConsoleLog, NetworkRequest, RunData, TestStep } from '../shared/types';
import {
  LiveDuration,
  RESOLUTION_ICON,
  VersionLabel,
  formatDuration,
  regionCountry,
  regionLabel,
  relativeTime,
  resolutionLabel,
} from '../shared/utils';
import { EntityDrawer, Section } from './EntityDrawer';
import NetworkPanel from './NetworkPanel';

interface Props {
  run: RunData | null;
  open: boolean;
  onClose: () => void;
}

// A step is worth a screenshot once it has actually executed.
const hasShot = (s: TestStep) => s.status === 'passed' || s.status === 'failed';

const isNetError = (r: NetworkRequest) => r.status === 0 || r.status >= 400;

/** The quiet mark for "an image belongs here": a muted outline glyph and a caption,
 *  the same grammar as the Environments empty state (production review 07-15 ruled
 *  the ghost illustration off-brand). Small and gray-medium on purpose — it stands in
 *  for a screenshot, so it must not compete with one (Gabriel 08-11). */
function ShotPlaceholder({ caption }: { caption: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Images
        size={22}
        strokeWidth={1.5}
        style={{ color: 'var(--color-gray-medium)', opacity: 0.7 }}
      />
      <span className="text-xs text-disabled-text">{caption}</span>
    </div>
  );
}

function DevEmpty({ text, fill }: { text: string; fill?: boolean }) {
  return (
    <div
      className={`text-sm text-disabled-text text-center border rounded-lg ${
        fill ? 'h-full flex items-center justify-center' : 'py-8'
      }`}
    >
      {text}
    </div>
  );
}

/** Console output captured during the run — mirrors the session console: level icon +
 *  monospace message, time on the right, error rows tinted. */
function ConsoleView({
  logs,
  fill,
  inFlight,
}: {
  logs?: ConsoleLog[];
  fill?: boolean;
  inFlight?: boolean;
}) {
  const { t } = useTranslation();
  if (!logs || logs.length === 0)
    return (
      <DevEmpty
        fill={fill}
        // "nothing captured" is a verdict; while the run is still going the honest
        // line is "nothing yet" (Gabriel 08-11)
        text={
          inFlight
            ? t('Nothing logged yet. Console output appears as the run goes.')
            : t('No console output captured for this run.')
        }
      />
    );
  return (
    <div className="border rounded-lg overflow-hidden font-mono text-xs">
      {logs.map((l, i) => {
        const cfg =
          l.level === 'error'
            ? { color: 'text-red', bg: 'bg-red-lightest', Icon: XCircle }
            : l.level === 'warn'
              ? { color: 'text-orange-dark', bg: '', Icon: TriangleAlert }
              : { color: 'text-gray-dark', bg: '', Icon: Info };
        const LevelIcon = cfg.Icon;
        return (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-1.5 border-b border-neutral-950/5 last:border-b-0 ${cfg.bg}`}
          >
            <LevelIcon size={13} className={`mt-0.5 shrink-0 ${cfg.color}`} />
            <span
              className={`flex-1 whitespace-pre-wrap break-words ${cfg.color}`}
            >
              {l.text}
            </span>
            <span className="text-disabled-text shrink-0">
              {`${(l.time / 1000).toFixed(2)}s`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Step screenshots. A step can capture several screenshots, so a Step Selector picks
 *  the step and the carousel arrows move between that step's screenshots. Opens on the
 *  failed step. When `onExpand` is set the preview is click-to-enlarge. With `fill`
 *  (expand modal) the image letterboxes into the fixed stage and a step filmstrip
 *  rides the bottom — the screenshot never dictates the modal's height. */
function ScreenshotsView({
  run,
  onExpand,
  fill,
  inFlight,
}: {
  run: RunData;
  onExpand?: () => void;
  fill?: boolean;
  inFlight?: boolean;
}) {
  const { t } = useTranslation();
  const shotSteps = run.steps
    .map((step, i) => ({ step, i }))
    .filter(({ step }) => hasShot(step));
  const failedPos = shotSteps.findIndex((s) => s.step.status === 'failed');
  const [stepPos, setStepPos] = useState(failedPos >= 0 ? failedPos : 0);
  const [shotIdx, setShotIdx] = useState(0);

  // A run in flight already has screenshots for the steps it finished, so those show
  // straight away (they used to be withheld until the whole run ended). Only when
  // nothing has been captured yet does this fall back to a placeholder.
  if (shotSteps.length === 0)
    return (
      // the same white bordered line the network and console tabs use — one empty
      // state across Activity, rather than a large gray box on this one tab
      // (Gabriel 08-11)
      <DevEmpty
        fill={fill}
        text={
          inFlight
            ? t('No screenshots yet. They appear as each step completes.')
            : t('No screenshots captured for this run.')
        }
      />
    );

  const cur = shotSteps[Math.min(stepPos, shotSteps.length - 1)];
  const curStep = run.steps[cur.i];
  const failed = curStep.status === 'failed';
  const shotCount = Math.max(1, curStep.shots ?? 1);
  const safeShot = Math.min(shotIdx, shotCount - 1);

  const pickStep = (pos: number) => {
    setStepPos(pos);
    setShotIdx(0);
  };
  const prevShot = () => setShotIdx((safeShot - 1 + shotCount) % shotCount);
  const nextShot = () => setShotIdx((safeShot + 1) % shotCount);

  return (
    <div className={`flex flex-col gap-2 ${fill ? 'h-full min-h-0' : ''}`}>
      {/* Step selector — pick the step; the carousel below holds that step's screenshots */}
      <Select
        size="small"
        value={stepPos}
        onChange={pickStep}
        className="w-full"
        options={shotSteps.map((s, pos) => ({
          value: pos,
          label: (
            <span className="flex items-center gap-1.5 min-w-0">
              {s.step.status === 'failed' && (
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--color-red)' }}
                />
              )}
              <span className="truncate">
                {t('Step')} {s.i + 1} · {s.step.step}
              </span>
            </span>
          ),
        }))}
      />

      {/* Carousel — arrows move between the selected step's screenshots. In the fixed
          modal stage the image letterboxes into the remaining height instead of the
          aspect-ratio box driving the layout. */}
      <div
        className={`group relative w-full rounded-lg border bg-gray-lightest flex items-center justify-center ${
          failed ? 'border-red' : ''
        } ${onExpand ? 'cursor-zoom-in' : ''} ${fill ? 'flex-1 min-h-0' : ''}`}
        style={fill ? undefined : { aspectRatio: '16 / 10' }}
        onClick={onExpand}
        role={onExpand ? 'button' : undefined}
        aria-label={onExpand ? t('Expand screenshot') : undefined}
      >
        {/* floating "Failed" label, top-right — same tint/icon as the result tags */}
        {failed && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium rounded px-1.5 py-0.5"
            style={{
              background: 'rgba(204, 0, 0, 0.1)',
              color: 'var(--color-red)',
            }}
          >
            <XCircle size={12} /> {t('Failed')}
          </span>
        )}
        <ShotPlaceholder
          caption={
            failed
              ? t('Screenshot at failure')
              : `${t('Step')} ${cur.i + 1} · ${t('screenshot')} ${safeShot + 1}`
          }
        />
        {/* explicit image counter, bottom-right — clearly about screenshots, not steps */}
        <span
          className="absolute bottom-2 right-2 text-xs font-medium rounded px-1.5 py-0.5 bg-white/90 border text-gray-dark"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          {t('Screenshot')} {safeShot + 1} {t('of')} {shotCount}
        </span>
        {onExpand && (
          <span className="absolute bottom-2 left-2 w-7 h-7 rounded bg-white/90 border shadow-sm flex items-center justify-center text-gray-dark opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={14} />
          </span>
        )}
        {shotCount > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevShot();
              }}
              aria-label={t('Previous')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextShot();
              }}
              aria-label={t('Next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-sm border flex items-center justify-center hover:bg-gray-lightest"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* Filmstrip (modal only) — one thumb per step, faster than arrow-hopping;
          the failed step is tinted red so it's findable at a glance */}
      {fill && shotSteps.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto py-0.5 shrink-0">
          {shotSteps.map((s, pos) => {
            const active = pos === Math.min(stepPos, shotSteps.length - 1);
            const isFailed = s.step.status === 'failed';
            // selection mirrors the network filter chips: light-blue fill + 1px
            // teal border — no shadow ring (it read heavy and clipped in scroll)
            return (
              <Tooltip
                key={s.i}
                title={`${t('Step')} ${s.i + 1} · ${s.step.step}`}
              >
                <button
                  type="button"
                  onClick={() => pickStep(pos)}
                  aria-label={`${t('Step')} ${s.i + 1}`}
                  className="shrink-0 w-[72px] h-[45px] rounded border flex items-center justify-center text-xs font-medium transition outline-none focus:outline-none"
                  style={{
                    background: isFailed
                      ? 'rgba(204, 0, 0, 0.08)'
                      : active
                        ? 'var(--color-active-blue)'
                        : 'var(--color-gray-lightest)',
                    color: isFailed
                      ? 'var(--color-red)'
                      : active
                        ? 'var(--color-teal)'
                        : 'var(--color-gray-dark)',
                    borderColor: active
                      ? isFailed
                        ? 'var(--color-red)'
                        : 'var(--color-teal)'
                      : isFailed
                        ? 'rgba(204, 0, 0, 0.35)'
                        : 'var(--color-gray-light)',
                  }}
                >
                  {isFailed ? <XCircle size={13} /> : s.i + 1}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}

type DevTab = 'screenshots' | 'network' | 'console';

/** One execution of a test: outcome, a compact meta line, the step list (failed step
 *  shows its error inline), and a tabbed DevTools block — screenshots, network and
 *  console — mirroring what a session shows. Read-only once the run is over; while it
 *  is still in flight the drawer also reports progress and can hold or stop it. */
function RunDrawer({ run, open, onClose }: Props) {
  const { t } = useTranslation();
  const [devTab, setDevTab] = useState<DevTab>('screenshots');
  const [expanded, setExpanded] = useState(false);
  const [modalTab, setModalTab] = useState<DevTab>('screenshots');
  const activityRef = useRef<HTMLDivElement>(null);
  // subscribes to the run-status overlay, so pausing re-renders this drawer (and the
  // Runs table behind it) instead of leaving a stale "Running" band on screen
  const { runStatus: runStatusMap } = useKaiStore();
  const { confirmStopRun } = useConfirms();

  // a per-step "View …" link selects the tab and scrolls the Activity panel into view
  const jumpToActivity = (tab: DevTab) => {
    setDevTab(tab);
    window.setTimeout(
      () =>
        activityRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      0,
    );
  };

  if (!run) return null;

  const openExpanded = (tab: DevTab) => {
    setModalTab(tab);
    setExpanded(true);
  };

  // the run's status as it stands now — the fixture's, unless this run has been
  // paused or stopped since (the Runs table reads the same overlay)
  const status = runStatusIn(runStatusMap, run);
  const running = status === 'running';
  const paused = status === 'paused';
  const inFlight = running || paused;
  const failed = status === 'failed';
  const total = run.steps.length;

  // ONE treatment for every run in flight (Gabriel 08-11). We do not claim per-step
  // results while a run is going: step-level reporting is not something we can count
  // on, so a drawer that showed ticks for one run and skeletons for another would be
  // promising a fidelity the product may not have. What we know is the step list (it
  // comes from the test) and the elapsed time. What we don't is any result — so no
  // "step 3 of 8", no determinate bar, and no per-step spinner.
  const stepsKnown = total > 0;

  const ResIcon = RESOLUTION_ICON[run.resolution ?? 'desktop'];
  const consoleErrors = (run.console ?? []).filter(
    (l) => l.level === 'error',
  ).length;
  const netErrors = (run.network ?? []).filter(isNetError).length;

  const rerun = () =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);

  const pauseRun = () => {
    kaiStore.setRunStatus(run.key, 'paused');
    message.success(t('Run paused'));
  };
  const resumeRun = () => {
    kaiStore.setRunStatus(run.key, 'running');
    message.success(t('Run resumed'));
  };
  // Stopping throws away an execution in progress, so it asks first — through the
  // shared confirm, not a one-off dialog.
  const confirmStop = () =>
    confirmStopRun({
      name: run.testName,
      onOk: () => {
        kaiStore.setRunStatus(run.key, 'failed');
        message.success(t('Run stopped'));
      },
    });

  const renderStep = (step: TestStep, idx: number) => {
    // In flight, every step reads the same regardless of what the run happens to
    // report: the step is known, its result is not. Forced here rather than left to
    // the data so no fixture (or backend that reports more than another) can make one
    // running run look further along than another.
    const status = inFlight ? 'unknown' : step.status;
    const stepFailed = status === 'failed';
    const skipped = status === 'skipped';
    const pending = status === 'pending';
    const notRun = skipped || pending;

    const icon =
      status === 'unknown' ? (
        /* A skeleton of a result, not an empty ring — the ring reads as "did not
           run", which is a different statement (Gabriel 08-11). It pulses only while
           the run is going: a held run waits on the user, not on itself. */
        <span
          className={`block w-[14px] h-[14px] rounded-full bg-gray-light ${
            running ? 'animate-pulse' : ''
          }`}
        />
      ) : pending ? (
        <span className="block w-[14px] h-[14px] rounded-full border border-gray-light" />
      ) : stepFailed ? (
        <XCircle size={15} className="text-red" />
      ) : skipped ? (
        <Minus size={15} className="text-disabled-text" />
      ) : (
        <CheckCircle2 size={15} className="text-green" />
      );

    return (
      <div
        key={idx}
        className="flex items-start gap-2.5 rounded px-1 -mx-1 py-1.5"
      >
        <span className="w-5 h-6 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div
            className={`text-[15px] leading-6 break-words ${
              notRun ? 'text-disabled-text' : ''
            }`}
          >
            {step.step}
            {skipped && <span className="ml-2 text-xs">({t('skipped')})</span>}
          </div>
          {stepFailed && run.error && (
            <div className="mt-1.5 flex flex-col gap-1.5 items-start">
              <div className="text-sm text-red">{run.error}</div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => jumpToActivity('screenshots')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <ImageIcon size={12} /> {t('View screenshot')}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToActivity('console')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <Terminal size={12} /> {t('View console')}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToActivity('network')}
                  className="text-main hover:underline flex items-center gap-1"
                >
                  <Network size={12} /> {t('View network')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Full-width outcome strip: subtle brand tint + coloured icon, dark high-contrast text.
  const bannerCfg = running
    ? {
        bg: 'rgba(97, 95, 255, 0.1)',
        color: 'var(--color-indigo)',
        Icon: Loader,
        spin: true,
      }
    : paused
      ? {
          bg: 'rgba(255, 152, 0, 0.1)',
          color: 'var(--color-orange-dark)',
          Icon: PauseCircle,
        }
      : failed
        ? {
            bg: 'rgba(204, 0, 0, 0.08)',
            color: 'var(--color-red)',
            Icon: XCircle,
          }
        : {
            bg: 'rgba(66, 174, 94, 0.1)',
            color: 'var(--color-green-dark)',
            Icon: CheckCircle2,
          };
  const BannerIcon = bannerCfg.Icon;
  // Status strip + meta line, both always visible (Jul 1 review: run info shows
  // directly — nothing tucked behind a "More" toggle).
  const banner = (
    <>
      <div
        className="px-5 py-3 border-b flex items-center gap-2 text-sm font-medium text-gray-darkest"
        style={{ background: bannerCfg.bg }}
      >
        <BannerIcon
          size={16}
          className={`shrink-0 ${bannerCfg.spin ? 'animate-spin' : ''}`}
          style={{ color: bannerCfg.color }}
        />
        {inFlight ? (
          <span>{running ? t('Running') : t('Paused')}</span>
        ) : failed ? (
          <span>
            {t('Failed at step')} {(run.failedStep ?? 0) + 1} {t('of')} {total}
          </span>
        ) : (
          <span>
            {t('Passed')} · {total} {t('steps')}
          </span>
        )}
      </div>
      {/* Activity rail — 2px, no label, sitting directly under the status strip so it
          reads as part of it. Never a percentage: without per-step results there is no
          honest fraction to fill, so it says "alive" and nothing more. It pulses while
          running and holds still while paused. */}
      {inFlight && (
        <div className="h-0.5 bg-gray-light relative overflow-hidden">
          <div
            className={`h-full w-full ${running ? 'animate-pulse' : ''}`}
            style={{
              background: paused
                ? 'var(--color-orange-dark)'
                : 'var(--color-indigo)',
              opacity: 0.45,
            }}
          />
        </div>
      )}
      <div className="px-5 py-3 border-b bg-white flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-disabled-text">
        <Tooltip title={formatDateTimeDefault(run.date)}>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {relativeTime(run.date)}
          </span>
        </Tooltip>
        {/* elapsed, ticking, for a run still going — the one number you actually
              want while waiting. Held runs freeze it instead of climbing. */}
        <Tooltip title={inFlight ? t('Elapsed') : undefined}>
          <span className="flex items-center gap-1.5">
            <Timer size={14} />{' '}
            {inFlight ? (
              <LiveDuration start={run.date} frozen={paused} />
            ) : run.duration ? (
              formatDuration(run.duration)
            ) : (
              '—'
            )}
          </span>
        </Tooltip>
        <span className="flex items-center gap-1.5">
          <Server size={14} /> {run.envName ?? '—'}
        </span>
        <span className="flex items-center gap-1.5">
          <ResIcon size={14} /> {resolutionLabel(run.resolution)}
        </span>
        <span className="flex items-center gap-1.5">
          <CountryFlagIcon
            countryCode={regionCountry(run.region)}
            style={{ width: 16, borderRadius: 2 }}
          />{' '}
          {regionLabel(run.region)}
        </span>
        {run.tags && run.tags.length > 0 && (
          <Tooltip title={run.tags.join(', ')}>
            <span className="flex items-center gap-1.5 cursor-default">
              <TagIcon size={14} /> {run.tags.length}{' '}
              {run.tags.length === 1 ? t('tag') : t('tags')}
            </span>
          </Tooltip>
        )}
      </div>
    </>
  );

  // count chip shown on the Network / Console tab labels when there are failures
  const tabCount = (n: number) =>
    n > 0 ? <span className="ml-1.5 text-red font-medium">{n}</span> : null;

  // passed runs capture no network/console — those tabs are disabled (not hidden,
  // so nothing "pops up" between runs), with the reason on hover. A run in flight
  // keeps them enabled: its outcome isn't known yet, so there is nothing to rule out.
  const passed = status === 'passed';
  const disabledHint = (label: React.ReactNode) =>
    passed ? (
      <Tooltip title={t('Not captured, this run passed.')}>{label}</Tooltip>
    ) : (
      label
    );

  // shared by the inline tabs and the expanded modal so they stay in lockstep
  const devOptions = [
    {
      value: 'screenshots',
      label: (
        <span className="flex items-center justify-center gap-1.5 py-0.5">
          <Images size={14} /> {t('Screenshots')}
        </span>
      ),
    },
    {
      value: 'network',
      disabled: passed,
      label: disabledHint(
        <span className="flex items-center justify-center gap-1.5 py-0.5">
          <Network size={14} /> {t('Network')}
          {tabCount(netErrors)}
        </span>,
      ),
    },
    {
      value: 'console',
      disabled: passed,
      label: disabledHint(
        <span className="flex items-center justify-center gap-1.5 py-0.5">
          <Terminal size={14} /> {t('Console')}
          {tabCount(consoleErrors)}
        </span>,
      ),
    },
  ];

  return (
    <EntityDrawer
      type="run"
      open={open}
      onClose={onClose}
      title={run.testName}
      eyebrow="Run"
      headerActions={
        /* An in-flight run gets the controls it was missing entirely: hold it, or
           give up on it. Finished runs keep Rerun. Only one filled button either
           way, so the header never carries two accents. */
        inFlight ? (
          <div className="flex items-center gap-2">
            {running ? (
              <Button
                size="small"
                icon={<Pause size={13} />}
                onClick={pauseRun}
              >
                {t('Pause')}
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<Play size={13} />}
                onClick={resumeRun}
              >
                {t('Resume')}
              </Button>
            )}
            <Tooltip title={t('Stop this run for good')}>
              <Button
                type="text"
                size="small"
                danger
                icon={<Square size={13} />}
                onClick={confirmStop}
              >
                {t('Stop')}
              </Button>
            </Tooltip>
          </div>
        ) : (
          <Button
            type="primary"
            size="small"
            icon={<RotateCw size={13} />}
            onClick={rerun}
          >
            {t('Rerun')}
          </Button>
        )
      }
    >
      {banner}

      <Section
        title={
          // which step version this run executed — same chip as the tests table
          <span className="flex items-center gap-1.5">
            {t('Steps')}
            {/* the count is the test's step count, which is known even in flight —
                it is the results that aren't, so no "3/8 done" here */}
            {stepsKnown && (
              <>
                <span className="text-gray-medium font-normal">·</span>
                {total}
              </>
            )}
            <VersionLabel version={run.version} always />
          </span>
        }
      >
        {/* bounded like the test drawer — Activity stays reachable on long runs */}
        <div className="flex flex-col max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
          {stepsKnown ? (
            run.steps.map((step, idx) => renderStep(step, idx))
          ) : (
            /* Only reached when the run truly carries no steps. A run in flight does
               not land here: its steps come from the test, so they are listed with
               skeleton result markers instead (Gabriel 08-11). */
            <DevEmpty text={t('This run recorded no steps.')} />
          )}
        </div>
      </Section>

      {/* DevTools — the same things you'd check on a session: screenshots, network,
          console. One tab at a time so the drawer stays readable; expand for room. */}
      <div ref={activityRef} />
      <Section
        title={t('Activity')}
        action={
          <Tooltip title={t('Expand')}>
            <Button
              type="text"
              size="small"
              icon={<Maximize2 size={15} />}
              aria-label={t('Expand')}
              onClick={() => openExpanded(devTab)}
            />
          </Tooltip>
        }
      >
        <Segmented
          block
          size="small"
          value={devTab}
          onChange={(v) => setDevTab(v as DevTab)}
          options={devOptions}
        />
        <div className="mt-3">
          {devTab === 'screenshots' && (
            <ScreenshotsView
              run={run}
              inFlight={inFlight}
              onExpand={() => openExpanded('screenshots')}
            />
          )}
          {devTab === 'network' && (
            <NetworkPanel
              reqs={run.network}
              startedAt={run.date}
              inFlight={inFlight}
            />
          )}
          {devTab === 'console' && (
            <ConsoleView logs={run.console} inFlight={inFlight} />
          )}
        </div>
      </Section>

      {/* Expanded view — same three tabs, with room for the screenshot + network table */}
      <Modal
        open={expanded}
        onCancel={() => setExpanded(false)}
        footer={null}
        title={
          <div className="flex flex-col gap-0.5 pr-6">
            <span className="text-xs font-medium uppercase tracking-wide text-disabled-text">
              {t('Run activity')}
            </span>
            <span className="text-base font-semibold text-black leading-tight">
              {run.testName}
            </span>
          </div>
        }
        width={920}
        centered
      >
        <div className="flex flex-col gap-3 pt-1">
          <Segmented
            block
            size="small"
            value={modalTab}
            onChange={(v) => setModalTab(v as DevTab)}
            options={devOptions}
          />
          {/* fixed stage — every tab renders inside the same height, so switching
              tabs (or an empty console) never resizes the modal (Jul 1 review) */}
          <div className="h-[60vh] min-h-[420px]">
            {modalTab === 'screenshots' && (
              <ScreenshotsView run={run} fill inFlight={inFlight} />
            )}
            {modalTab === 'network' && (
              <NetworkPanel
                reqs={run.network}
                startedAt={run.date}
                fillHeight
                inFlight={inFlight}
              />
            )}
            {modalTab === 'console' && (
              <div className="h-full overflow-y-auto">
                <ConsoleView logs={run.console} fill inFlight={inFlight} />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </EntityDrawer>
  );
}

export default RunDrawer;
