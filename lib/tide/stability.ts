/**
 * The same station, fitted over different stretches of its own record.
 *
 * The app's foundational claim is PRD §1's: the frequencies are universal and
 * only amplitude and phase are local — *properties of the place*, of what a
 * coastline does to the forcing. Every number the site reports comes from one
 * particular stretch of 2026, and until now nothing tested whether those
 * numbers are a property of the harbour or of those months. The window could
 * be shortened and it could be split, but it could never be *moved*.
 *
 * This cuts the record into equal, non-overlapping windows and fits each one
 * independently. A constituent whose amplitude barely moves across four
 * separate stretches of sea is behaving like a property of the place. One that
 * swings is telling you that the record, the weather or the criterion is doing
 * the work instead — and it is usually the small ones that swing, which is the
 * lesson.
 *
 * Phases are compared on the circle, not the number line: 359° and 1° are two
 * degrees apart, and subtracting them gives 358.
 *
 * Pure: typed arrays in, results out (invariant 1).
 */

import { DEG_TO_RAD, RAD_TO_DEG, normaliseDegrees } from '@/lib/astro/time'
import type { ConstituentName } from './constituents'
import { fitHarmonics } from './fit'
import { resolvableSubset } from './rayleigh'
import { recordLengthHours, sliceRecord, type TideRecord } from './record'

export interface WindowFit {
  readonly startSec: number
  readonly endSec: number
  readonly lengthDays: number
  readonly conditionNumber: number
  /** Amplitude in metres, by constituent, for whatever this window supported. */
  readonly amplitudeM: Readonly<Partial<Record<ConstituentName, number>>>
  readonly phaseDeg: Readonly<Partial<Record<ConstituentName, number>>>
}

export interface ConstituentStability {
  readonly name: ConstituentName
  readonly meanAmplitudeM: number
  readonly minAmplitudeM: number
  readonly maxAmplitudeM: number
  /** (max − min) as a fraction of the mean — how much the answer moved. */
  readonly amplitudeSpread: number
  /** Widest angular distance between any window's phase and the circular mean. */
  readonly phaseSpreadDeg: number
}

export interface StabilityReport {
  readonly windows: readonly WindowFit[]
  /** Only constituents every window resolved; the rest cannot be compared. */
  readonly constituents: readonly ConstituentStability[]
  /** Requested but not resolvable in every window, so left out of the table. */
  readonly incomparable: readonly ConstituentName[]
}

export interface StabilityOptions {
  readonly record: TideRecord
  readonly constituents: readonly ConstituentName[]
  /** How many equal, non-overlapping stretches to cut the record into. */
  readonly windows?: number
}

const DEFAULT_WINDOWS = 4

/** Mean direction of a set of angles, degrees. */
function circularMeanDeg(anglesDeg: readonly number[]): number {
  let x = 0
  let y = 0
  for (const angle of anglesDeg) {
    x += Math.cos(angle * DEG_TO_RAD)
    y += Math.sin(angle * DEG_TO_RAD)
  }
  return normaliseDegrees(Math.atan2(y, x) * RAD_TO_DEG)
}

/** Shortest angular distance between two bearings, 0 to 180 degrees. */
export function angularDistanceDeg(a: number, b: number): number {
  const diff = Math.abs(normaliseDegrees(a) - normaliseDegrees(b)) % 360
  return diff > 180 ? 360 - diff : diff
}

export function windowStability(options: StabilityOptions): StabilityReport {
  const { record, constituents } = options
  const count = Math.max(2, options.windows ?? DEFAULT_WINDOWS)

  const startSec = record.timesSec[0] as number
  const endSec = record.timesSec[record.timesSec.length - 1] as number
  const spanSec = endSec - startSec
  if (spanSec <= 0) return { windows: [], constituents: [], incomparable: [] }

  const windowSec = Math.floor(spanSec / count)
  const windows: WindowFit[] = []

  for (let i = 0; i < count; i += 1) {
    const from = startSec + i * windowSec
    const to = i === count - 1 ? endSec : from + windowSec
    const slice = sliceRecord(record, from, to)
    if (slice.timesSec.length < 2 * constituents.length + 2) continue

    // Each window gets the largest set it can honestly support, which is not
    // necessarily the same set as its neighbours — that difference is itself
    // reported, rather than being smoothed away by forcing one set on all.
    const { kept } = resolvableSubset(constituents, recordLengthHours(slice))
    if (kept.length === 0) continue

    const outcome = fitHarmonics({ record: slice, constituents: kept })
    if (outcome.type !== 'fit') continue

    const amplitudeM: Partial<Record<ConstituentName, number>> = {}
    const phaseDeg: Partial<Record<ConstituentName, number>> = {}
    for (const constant of outcome.constants) {
      amplitudeM[constant.name] = constant.amplitudeM
      phaseDeg[constant.name] = constant.phaseDeg
    }

    windows.push({
      startSec: from,
      endSec: to,
      lengthDays: (to - from) / 86400,
      conditionNumber: outcome.conditionNumber,
      amplitudeM,
      phaseDeg,
    })
  }

  if (windows.length < 2) return { windows, constituents: [], incomparable: [] }

  const stability: ConstituentStability[] = []
  const incomparable: ConstituentName[] = []

  for (const name of constituents) {
    const amplitudes = windows.map((w) => w.amplitudeM[name])
    const phases = windows.map((w) => w.phaseDeg[name])
    if (amplitudes.some((a) => a === undefined) || phases.some((p) => p === undefined)) {
      incomparable.push(name)
      continue
    }

    const values = amplitudes as number[]
    const angles = phases as number[]
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const meanPhase = circularMeanDeg(angles)

    stability.push({
      name,
      meanAmplitudeM: mean,
      minAmplitudeM: min,
      maxAmplitudeM: max,
      amplitudeSpread: mean === 0 ? 0 : (max - min) / mean,
      phaseSpreadDeg: Math.max(...angles.map((a) => angularDistanceDeg(a, meanPhase))),
    })
  }

  // Largest first: the constituents a reader has been looking at.
  stability.sort((a, b) => b.meanAmplitudeM - a.meanAmplitudeM)
  return { windows, constituents: stability, incomparable }
}
