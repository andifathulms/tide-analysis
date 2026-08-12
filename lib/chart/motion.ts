/**
 * The one orchestrated moment (PRD §9): the prediction curve rebuilding as a
 * constituent is added or removed.
 *
 * It is a tween between two height series, nothing more — the curve grows the
 * new cosine into itself rather than cutting to it, so the spring-neap beat
 * can be seen arriving when S2 joins M2. That is the whole argument for it:
 * the beat is the thing everyone has noticed and few can explain, and it
 * emerges from two cosines in front of you.
 *
 * What it deliberately is not: the Rayleigh slider, where the fit is
 * discontinuous and animating would imply a continuity that is not there.
 *
 * The arithmetic lives here rather than in the component (invariant 16).
 */

/** Smoothstep. Fast at the start, settled at the end, no overshoot. */
export function easeInOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1)
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - (-2 * clamped + 2) ** 3 / 2
}

/**
 * Blend two series. Lengths must match: both come from the same time grid, so
 * a mismatch is a bug rather than something to paper over.
 */
export function blendSeries(
  from: Float64Array,
  to: Float64Array,
  progress: number,
): Float64Array {
  if (from.length !== to.length) {
    throw new Error('Cannot blend series of different lengths')
  }
  const eased = easeInOutCubic(progress)
  const out = new Float64Array(to.length)
  for (let i = 0; i < to.length; i += 1) {
    const a = from[i] as number
    const b = to[i] as number
    out[i] = a + (b - a) * eased
  }
  return out
}

/** How long the curve takes to rebuild. Long enough to read, short enough to repeat. */
export const REBUILD_MS = 420
