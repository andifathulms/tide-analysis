/**
 * The one demonstration where the answer is known in advance.
 *
 * Every other number on this site is fitted from a real record, and a reader
 * has no way to check it — there is nothing to compare the answer against,
 * because the sea does not publish its own constants. That is the honest
 * situation and it is also a pedagogical dead end: "trust the method" is
 * exactly what this project refuses to say.
 *
 * So: generate a record from constants *we* chose, add noise we chose, fit it
 * with the same solver every station page uses, and print what came back
 * beside what went in. PRD §8 calls this the backbone of the test suite —
 * "you control the answer, so correctness is provable rather than plausible" —
 * and it has never been shown to a reader.
 *
 * The constants below are invented. They are not a place, they are not
 * published values, and nothing else on the site reads them. That is what
 * keeps this inside invariant 2: no station's constants ship as data, and
 * these are not a station's.
 *
 * Pure and deterministic: one fixed seed, so the numbers a reader sees are the
 * numbers the next build produces.
 */

import type { ConstituentName } from './constituents'
import { fitHarmonics } from './fit'
import { syntheticRecord } from './synthetic'
import type { PredictableConstant } from './predict'
import { angularDistanceDeg } from './stability'

/**
 * A tide we made up. Round numbers on purpose: a reader should be able to see
 * at a glance that 0.600 went in and 0.5987 came out.
 */
export const INVENTED_TIDE: readonly PredictableConstant[] = Object.freeze([
  { name: 'M2' as ConstituentName, amplitudeM: 0.6, phaseDeg: 120 },
  { name: 'S2' as ConstituentName, amplitudeM: 0.3, phaseDeg: 150 },
  { name: 'K1' as ConstituentName, amplitudeM: 0.25, phaseDeg: 300 },
  { name: 'O1' as ConstituentName, amplitudeM: 0.15, phaseDeg: 280 },
])

/** Sea level noise in metres: none, a calm gauge, a normal one, a rough week. */
const NOISE_LEVELS = [0, 0.02, 0.05, 0.15] as const

/** Long enough to resolve the four cleanly, short enough to be a real survey. */
export const RECOVERY_LENGTH_DAYS = 60
const LENGTH_DAYS = RECOVERY_LENGTH_DAYS

/** Arbitrary and fixed, so the page is the same on every build. */
const SEED = 20260101
const START_SEC = Math.round(Date.parse('2026-01-01T00:00:00Z') / 1000)

export interface RecoveredConstant {
  readonly name: ConstituentName
  readonly truthM: number
  readonly fittedM: number
  /** Fitted minus truth, metres. Signed: which way the fit was wrong. */
  readonly errorM: number
  readonly truthPhaseDeg: number
  readonly fittedPhaseDeg: number
  /** Shortest angular distance between the two, degrees. */
  readonly phaseErrorDeg: number
}

export interface RecoveryRow {
  readonly noiseSigmaM: number
  readonly conditionNumber: number
  readonly residualRmsM: number
  readonly recovered: readonly RecoveredConstant[]
  /** Largest amplitude error across the four, metres — the headline. */
  readonly worstErrorM: number
}

export function recoverySweep(): RecoveryRow[] {
  const names = INVENTED_TIDE.map((c) => c.name)
  const rows: RecoveryRow[] = []

  for (const noiseSigmaM of NOISE_LEVELS) {
    const record = syntheticRecord({
      startSec: START_SEC,
      lengthDays: LENGTH_DAYS,
      constants: INVENTED_TIDE,
      noiseSigmaM,
      seed: SEED,
      nodalEpochSec: START_SEC + Math.round((LENGTH_DAYS * 86400) / 2),
    })

    const outcome = fitHarmonics({ record, constituents: names })
    if (outcome.type !== 'fit') continue

    const recovered = INVENTED_TIDE.map((truth): RecoveredConstant => {
      const fitted = outcome.constants.find((c) => c.name === truth.name)
      const fittedM = fitted?.amplitudeM ?? Number.NaN
      const fittedPhaseDeg = fitted?.phaseDeg ?? Number.NaN
      return {
        name: truth.name,
        truthM: truth.amplitudeM,
        fittedM,
        errorM: fittedM - truth.amplitudeM,
        truthPhaseDeg: truth.phaseDeg,
        fittedPhaseDeg,
        phaseErrorDeg: angularDistanceDeg(fittedPhaseDeg, truth.phaseDeg),
      }
    })

    rows.push({
      noiseSigmaM,
      conditionNumber: outcome.conditionNumber,
      residualRmsM: outcome.residualRmsM,
      recovered,
      worstErrorM: Math.max(...recovered.map((r) => Math.abs(r.errorM))),
    })
  }

  return rows
}
