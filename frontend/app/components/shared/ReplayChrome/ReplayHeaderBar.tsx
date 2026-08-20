import cn from 'classnames';
import React from 'react';

import ReplayDivider from './ReplayDivider';

/** The height every replay header is, in pixels.
 *
 *  Fifty, and written in px on purpose twice over. The html root is 14px, so
 *  Tailwind's `h-12` resolves to 42 rather than 48 and cannot be used here. And
 *  50 specifically, rather than any other round number, because
 *  `PlayerContent.tsx` sizes the stage as `calc(100dvh - 50px)` and
 *  `rightblock.module.css` sizes the sidebar as `calc(100vh - 50px)`: the
 *  contract is already written down in two files, in two different CSS units,
 *  and matching it means neither has to be touched.
 *
 *  That is also what quietly fixes the issue player. Its header was
 *  content-driven at two lines, so it was taller than the 50px the contract
 *  assumed and the bottom of the controls row was clipped by the difference.
 *  A fixed bar cannot drift out of step with the space it was given. */
export const REPLAY_HEADER_HEIGHT = 50;

interface Props {
  /** `ReplayBackButton`. Omitted where there is nowhere to go back to. */
  back?: React.ReactNode;
  /** `ReplayIdentity`. Takes the free space and truncates. */
  identity: React.ReactNode;
  /** `ReplayActionCluster`. */
  actions?: React.ReactNode;
  /** `ReplayTabStrip`, last on the right. */
  tabs?: React.ReactNode;
  /** fullscreen hides the chrome rather than unmounting it, so the player
   *  underneath keeps its scroll position and its attached iframe. */
  hidden?: boolean;
}

/* THE replay header bar. Session replay, Spot and issue replay all render this
   and differ only in what they put in the slots.

   What the bar owns, and what products therefore cannot get wrong:

   - the height (50px, fixed, see above)
   - the fill and its one bottom rule, in `gray-light` — the SAME colour as the
     side panel's own `border-l`, so the rule and the panel edge read as one
     frame around the body rather than two unrelated lines. The rule sits exactly
     where the side panel starts, because the panel is the next thing after this
     bar (Gabriel 08-20).

     This bar carried no rule at all for a while, separating from the stage by
     tone. That worked while the location strip below it was always drawn and
     supplied a line; once the URL moved into "More" on single-tab sessions there
     was no line anywhere, and the bar floated over the stage with the side
     panel's top edge appearing out of nowhere beside it.
   - the single divider, after the back button, full bleed. There are none on
     the right side: session replay never drew any there and the groups read
     fine on a gap alone.
   - the gaps.

   There is deliberately NO `className` and NO `style` prop. That is not an
   oversight and it is the same call `PreferencesPage` made: an escape hatch is
   exactly how these three headers drifted apart in the first place, 4px at a
   time. A product that needs the bar to look different needs a conversation,
   not a prop. */
export default function ReplayHeaderBar({
  back,
  identity,
  actions,
  tabs,
  hidden = false,
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center px-2 shrink-0 w-full bg-white',
        'border-b border-gray-light',
        hidden && 'hidden',
      )}
      style={{ height: REPLAY_HEADER_HEIGHT }}
    >
      {back}
      {back && <ReplayDivider />}
      {identity}
      {(actions || tabs) && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
          {tabs}
        </div>
      )}
    </div>
  );
}
