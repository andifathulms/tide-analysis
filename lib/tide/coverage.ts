/**
 * The second axis of what a record can support.
 *
 * The Rayleigh criterion is a function of span alone: first sample to last,
 * divided by the drift a pair needs. It has nothing to say about the hours in
 * between, so by that measure a record with a hundred days missing out of two
 * hundred is exactly as good as a complete one. It is not, and this shows the
 * difference by refitting the same record under masks it constructs.
 *
 * The result is sharper than "gaps are bad". Both masks here keep the first
 * and last sample, so every row of the sweep has *identical span* — and span
 * is the only quantity the Rayleigh criterion reads. By that measure the rows
 * are the same record. They are not: a single long outage leaves two clusters
 * of samples with nothing joining them, the phase difference across the hole
 * is ambiguous, and close pairs collapse back together. On Benoa, removing
 * 70% as one outage takes the worst pair from 0.14 to 0.95; removing the same
 * 70% at scattered times leaves it at 0.15. Kolinamil is the live case of the
 * second kind — 740 hours missing and a well-conditioned fit.
 *
 * Pure: typed arrays in, results out (invariant 1). The masks are constructed
 * by a fixed rule, never sampled from a generator, so the same record produces
 * the same sweep on every build.
 */

import type { ConstituentName } from './constituents'
import { constituentCorrelations } from './correlation'
import { buildDesignMatrix } from './design'
import { solveLeastSquares } from './solve'

export type MaskKind = 'actual' | 'contiguous' | 'scattered'

export interface CoveragePoint {
  readonly kind: MaskKind
  /** Fraction of the record's own samples this mask removes, 0 to 1. */
  readonly removedFraction: number
  readonly sampleCount: number
  /** First sample to last, in days — what the Rayleigh criterion sees. */
  readonly spanDays: number
  readonly conditionNumber: number
  /** The most nearly parallel pair under this mask. */
  readonly worst: { readonly a: ConstituentName; readonly b: ConstituentName; readonly correlation: number } | null
}

export interface CoverageOptions {
  readonly timesSec: Float64Array
  readonly constituents: readonly ConstituentName[]
  readonly nodalEpochSec: number
  /** Fractions to remove. 0 is always included as the record's own sampling. */
  readonly fractions?: readonly number[]
}

const DEFAULT_FRACTIONS = [0.25, 0.5, 0.7] as const

/**
 * Knuth's multiplicative hash, thresholded.
 *
 * A regular stride would be the obvious way to thin a record and the wrong
 * one: decimating every k-th hourly sample imposes a period of k hours on the
 * sampling, which can beat against the tidal frequencies being fitted and
 * produce an artefact of the mask rather than a property of the coverage.
 * This scatters without a generator, so the mask is reproducible by
 * construction and the sweep is deterministic (invariant: determinism is
 * asserted on every fit).
 */
function keepScattered(index: number, removedFraction: number): boolean {
  const hashed = Math.imul(index + 1, 2654435761) >>> 0
  return hashed % 1000 >= removedFraction * 1000
}

function measure(
  kind: MaskKind,
  timesSec: Float64Array,
  originalCount: number,
  constituents: readonly ConstituentName[],
  nodalEpochSec: number,
): CoveragePoint | null {
  // Two parameters per constituent plus a level; below that there is nothing
  // to report and solving would be arithmetic on an underdetermined system.
  if (timesSec.length < 2 * constituents.length + 2) return null

  const design = buildDesignMatrix({ timesSec, constituents, nodalEpochSec })
  // κ is a property of the design matrix alone, so the heights it is solved
  // against do not matter here — only the geometry does.
  const solution = solveLeastSquares(design, new Float64Array(timesSec.length))
  const worst = constituentCorrelations(design).worst

  return {
    kind,
    removedFraction: 1 - timesSec.length / originalCount,
    sampleCount: timesSec.length,
    spanDays:
      ((timesSec[timesSec.length - 1] as number) - (timesSec[0] as number)) / 86400,
    conditionNumber: solution.conditionNumber,
    worst:
      worst === null || worst.b === null
        ? null
        : { a: worst.a, b: worst.b, correlation: worst.correlation },
  }
}

export function coverageSweep(options: CoverageOptions): CoveragePoint[] {
  const { timesSec, constituents, nodalEpochSec } = options
  const fractions = options.fractions ?? DEFAULT_FRACTIONS
  const count = timesSec.length
  if (count < 4 || constituents.length === 0) return []

  const points: CoveragePoint[] = []

  const actual = measure('actual', timesSec, count, constituents, nodalEpochSec)
  if (actual !== null) points.push(actual)

  for (const fraction of fractions) {
    // Contiguous: one outage in the middle, which is what a failed gauge
    // looks like. Taken from the centre so both ends of the record survive —
    // trimming an end would be a shorter record, not a gappier one, and the
    // Rayleigh criterion already covers that case.
    const removed = Math.round(count * fraction)
    const from = Math.round((count - removed) / 2)
    const contiguous = Float64Array.from(
      Array.from(timesSec).filter((_, index) => index < from || index >= from + removed),
    )
    const contiguousPoint = measure(
      'contiguous',
      contiguous,
      count,
      constituents,
      nodalEpochSec,
    )
    if (contiguousPoint !== null) points.push(contiguousPoint)

    const scattered = Float64Array.from(
      Array.from(timesSec).filter((_, index) => keepScattered(index, fraction)),
    )
    const scatteredPoint = measure('scattered', scattered, count, constituents, nodalEpochSec)
    if (scatteredPoint !== null) points.push(scatteredPoint)
  }

  return points
}
