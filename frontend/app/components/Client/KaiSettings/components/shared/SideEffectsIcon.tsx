import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * Side effects: running this test changes real data.
 *
 * Deliberately NOT a triangle. The critical mark is lucide's AlertTriangle and a
 * test row can carry both, so two triangles side by side were unreadable.
 *
 * This is a lucide icon rather than a hand-drawn one on purpose. Three earlier
 * custom attempts kept reading smaller and lighter than the triangle, because
 * matching its nominal 14px is not the same as matching its ink: the triangle is
 * a closed shape covering ~85% x 75% of the 24 grid. Every lucide glyph is drawn
 * to that same grid and the same optical conventions, so weight and extent match
 * by construction instead of by measurement.
 *
 * Kept as a one-line wrapper so the mark can be swapped in one place. The two
 * call sites (the tests table and the drawer banner) do not need to know.
 * Alternatives already checked as present in lucide-react 0.487.0: OctagonAlert,
 * BadgeAlert, CircleAlert, Construction, Siren, Vibrate, Radiation, Biohazard.
 * Note DiamondAlert and SquareAlert do NOT exist in this version.
 */
export default function SideEffectsIcon({ size = 14 }: { size?: number }) {
  return <ShieldAlert size={size} />;
}
