import React from 'react';

/* THE divider for every replay header. One spec, taken from the CSS module that
   already documented it (`playerBlockHeader.module.css`: 1px wide, 49px tall,
   `margin 0 10px`, gray-lighter) and that the mobile and live headers already
   used — the web session header was the one that reinlined it, and Spot and the
   issue player each invented a third and fourth.

   Full bleed on purpose. The issue player's version was `h-6`, a floating tick
   with air above and below, and a tick mark between two full-height groups is
   most of why Mehdi read that header as busy (08-19: "there are too many
   lines"). Height comes from `self-stretch` rather than a literal 49px so the
   bar owns its own height and this cannot drift out of step with it.

   `ReplayHeaderBar` renders exactly one of these, after the back button, and
   nothing on the right side. Products do not place dividers themselves. */
export default function ReplayDivider() {
  return <div className="w-px self-stretch shrink-0 mx-2 bg-gray-lighter" />;
}
