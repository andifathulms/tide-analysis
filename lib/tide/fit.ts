/**
 * Harmonic analysis: a record in, constants out — or a refusal.
 *
 * Rayleigh is enforced before the solve (invariant 6). Nothing here can return
 * an amplitude without also returning the condition number that says whether
 * it means anything (invariant 5), and nothing can report a constituent
 * without its resolvability status (invariant 7).
 */

import { RAD_TO_DEG, normaliseDegrees } from '@/lib/astro/time'
import { constituent, constituentDoodsonNumber, type ConstituentName } from './constituents'
import { buildDesignMatrix, evaluateDesign, type DesignMatrix } from './design'
import { assessResolution, type ResolutionAssessment, type ResolutionConflict } from './rayleigh'
import { recordCentreSec, recordLengthHours, type TideRecord } from './record'
import { solveLeastSquares } from './solve'

export type Method = 'least-squares' | 'admiralty'

export interface ConstituentConstant {
  readonly name: ConstituentName
  readonly species: string
  readonly doodsonNumber: string
  readonly speedDegPerHour: number
  /** H — amplitude in metres, nodal factor removed. */
  readonly amplitudeM: number
  /** g — Greenwich phase lag in degrees, [0, 360). */
  readonly phaseDeg: number
  /** 1σ uncertainty on H, metres, from the residual variance. */
  readonly amplitudeErrorM: number
  /** 1σ uncertainty on g, degrees. */
  readonly phaseErrorDeg: number
  /** Nodal factor applied at the record's centre — shown, never folded in. */
  readonly nodalF: number
  readonly nodalUDeg: number
}

export type Conditioning = 'baik' | 'wajar' | 'marginal' | 'buruk'

export interface HarmonicFit {
  readonly type: 'fit'
  readonly method: Method
  readonly stationId: string
  readonly windowStartSec: number
  readonly windowEndSec: number
  readonly sampleCount: number
  readonly lengthDays: number
  /** Z0 — mean level over the window, in the record's datum. */
  readonly meanLevelM: number
  readonly datumCode: string
  readonly constants: readonly ConstituentConstant[]
  /** κ(A). Not optional, ever. */
  readonly conditionNumber: number
  readonly conditioning: Conditioning
  readonly residualRmsM: number
  readonly nodalEpochSec: number
  readonly nodeLongitudeDeg: number
  readonly resolution: Extract<ResolutionAssessment, { type: 'resolvable' }>
}

export interface HarmonicRefusal {
  readonly type: 'refusal'
  readonly method: Method
  readonly stationId: string
  readonly reason: 'rayleigh' | 'insufficient-data'
  readonly message: string
  readonly conflicts: readonly ResolutionConflict[]
  readonly assessment: ResolutionAssessment
  readonly availableDays: number
  /** What the record would have to be for the request to be answerable. */
  readonly requiredDays: number
}

export type FitOutcome = HarmonicFit | HarmonicRefusal

export interface FitOptions {
  readonly record: TideRecord
  readonly constituents: readonly ConstituentName[]
  /** Overrides the record's centre for f and u. Rarely needed. */
  readonly nodalEpochSec?: number
}

/**
 * Thresholds for κ(A), stated once. A well-conditioned tidal design matrix
 * over a month of hourly data sits near 1–3; past 1000 the amplitudes are
 * arithmetic on noise.
 */
export function conditioningOf(conditionNumber: number): Conditioning {
  if (!Number.isFinite(conditionNumber)) return 'buruk'
  if (conditionNumber < 10) return 'baik'
  if (conditionNumber < 100) return 'wajar'
  if (conditionNumber < 1000) return 'marginal'
  return 'buruk'
}

export function fitHarmonics(options: FitOptions): FitOutcome {
  const { record, constituents } = options
  const availableHours = recordLengthHours(record)
  const stationId = record.stationId

  if (record.timesSec.length < 2 * constituents.length + 1) {
    return {
      type: 'refusal',
      method: 'least-squares',
      stationId,
      reason: 'insufficient-data',
      message: `Rekaman hanya berisi ${record.timesSec.length} sampel — kurang dari ${2 * constituents.length + 1} parameter yang diminta.`,
      conflicts: [],
      assessment: assessResolution(constituents, availableHours),
      availableDays: availableHours / 24,
      requiredDays: availableHours / 24,
    }
  }

  const assessment = assessResolution(constituents, availableHours)
  if (assessment.type === 'refusal') {
    const worst = assessment.conflicts[0] as ResolutionConflict
    return {
      type: 'refusal',
      method: 'least-squares',
      stationId,
      reason: 'rayleigh',
      message:
        worst.a === worst.b
          ? `${worst.a} tidak dapat dipisahkan dari muka air rata-rata pada rekaman ${(availableHours / 24).toFixed(1)} hari.`
          : `${worst.a} dan ${worst.b} tidak dapat dipisahkan pada rekaman ${(availableHours / 24).toFixed(1)} hari.`,
      conflicts: assessment.conflicts,
      assessment,
      availableDays: availableHours / 24,
      requiredDays: assessment.requiredDays,
    }
  }

  const nodalEpochSec = options.nodalEpochSec ?? recordCentreSec(record)
  const design = buildDesignMatrix({
    timesSec: record.timesSec,
    constituents,
    nodalEpochSec,
  })
  const solution = solveLeastSquares(design, record.heightsM)

  const constants = design.pairs.map((pair): ConstituentConstant => {
    const a = solution.coefficients[pair.cosColumn] as number
    const b = solution.coefficients[pair.sinColumn] as number
    const sigmaA = solution.standardErrors[pair.cosColumn] as number
    const sigmaB = solution.standardErrors[pair.sinColumn] as number
    const magnitude = Math.hypot(a, b)
    const amplitudeM = magnitude / pair.nodal.f
    // g is the lag of the observed constituent behind its equilibrium argument.
    const phaseDeg = normaliseDegrees(Math.atan2(b, a) * RAD_TO_DEG)
    const amplitudeErrorM =
      magnitude === 0
        ? Math.hypot(sigmaA, sigmaB) / pair.nodal.f
        : Math.hypot(a * sigmaA, b * sigmaB) / magnitude / pair.nodal.f
    const phaseErrorDeg =
      magnitude === 0
        ? 180
        : (Math.hypot(b * sigmaA, a * sigmaB) / (magnitude * magnitude)) * RAD_TO_DEG

    return {
      name: pair.name,
      species: constituent(pair.name).species,
      doodsonNumber: constituentDoodsonNumber(pair.name),
      speedDegPerHour: pair.speedDegPerHour,
      amplitudeM,
      phaseDeg,
      amplitudeErrorM,
      phaseErrorDeg,
      nodalF: pair.nodal.f,
      nodalUDeg: pair.nodal.uDeg,
    }
  })

  const n = record.timesSec.length
  return {
    type: 'fit',
    method: 'least-squares',
    stationId,
    windowStartSec: record.timesSec[0] as number,
    windowEndSec: record.timesSec[n - 1] as number,
    sampleCount: n,
    lengthDays: availableHours / 24,
    meanLevelM: solution.coefficients[0] as number,
    datumCode: record.datum.code,
    constants: [...constants].sort((x, y) => y.amplitudeM - x.amplitudeM),
    conditionNumber: solution.conditionNumber,
    conditioning: conditioningOf(solution.conditionNumber),
    residualRmsM: solution.residualRmsM,
    nodalEpochSec,
    nodeLongitudeDeg: design.nodeLongitudeDeg,
    resolution: assessment,
  }
}

/** Model heights at the record's own sample times, for the residual band. */
export function modelAtRecordTimes(record: TideRecord, fit: HarmonicFit): Float64Array {
  const design = buildDesignMatrix({
    timesSec: record.timesSec,
    constituents: fit.constants.map((c) => c.name),
    nodalEpochSec: fit.nodalEpochSec,
  })
  return evaluateDesign(design, coefficientsFrom(fit, design))
}

/** Rebuild the design-matrix coefficient vector from reported constants. */
export function coefficientsFrom(fit: HarmonicFit, design: DesignMatrix): Float64Array {
  const coefficients = new Float64Array(design.columns)
  coefficients[0] = fit.meanLevelM
  for (const pair of design.pairs) {
    const constant = fit.constants.find((c) => c.name === pair.name)
    if (constant === undefined) continue
    const magnitude = constant.amplitudeM * pair.nodal.f
    coefficients[pair.cosColumn] = magnitude * Math.cos(constant.phaseDeg / RAD_TO_DEG)
    coefficients[pair.sinColumn] = magnitude * Math.sin(constant.phaseDeg / RAD_TO_DEG)
  }
  return coefficients
}
