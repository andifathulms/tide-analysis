/**
 * The 18.61-year cycle, swept.
 *
 * Invariant 4 requires f and u to be applied, cited and surfaced, and they
 * are — a column each in the constituent table. What a column cannot give is
 * a sense of scale. `f = 1.037` looks like a rounding correction. It is not:
 * across the node cycle K2's f runs from 0.748 to 1.317, so the same fitted
 * constant describes a wave that is three quarters of its nominal height at
 * one point in the cycle and four thirds of it at another.
 *
 * That is the difference between a constant and a constant-at-an-epoch, and
 * it is why this project recomputes f and u at prediction time rather than
 * carrying the fit window's values forward. The reported amplitude H has f
 * divided out; the wave actually in the water is H·f, and this says how far
 * that swings.
 *
 * Pure, and no clock: the caller supplies the instants (invariant 8).
 */

import { nodalCorrection, type NodalScheme } from '@/lib/astro/nodal'
import { astronomicalElements } from '@/lib/astro/elements'
import { constituent, type ConstituentName } from './constituents'

/** Draconic period of the lunar node, days. Schureman 1958, SP 98 §72. */
export const NODE_CYCLE_DAYS = 6798.383

export interface NodalSample {
  readonly atSec: number
  /** N, longitude of the ascending node, degrees. */
  readonly nodeLongitudeDeg: number
  readonly f: number
  readonly uDeg: number
}

export interface ConstituentNodalCycle {
  readonly name: ConstituentName
  readonly scheme: NodalScheme
  readonly samples: readonly NodalSample[]
  readonly fMin: number
  readonly fMax: number
  readonly uMinDeg: number
  readonly uMaxDeg: number
  /** Where this record's own fit sits on the cycle. */
  readonly atEpoch: NodalSample
  /**
   * Peak-to-peak swing in f as a fraction of the mean — how much the wave in
   * the water changes while the reported constant does not. Zero for solar
   * constituents, which have no lunar node to follow.
   */
  readonly swing: number
}

export interface NodalCycleOptions {
  readonly names: readonly ConstituentName[]
  /** The fit's nodal epoch: the instant f and u were evaluated at. */
  readonly epochSec: number
  /** How many points to sample around the cycle. */
  readonly steps?: number
}

const DEFAULT_STEPS = 120

export function nodalCycles(options: NodalCycleOptions): ConstituentNodalCycle[] {
  const { names, epochSec } = options
  const steps = Math.max(8, options.steps ?? DEFAULT_STEPS)

  // One full cycle centred on the epoch, so the record's own position is
  // somewhere in the middle rather than pinned to an end.
  const spanSec = NODE_CYCLE_DAYS * 86400
  const startSec = Math.round(epochSec - spanSec / 2)

  const instants: number[] = []
  for (let i = 0; i <= steps; i += 1) {
    instants.push(Math.round(startSec + (spanSec * i) / steps))
  }

  return names.map((name): ConstituentNodalCycle => {
    const scheme = constituent(name).nodal

    const sampleAt = (atSec: number): NodalSample => {
      const nodeLongitudeDeg = astronomicalElements(atSec).N
      const correction = nodalCorrection(scheme, nodeLongitudeDeg)
      return { atSec, nodeLongitudeDeg, f: correction.f, uDeg: correction.uDeg }
    }

    const samples = instants.map(sampleAt)
    const fs = samples.map((s) => s.f)
    const us = samples.map((s) => s.uDeg)
    const fMin = Math.min(...fs)
    const fMax = Math.max(...fs)

    return {
      name,
      scheme,
      samples,
      fMin,
      fMax,
      uMinDeg: Math.min(...us),
      uMaxDeg: Math.max(...us),
      atEpoch: sampleAt(epochSec),
      swing: fMin + fMax === 0 ? 0 : (fMax - fMin) / ((fMax + fMin) / 2),
    }
  })
}
