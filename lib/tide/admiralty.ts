/**
 * The Admiralty method — the classical alternative to least squares, and the
 * one Indonesian practice still teaches alongside it.
 *
 * What it is, stated exactly, because the comparison is only worth anything if
 * both sides are described honestly:
 *
 * The Admiralty scheme works a short record — classically 15 or 29 days of
 * hourly heights — one constituent at a time. Each amplitude and phase is
 * obtained by projecting the record onto that constituent's own argument
 * alone, rather than by solving for all of them together, and the constituents
 * a fortnight cannot separate are not solved for at all: they are *inferred*
 * from a neighbour through a fixed ratio taken from the equilibrium tide.
 * K2 comes from S2, and P1 from K1.
 *
 * That is the whole difference from least squares. Least squares solves the
 * constituents jointly and so accounts for their mutual correlation; Admiralty
 * treats each as if the others were not there, which is cheap, hand-workable,
 * and biased in exactly the way the correlation between neighbours predicts.
 * On a well-separated set the two agree closely, and where they diverge the
 * divergence is informative.
 *
 * This implementation is the projection-and-inference scheme, not a
 * reproduction of the printed NP 159 tabulation with its filter multipliers.
 * The method page says so in as many words.
 */

import { astronomicalElements } from '@/lib/astro/elements'
import { equilibriumArgument } from '@/lib/astro/doodson'
import { nodalCorrection } from '@/lib/astro/nodal'
import { DEG_TO_RAD, RAD_TO_DEG, normaliseDegrees } from '@/lib/astro/time'
import { constituent, constituentDoodsonNumber, type ConstituentName } from './constituents'
import type { ConstituentConstant, HarmonicRefusal } from './fit'
import { recordCentreSec, recordLengthHours, type TideRecord } from './record'

/** Where a constant came from — never blurred. */
export type Determination = 'langsung' | 'disimpulkan'

export interface AdmiraltyConstant extends ConstituentConstant {
  readonly determination: Determination
  /** For an inferred constant: which constituent it was inferred from. */
  readonly inferredFrom?: ConstituentName
  /** The ratio used, when inferred. */
  readonly inferenceRatio?: number
}

export interface AdmiraltyFit {
  readonly type: 'fit'
  readonly method: 'admiralty'
  readonly stationId: string
  readonly windowStartSec: number
  readonly windowEndSec: number
  readonly sampleCount: number
  readonly lengthDays: number
  readonly meanLevelM: number
  readonly datumCode: string
  readonly constants: readonly AdmiraltyConstant[]
  readonly residualRmsM: number
  readonly nodalEpochSec: number
  readonly nodeLongitudeDeg: number
  /**
   * Admiralty does not form a design matrix, so it has no condition number of
   * its own. What it has instead is a fixed list of what it refused to solve
   * for and inferred, which is the same admission in a different form.
   */
  readonly inferred: readonly ConstituentName[]
}

export type AdmiraltyOutcome = AdmiraltyFit | HarmonicRefusal

/**
 * Inference relations from the equilibrium tide, as the Admiralty tables use
 * them: the amplitude ratio of the constituent to its neighbour, with equal
 * phase lag. Schureman 1958 §142; Admiralty Tide Tables, NP 159.
 */
export const INFERENCE_RELATIONS: ReadonlyArray<{
  readonly target: ConstituentName
  readonly from: ConstituentName
  readonly ratio: number
  readonly phaseOffsetDeg: number
}> = [
  { target: 'K2', from: 'S2', ratio: 0.27, phaseOffsetDeg: 0 },
  { target: 'P1', from: 'K1', ratio: 0.331, phaseOffsetDeg: 0 },
]

/** The seven the scheme determines directly, plus the two it infers. */
export const ADMIRALTY_DIRECT: readonly ConstituentName[] = [
  'M2',
  'S2',
  'N2',
  'K1',
  'O1',
  'M4',
  'MS4',
]

const MINIMUM_DAYS = 14

export interface AdmiraltyOptions {
  readonly record: TideRecord
  readonly nodalEpochSec?: number
}

/**
 * Project the record onto one constituent's argument, ignoring the others.
 * This is the step that distinguishes the method: no joint solve, no normal
 * matrix, and therefore no correction for the correlation between neighbours.
 */
function project(
  record: TideRecord,
  name: ConstituentName,
  meanLevelM: number,
  nodeLongitudeDeg: number,
): { amplitudeM: number; phaseDeg: number; f: number; uDeg: number } {
  const definition = constituent(name)
  const nodal = nodalCorrection(definition.nodal, nodeLongitudeDeg)

  let sumCos = 0
  let sumSin = 0
  let sumCosCos = 0
  let sumSinSin = 0

  for (let i = 0; i < record.timesSec.length; i += 1) {
    const elements = astronomicalElements(record.timesSec[i] as number)
    const V = equilibriumArgument(definition.coefficients, definition.offsetDeg, elements)
    const angle = (V + nodal.uDeg) * DEG_TO_RAD
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const y = (record.heightsM[i] as number) - meanLevelM
    sumCos += y * c
    sumSin += y * s
    sumCosCos += c * c
    sumSinSin += s * s
  }

  const a = sumCosCos === 0 ? 0 : sumCos / sumCosCos
  const b = sumSinSin === 0 ? 0 : sumSin / sumSinSin
  return {
    amplitudeM: Math.hypot(a, b) / nodal.f,
    phaseDeg: normaliseDegrees(Math.atan2(b, a) * RAD_TO_DEG),
    f: nodal.f,
    uDeg: nodal.uDeg,
  }
}

export function admiraltyFit(options: AdmiraltyOptions): AdmiraltyOutcome {
  const { record } = options
  const availableHours = recordLengthHours(record)
  const availableDays = availableHours / 24

  if (availableDays < MINIMUM_DAYS) {
    return {
      type: 'refusal',
      method: 'admiralty',
      stationId: record.stationId,
      reason: 'insufficient-data',
      message: `Metode Admiralty membutuhkan sekurangnya ${MINIMUM_DAYS} hari rekaman jam-jaman; tersedia ${availableDays.toFixed(1)} hari.`,
      conflicts: [],
      assessment: { type: 'resolvable', constituents: [], availableHours, tightestPair: null },
      availableDays,
      requiredDays: MINIMUM_DAYS,
    }
  }

  const nodalEpochSec = options.nodalEpochSec ?? recordCentreSec(record)
  const nodeLongitudeDeg = astronomicalElements(nodalEpochSec).N

  let sum = 0
  for (let i = 0; i < record.heightsM.length; i += 1) sum += record.heightsM[i] as number
  const meanLevelM = sum / record.heightsM.length

  const direct = new Map<ConstituentName, AdmiraltyConstant>()
  for (const name of ADMIRALTY_DIRECT) {
    const projected = project(record, name, meanLevelM, nodeLongitudeDeg)
    direct.set(name, {
      name,
      species: constituent(name).species,
      doodsonNumber: constituentDoodsonNumber(name),
      speedDegPerHour: 0,
      amplitudeM: projected.amplitudeM,
      phaseDeg: projected.phaseDeg,
      // The scheme yields no formal uncertainty; saying so beats inventing one.
      amplitudeErrorM: Number.NaN,
      phaseErrorDeg: Number.NaN,
      nodalF: projected.f,
      nodalUDeg: projected.uDeg,
      determination: 'langsung',
    })
  }

  const constants: AdmiraltyConstant[] = [...direct.values()]
  const inferred: ConstituentName[] = []
  for (const relation of INFERENCE_RELATIONS) {
    const parent = direct.get(relation.from)
    if (parent === undefined) continue
    const definition = constituent(relation.target)
    const nodal = nodalCorrection(definition.nodal, nodeLongitudeDeg)
    constants.push({
      name: relation.target,
      species: definition.species,
      doodsonNumber: constituentDoodsonNumber(relation.target),
      speedDegPerHour: 0,
      amplitudeM: parent.amplitudeM * relation.ratio,
      phaseDeg: normaliseDegrees(parent.phaseDeg + relation.phaseOffsetDeg),
      amplitudeErrorM: Number.NaN,
      phaseErrorDeg: Number.NaN,
      nodalF: nodal.f,
      nodalUDeg: nodal.uDeg,
      determination: 'disimpulkan',
      inferredFrom: relation.from,
      inferenceRatio: relation.ratio,
    })
    inferred.push(relation.target)
  }

  // Residual against the record, on the same footing as the least-squares fit.
  let sumSquares = 0
  for (let i = 0; i < record.timesSec.length; i += 1) {
    const elements = astronomicalElements(record.timesSec[i] as number)
    let modelled = meanLevelM
    for (const c of constants) {
      const definition = constituent(c.name)
      const V = equilibriumArgument(definition.coefficients, definition.offsetDeg, elements)
      modelled += c.nodalF * c.amplitudeM * Math.cos((V + c.nodalUDeg - c.phaseDeg) * DEG_TO_RAD)
    }
    const r = (record.heightsM[i] as number) - modelled
    sumSquares += r * r
  }

  const n = record.timesSec.length
  return {
    type: 'fit',
    method: 'admiralty',
    stationId: record.stationId,
    windowStartSec: record.timesSec[0] as number,
    windowEndSec: record.timesSec[n - 1] as number,
    sampleCount: n,
    lengthDays: availableDays,
    meanLevelM,
    datumCode: record.datum.code,
    constants: constants.sort((a, b) => b.amplitudeM - a.amplitudeM),
    residualRmsM: Math.sqrt(sumSquares / n),
    nodalEpochSec,
    nodeLongitudeDeg,
    inferred,
  }
}

export interface MethodComparisonRow {
  readonly name: ConstituentName
  readonly leastSquaresAmplitudeM: number | null
  readonly admiraltyAmplitudeM: number | null
  readonly leastSquaresPhaseDeg: number | null
  readonly admiraltyPhaseDeg: number | null
  readonly amplitudeDifferenceM: number | null
  /** Signed, wrapped to (−180, 180]. */
  readonly phaseDifferenceDeg: number | null
  readonly determination: Determination | null
}

/** Side by side on the same record, differences made explicit. */
export function compareMethods(
  leastSquares: readonly ConstituentConstant[],
  admiralty: readonly AdmiraltyConstant[],
): MethodComparisonRow[] {
  const names = new Set<ConstituentName>([
    ...leastSquares.map((c) => c.name),
    ...admiralty.map((c) => c.name),
  ])

  return [...names]
    .map((name): MethodComparisonRow => {
      const lsq = leastSquares.find((c) => c.name === name) ?? null
      const adm = admiralty.find((c) => c.name === name) ?? null
      const phaseDifferenceDeg =
        lsq === null || adm === null
          ? null
          : ((((lsq.phaseDeg - adm.phaseDeg) % 360) + 540) % 360) - 180

      return {
        name,
        leastSquaresAmplitudeM: lsq?.amplitudeM ?? null,
        admiraltyAmplitudeM: adm?.amplitudeM ?? null,
        leastSquaresPhaseDeg: lsq?.phaseDeg ?? null,
        admiraltyPhaseDeg: adm?.phaseDeg ?? null,
        amplitudeDifferenceM:
          lsq === null || adm === null ? null : lsq.amplitudeM - adm.amplitudeM,
        phaseDifferenceDeg,
        determination: adm?.determination ?? null,
      }
    })
    .sort((a, b) => (b.leastSquaresAmplitudeM ?? 0) - (a.leastSquaresAmplitudeM ?? 0))
}
