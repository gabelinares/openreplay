import { useSyncExternalStore } from 'react';

import { MOCK_ENVIRONMENTS, MOCK_TEST_CASES } from './mockData';
import {
  Environment,
  RunData,
  RunDefaults,
  RunStatus,
  TestCase,
} from './types';

export type KaiTab = 'tests' | 'runs' | 'settings';

// Tests and environments live here (module-level, in-memory — mock data) rather than
// inside their tabs, because they interact across tabs: deleting an environment in
// Settings has to pause tests in the Tests tab, and a test's "View runs" shortcut has
// to switch to the Runs tab pre-filtered.
interface KaiState {
  tests: TestCase[];
  environments: Environment[];
  // Settings → Default run configuration; pre-fills new drafts / manual tests
  defaults: RunDefaults;
  // Settings → pause tests while a new step revision waits for review (all tests,
  // Mehdi 07-06). Off = they keep running on the current version until reviewed.
  pauseOnRevision: boolean;
  activeTab: KaiTab;
  // one-shot handoffs: set by the test drawer's "View all runs" / "View" (on the last
  // failed run), consumed by RunsTab
  runsTestFilter: string | null;
  runsOpenRunKey: string | null;
  // search queries live here (not in the tabs) because the search input renders in
  // the page's main tab bar (index.tsx) and targets whichever tab is active
  testsQuery: string;
  runsQuery: string;
  // Pausing / stopping an in-flight run, keyed by run key. MOCK_RUNS is a frozen
  // fixture, so the new status lives here as an overlay — and it has to be shared
  // rather than local to the drawer, or the Runs table would still say "Running"
  // for a run you just paused in front of it.
  runStatus: Record<string, RunStatus>;
}

let state: KaiState = {
  tests: MOCK_TEST_CASES,
  environments: MOCK_ENVIRONMENTS,
  defaults: {
    envName: MOCK_ENVIRONMENTS[0]?.name,
    resolution: 'desktop',
    region: 'paris',
  },
  pauseOnRevision: true,
  activeTab: 'tests',
  runsTestFilter: null,
  runsOpenRunKey: null,
  testsQuery: '',
  runsQuery: '',
  runStatus: {},
};

const listeners = new Set<() => void>();

const set = (patch: Partial<KaiState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const kaiStore = {
  get: (): KaiState => state,
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  setTests: (updater: (prev: TestCase[]) => TestCase[]) =>
    set({ tests: updater(state.tests) }),
  setEnvironments: (updater: (prev: Environment[]) => Environment[]) =>
    set({ environments: updater(state.environments) }),
  setDefaults: (patch: Partial<RunDefaults>) =>
    set({ defaults: { ...state.defaults, ...patch } }),
  setPauseOnRevision: (pauseOnRevision: boolean) => set({ pauseOnRevision }),

  setActiveTab: (activeTab: KaiTab) => set({ activeTab }),
  setTestsQuery: (testsQuery: string) => set({ testsQuery }),
  setRunsQuery: (runsQuery: string) => set({ runsQuery }),
  /** "View all runs" on a test — jump to the Runs tab filtered to that test. */
  showRunsForTest: (testName: string) =>
    set({ activeTab: 'runs', runsTestFilter: testName }),
  clearRunsTestFilter: () => set({ runsTestFilter: null }),
  /** "View" on the last-failed-run row — jump to the Runs tab, filtered to that test,
   *  with that exact run's drawer already open. */
  openRunInRunsTab: (run: RunData) =>
    set({
      activeTab: 'runs',
      runsTestFilter: run.testName,
      runsOpenRunKey: run.key,
    }),
  clearRunsOpenRunKey: () => set({ runsOpenRunKey: null }),

  /** Hold, resume or abandon one in-flight run. Stopping is terminal: the run keeps
   *  whatever it managed to execute and reads as failed, because a run that never
   *  reached its last step did not pass. */
  setRunStatus: (key: string, status: RunStatus) =>
    set({ runStatus: { ...state.runStatus, [key]: status } }),

  /** Deleting an environment detaches it from every test. A test left with no
   *  environment at all reads "Not set" — and if it was active, it pauses (there is
   *  nothing to run against) until an environment is set again. Tests that still have
   *  other environments just drop this one and keep running. */
  deleteEnvironment: (env: Environment) => {
    const tests = state.tests.map((tc) => {
      if (!tc.envNames?.includes(env.name)) return tc;
      const envNames = tc.envNames.filter((n) => n !== env.name);
      const next: TestCase = { ...tc, envNames };
      if (envNames.length === 0 && tc.status === 'active')
        next.status = 'paused';
      return next;
    });
    set({
      tests,
      environments: state.environments.filter((e) => e.id !== env.id),
      // it can't stay the default either
      defaults:
        state.defaults.envName === env.name
          ? { ...state.defaults, envName: undefined }
          : state.defaults,
    });
  },
};

/** A run's status as it stands now: the fixture's status unless the user has paused,
 *  resumed or stopped this run since. Read this instead of `run.status` anywhere the
 *  run's state is shown, so the table, the drawer and the test's run history agree.
 *
 *  Takes the map rather than reading module state, so every caller gets it from
 *  `useKaiStore()` and re-renders when a run is paused — a helper that read `state`
 *  directly would go stale on screen. */
export const runStatusIn = (
  map: Record<string, RunStatus>,
  run: RunData,
): RunStatus => map[run.key] ?? run.status;

/** A test with no environment can't run — gates Resume until one is set. */
export const hasNoEnvironment = (tc: TestCase): boolean =>
  !tc.envNames || tc.envNames.length === 0;

export function useKaiStore(): KaiState {
  return useSyncExternalStore(kaiStore.subscribe, kaiStore.get);
}
