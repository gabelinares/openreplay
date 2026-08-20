import React from 'react';

interface Props {
  /** share the moment. Three implementations existed for this one verb: a modal
   *  (session), a popover (issue), and a silent clipboard write with a toast
   *  (Spot). The slot does not care which lands here, but there should be one. */
  share?: React.ReactNode;
  highlight?: React.ReactNode;
  /** the overflow menu. Whatever a product has that is not one of the first
   *  three: bookmark, vault, Jira, shortcuts, export, download, delete. */
  overflow?: React.ReactNode;
  /** previous / next, and autoplay where it exists. Its own group, because it
   *  navigates away rather than acting on what is on screen. */
  queue?: React.ReactNode;
}

/* The right-hand cluster for every replay header. It exists to hold the ORDER
   and the spacing, which is the part that made the three headers read as three
   products: share then highlight then overflow, then the queue, and the tab
   strip after this (the bar places that).

   Two rules the slots enforce by construction:

   NO DIVIDERS. Session replay draws none on this side and the groups simply run
   together on a gap; the issue header had three, which is where half of its
   stroke count came from.

   ICON ONLY. Everything in here is an antd `size="small"` icon button with a
   tooltip. Spot was the only player that labelled its buttons ("Copy", "Manage
   Access") and it is most of why its bar read as different software (Gabriel
   08-20). Labels also cannot fit a fixed 50px single-line bar. */
export default function ReplayActionCluster({
  share,
  highlight,
  overflow,
  queue,
}: Props) {
  const hasActs = !!share || !!highlight || !!overflow;

  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* rendered as named slots rather than a mapped array: they are fixed
          positions, so they need no keys and cannot be reordered by accident */}
      {hasActs && (
        <div className="flex items-center gap-1">
          {share}
          {highlight}
          {overflow}
        </div>
      )}
      {queue && <div className="flex items-center gap-1">{queue}</div>}
    </div>
  );
}
