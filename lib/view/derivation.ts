/**
 * One constituent, taken apart, with the station's own numbers.
 *
 * The record page shows the observed line, the reconstructed line, the
 * residual, and a table of amplitudes and phases — and nothing whatsoever
 * between the record and the table. A reader arrives at the constants with no
 * idea what "fitting" did, which makes the site a demonstration of exactly the
 * half PRD §2 calls trivial: constants in, cosines summed, curve out.
 *
 * This is the missing middle. It takes real sample times from the record that
 * was actually fitted and shows, for one constituent, every intermediate value
 * between a timestamp and a harmonic constant:
 *
 *   t  →  the astronomical elements at t
 *      →  V(t), the equilibrium argument, from the Doodson coefficients
 *      →  cos(V + u) and sin(V + u), the two design-matrix columns
 *      →  a·cos + b·sin, this constituent's contribution at that instant
 *
 * and then the pair (a, b) the solve produced, and the two lines of
 * trigonometry that turn it into H and g.
 *
 * Nothing is re-solved here. The fit already happened; (a, b) is recovered
 * from the reported constant by the identity the design matrix is built on,
 * (a, b) = f·H·(cos g, sin g), so what is shown is the fit's own arithmetic
 * rather than a parallel calculation that might disagree with it.
 *
 * Pure, and no clock: the caller supplies the record (invariant 8).
 */

import { astronomicalElements } from '@/lib/astro/elements'
import { equilibriumArgument } from '@/lib/astro/doodson'
import { DEG_TO_RAD, RAD_TO_DEG, normaliseDegrees } from '@/lib/astro/time'
import { constituent, type ConstituentName } from '@/lib/tide/constituents'
import type { ConstituentConstant } from '@/lib/tide/fit'
import type { TideRecord } from '@/lib/tide/record'

export interface DerivationRow {
  readonly atSec: number
  /** V(t), the equilibrium argument, degrees. */
  readonly argumentDeg: number
  /** cos(V + u) — the constituent's cosine column of the design matrix. */
  readonly cosine: number
  /** sin(V + u) — its sine column. */
  readonly sine: number
  /** a·cos + b·sin: what this constituent alone contributes, metres. */
  readonly contributionM: number
  /** The height the gauge actually recorded at this instant, metres. */
  readonly observedM: number
}

export interface Derivation {
  readonly name: ConstituentName
  readonly doodson: string
  /** The six Doodson coefficients, in the order τ s h p N p′. */
  readonly coefficients: readonly number[]
  readonly offsetDeg: number
  readonly speedDegPerHour: number
  readonly rows: readonly DerivationRow[]
  /** The fitted pair the solve produced. */
  readonly a: number
  readonly b: number
  readonly nodalF: number
  readonly nodalUDeg: number
  /** What the two lines of trigonometry give back — the reported constant. */
  readonly amplitudeM: number
  readonly phaseDeg: number
  /** g expressed as a lag in hours: g ÷ speed. */
  readonly lagHours: number
  readonly meanLevelM: number
}

export interface DerivationOptions {
  readonly record: TideRecord
  /**
   * The fitted constant, which carries f and u already evaluated at the fit's
   * nodal epoch — so the panel shows the same correction the solve used, not a
   * second one computed here that could disagree with it.
   */
  readonly constant: ConstituentConstant
  readonly meanLevelM: number
  /** How many sample instants to show. Kept small; this is a worked example. */
  readonly rows?: number
}

export function deriveConstituent(options: DerivationOptions): Derivation | null {
  const { record, constant, meanLevelM } = options
  const wanted = Math.max(2, options.rows ?? 4)
  const total = record.timesSec.length
  if (total < wanted) return null

  const definition = constituent(constant.name)

  // Consecutive hours rather than samples spread across the record: the point
  // is to watch V advance by the constituent's own speed from one row to the
  // next, which a reader can check against the speed column themselves.
  const start = Math.floor(total / 3)
  const rows: DerivationRow[] = []

  const a = constant.nodalF * constant.amplitudeM * Math.cos(constant.phaseDeg * DEG_TO_RAD)
  const b = constant.nodalF * constant.amplitudeM * Math.sin(constant.phaseDeg * DEG_TO_RAD)

  for (let i = 0; i < wanted; i += 1) {
    const index = start + i
    if (index >= total) break
    const atSec = record.timesSec[index] as number
    const elements = astronomicalElements(atSec)
    const argumentDeg = equilibriumArgument(
      definition.coefficients,
      definition.offsetDeg,
      elements,
    )
    const angle = (argumentDeg + constant.nodalUDeg) * DEG_TO_RAD
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)

    rows.push({
      atSec,
      argumentDeg,
      cosine,
      sine,
      contributionM: a * cosine + b * sine,
      observedM: record.heightsM[index] as number,
    })
  }

  if (rows.length < 2) return null

  const c = definition.coefficients
  return {
    name: constant.name,
    doodson: constant.doodsonNumber,
    coefficients: [c.tau, c.s, c.h, c.p, c.N, c.p1],
    offsetDeg: definition.offsetDeg,
    speedDegPerHour: constant.speedDegPerHour,
    rows,
    a,
    b,
    nodalF: constant.nodalF,
    nodalUDeg: constant.nodalUDeg,
    // Round-tripped deliberately: these come back out of (a, b) by the same
    // two lines the panel prints, so a reader can check that the arithmetic
    // shown really does reproduce the table.
    amplitudeM: Math.hypot(a, b) / constant.nodalF,
    phaseDeg: normaliseDegrees(Math.atan2(b, a) * RAD_TO_DEG),
    lagHours: constant.phaseDeg / constant.speedDegPerHour,
    meanLevelM,
  }
}

/** Which constituent to walk through: the largest, which is the one that matters. */
export function largestConstituent(
  constants: readonly ConstituentConstant[],
): ConstituentConstant | null {
  let best: ConstituentConstant | null = null
  for (const candidate of constants) {
    if (best === null || candidate.amplitudeM > best.amplitudeM) best = candidate
  }
  return best
}
