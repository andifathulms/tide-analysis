/**
 * What a refusal costs.
 *
 * When the Rayleigh criterion refuses a constituent, the app stops — correctly,
 * because a number it cannot separate is not a number it can report. But the
 * constituent did not stop existing. Its energy is still in the record, and
 * since the fit did not model it, it is sitting in the residual the reader is
 * already looking at.
 *
 * This projects the residual onto the refused constituent's frequency and
 * reports the magnitude. It answers "was I refused a rounding error or a
 * twelve-centimetre constituent", which is a fair question and one the refusal
 * alone leaves open.
 *
 * **This is not a harmonic constant and must never be presented as one.** The
 * reason the fit refused is that the constituent cannot be separated from its
 * partner on this record; the same inseparability contaminates this estimate.
 * Some of what is measured here belongs to the partner, and there is no way to
 * say how much — that is what inseparable means. So the contamination is part
 * of the result type, not an optional note: every estimate carries the fitted
 * constituents it is confounded with and how strongly, and a caller cannot
 * take the magnitude without them.
 *
 * No phase is reported. A magnitude with a phase beside it reads as a constant
 * no matter what the surrounding text says.
 *
 * Pure: typed arrays in, results out (invariant 1).
 */

import type { ConstituentName } from './constituents'
import { constituentCorrelations } from './correlation'
import { buildDesignMatrix } from './design'
import { solveLeastSquares } from './solve'
import type { DatumStep } from './steps'

export interface Confounder {
  readonly name: ConstituentName
  /** Cosine of the smallest principal angle — see lib/tide/correlation. */
  readonly correlation: number
}

export interface LeakageEstimate {
  readonly name: ConstituentName
  /**
   * Magnitude of the residual at this constituent's frequency, in metres,
   * with the nodal factor divided out as a fitted amplitude would be.
   * Contaminated by everything in `confoundedWith`.
   */
  readonly magnitudeM: number
  /** Fitted constituents this frequency cannot be told apart from, worst first. */
  readonly confoundedWith: readonly Confounder[]
  /** The worst correlation in `confoundedWith`, or 0 when there is none. */
  readonly worstCorrelation: number
  /**
   * True when nothing in the fitted set is meaningfully correlated with this
   * frequency, so the magnitude stands on its own. On a record that refused
   * the constituent this is essentially always false — it is the flag that
   * separates "we know what this is" from "we know only that something is
   * here".
   */
  readonly isolated: boolean
}

/**
 * Report a confounder from here up — the correlation panel's "slight" band,
 * not a level at which the estimate is ruined.
 *
 * It sits this low because of what the Rayleigh threshold actually is. A
 * refusal fires when the pair has not drifted one *full* cycle apart, which is
 * conservative: at two thirds of the required length a pair is already
 * partially separable. Benoa's fitted window is 141 days against the 182.6
 * that K2/S2 demands, and the correlation there is 0.27 — real, worth naming,
 * and nothing like the 0.97 the same pair scores on a fortnight.
 *
 * An earlier cut at 0.3 hid exactly that case, so the panel announced a
 * constituent as unconfounded on the same screen as the refusal that named its
 * partner. Showing the number and letting the reader size it is the point;
 * suppressing it below a threshold reinvents the binary this is here to undo.
 */
const CONFOUNDED_AT = 0.1

export interface LeakageOptions {
  readonly timesSec: Float64Array
  /** Observed minus fitted, at the same times. */
  readonly residualM: Float64Array
  /** The constituents the fit did model — the possible confounders. */
  readonly fitted: readonly ConstituentName[]
  /** The constituents the fit refused. */
  readonly refused: readonly ConstituentName[]
  readonly nodalEpochSec: number
  readonly steps?: readonly DatumStep[]
}

export function residualLeakage(options: LeakageOptions): LeakageEstimate[] {
  const { timesSec, residualM, fitted, refused, nodalEpochSec } = options
  if (refused.length === 0 || timesSec.length < 4) return []

  // One combined design gives every correlation between a refused frequency
  // and the fitted set in a single pass. Duplicates would throw, and a
  // constituent that is both fitted and refused is a caller error, so drop it
  // from the refused side rather than failing the page.
  const fittedSet = new Set(fitted)
  const targets = refused.filter((name) => !fittedSet.has(name))
  if (targets.length === 0) return []

  const combined = constituentCorrelations(
    buildDesignMatrix({
      timesSec,
      constituents: [...fitted, ...targets],
      nodalEpochSec,
      steps: options.steps,
    }),
  )

  return targets.map((name): LeakageEstimate => {
    const confoundedWith = combined.rungs
      .filter(
        (rung) =>
          rung.b !== null &&
          ((rung.a === name && fittedSet.has(rung.b)) ||
            (rung.b === name && fittedSet.has(rung.a))),
      )
      .map((rung) => ({
        name: (rung.a === name ? rung.b : rung.a) as ConstituentName,
        correlation: rung.correlation,
      }))
      .filter((confounder) => confounder.correlation >= CONFOUNDED_AT)
      .sort((a, b) => b.correlation - a.correlation || a.name.localeCompare(b.name))

    // The projection itself: this frequency alone, against the residual. A
    // mean-level column comes with the design matrix and absorbs any offset
    // the residual carries, so the magnitude is not reading a datum error.
    const design = buildDesignMatrix({
      timesSec,
      constituents: [name],
      nodalEpochSec,
      steps: options.steps,
    })
    const solution = solveLeastSquares(design, residualM)
    const pair = design.pairs[0]
    const magnitudeM =
      pair === undefined
        ? 0
        : Math.hypot(
            solution.coefficients[pair.cosColumn] as number,
            solution.coefficients[pair.sinColumn] as number,
          ) / pair.nodal.f

    return {
      name,
      magnitudeM,
      confoundedWith,
      worstCorrelation: confoundedWith[0]?.correlation ?? 0,
      isolated: confoundedWith.length === 0,
    }
  })
}
