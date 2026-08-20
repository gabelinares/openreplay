/* Shared chrome for the replay players.
 *
 * `ReplayHeaderBar` owns the layout; everything else fills one of its slots.
 * Session replay, Spot and issue replay compose these and supply only data, so
 * the three cannot drift apart without someone deliberately editing an atom
 * here — which is the point, and the rule in frontend/CLAUDE.md: a lookalike
 * rebuilt inline is a bug even when it renders identically today.
 *
 * Plan: context/player-makeup-plan-2026-08-20.md
 * Parked full unification, and what this pass does NOT fix: BACKLOG.md §18
 */
export {
  default as ReplayHeaderBar,
  REPLAY_HEADER_HEIGHT,
} from './ReplayHeaderBar';
export { default as ReplayBackButton } from './ReplayBackButton';
export { default as ReplayDivider } from './ReplayDivider';
export { default as ReplayIconButton } from './ReplayIconButton';
export { default as ReplayIdentity } from './ReplayIdentity';
export { default as ReplayActionCluster } from './ReplayActionCluster';
export { default as ReplayQueueControls } from './ReplayQueueControls';
export { default as ReplayTabStrip } from './ReplayTabStrip';
export { default as ReplayBrowserTabs } from './ReplayBrowserTabs';
export {
  default as ReplayLocationBar,
  hasMultipleTabs,
} from './ReplayLocationBar';
export { default as ReplayMoreDetails } from './ReplayMoreDetails';
