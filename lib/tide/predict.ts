/**
 * Prediction: constants forward into height series and extrema.
 *
 * Nodal f and u are recomputed at the prediction time rather than carried from
 * the fit — that is what makes them corrections rather than bookkeeping, and
 * over an 18.6-year cycle the difference in M2 alone is ±3.7%.
 */

import { astronomicalElements } from '@/lib/astro/elements'
import { equilibriumArgument } from '@/lib/astro/doodson'
import { nodalCorrection } from '@/lib/astro/nodal'
import { DEG_TO_RAD } from '@/lib/astro/time'
import { constituent, type ConstituentName } from './constituents'

/** The minimum a prediction needs: a name, an amplitude and a phase lag. */
export interface PredictableConstant {
  readonly name: ConstituentName
  readonly amplitudeM: number
  readonly phaseDeg: number
}

export interface PredictionInput {
  readonly meanLevelM: number
  readonly constants: readonly PredictableConstant[]
  /** Integer seconds UTC. */
  readonly timesSec: ArrayLike<number>
  /**
   * Hold f and u at this instant instead of recomputing them per sample.
   * Prediction should not set this — the whole point of a nodal correction is
   * that it tracks the node. It exists so a synthetic record can be generated
   * under exactly the assumption the fit makes, which is what lets the
   * ground-truth test isolate the solver from the nodal treatment.
   */
  readonly nodalEpochSec?: number
}

export function predictHeights(input: PredictionInput): Float64Array {
  const { meanLevelM, constants, timesSec, nodalEpochSec } = input
  const out = new Float64Array(timesSec.length)
  const definitions = constants.map((c) => ({ constant: c, definition: constituent(c.name) }))
  const fixedNode =
    nodalEpochSec === undefined ? null : astronomicalElements(nodalEpochSec).N

  for (let i = 0; i < timesSec.length; i += 1) {
    const t = timesSec[i] as number
    const elements = astronomicalElements(t)
    let height = meanLevelM
    for (const { constant, definition } of definitions) {
      const nodal = nodalCorrection(definition.nodal, fixedNode ?? elements.N)
      const V = equilibriumArgument(definition.coefficients, definition.offsetDeg, elements)
      height +=
        nodal.f *
        constant.amplitudeM *
        Math.cos((V + nodal.uDeg - constant.phaseDeg) * DEG_TO_RAD)
    }
    out[i] = height
  }
  return out
}

/** Evenly spaced integer-second times, inclusive of the start. */
export function timeGrid(startSec: number, endSec: number, stepSec: number): Float64Array {
  if (stepSec <= 0) throw new Error('stepSec must be positive')
  const count = Math.floor((endSec - startSec) / stepSec) + 1
  const out = new Float64Array(Math.max(count, 0))
  for (let i = 0; i < out.length; i += 1) out[i] = startSec + i * stepSec
  return out
}

export type ExtremumKind = 'pasang' | 'surut'

export interface Extremum {
  readonly kind: ExtremumKind
  readonly timeSec: number
  readonly heightM: number
}

/**
 * High and low waters by scanning a fine grid and refining each turning point
 * with a parabola through the bracketing samples. A one-minute grid puts the
 * timing error well under a minute for any coastal tide.
 */
export function findExtrema(
  input: Omit<PredictionInput, 'timesSec'> & {
    readonly startSec: number
    readonly endSec: number
    readonly stepSec?: number
  },
): Extremum[] {
  const stepSec = input.stepSec ?? 60
  const times = timeGrid(input.startSec, input.endSec, stepSec)
  const heights = predictHeights({ ...input, timesSec: times })
  const extrema: Extremum[] = []

  for (let i = 1; i < heights.length - 1; i += 1) {
    const previous = heights[i - 1] as number
    const current = heights[i] as number
    const next = heights[i + 1] as number
    const isHigh = current > previous && current >= next
    const isLow = current < previous && current <= next
    if (!isHigh && !isLow) continue

    // Vertex of the parabola through the three samples, in units of stepSec.
    const denominator = previous - 2 * current + next
    const offset = denominator === 0 ? 0 : (0.5 * (previous - next)) / denominator
    const timeSec = Math.round((times[i] as number) + offset * stepSec)
    const heightM = current - 0.25 * (previous - next) * offset

    extrema.push({ kind: isHigh ? 'pasang' : 'surut', timeSec, heightM })
  }

  return extrema
}

/** Residual: observation minus model, the part the harmonic tide cannot explain. */
export function residual(observed: ArrayLike<number>, model: ArrayLike<number>): Float64Array {
  if (observed.length !== model.length) {
    throw new Error('Residual needs matching series lengths')
  }
  const out = new Float64Array(observed.length)
  for (let i = 0; i < observed.length; i += 1) {
    out[i] = (observed[i] as number) - (model[i] as number)
  }
  return out
}
