import { describe, expect, it } from 'vitest'
import { residualLeakage } from '@/lib/tide/leakage'
import { modelAtRecordTimes, fitHarmonics, type HarmonicFit } from '@/lib/tide/fit'
import { residual } from '@/lib/tide/predict'
import { syntheticRecord } from '@/lib/tide/synthetic'
import type { ConstituentName } from '@/lib/tide/constituents'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)
const DAY = 86400

/** P1 is the one that hides behind K1 on anything short of half a year. */
const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'P1', amplitudeM: 0.11, phaseDeg: 296 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
]

function record(lengthDays: number, noiseSigmaM = 0) {
  return syntheticRecord({
    startSec: START,
    lengthDays,
    constants: TRUTH,
    noiseSigmaM,
    seed: 90210,
    nodalEpochSec: START + Math.round((lengthDays * DAY) / 2),
  })
}

/** Fit a chosen set, then hand back the residual it left behind. */
function fitAnd(lengthDays: number, fitted: readonly ConstituentName[], noiseSigmaM = 0) {
  const rec = record(lengthDays, noiseSigmaM)
  const outcome = fitHarmonics({ record: rec, constituents: fitted })
  if (outcome.type !== 'fit') throw new Error('expected a fit')
  const model = modelAtRecordTimes(rec, outcome as HarmonicFit)
  return { rec, outcome, residualM: residual(rec.heightsM, model) }
}

describe('what a refusal costs', () => {
  it('recovers a left-out constituent accurately when nothing hides it', () => {
    // A year of record separates P1 from K1 comfortably. Leave P1 out of the
    // fit anyway: its energy lands in the residual, uncontaminated, and the
    // projection finds it. This is the control — it says the probe works.
    const { rec, outcome, residualM } = fitAnd(365, ['M2', 'S2', 'K1', 'O1'])
    const [p1] = residualLeakage({
      timesSec: rec.timesSec,
      residualM,
      fitted: outcome.constants.map((c) => c.name),
      refused: ['P1'],
      nodalEpochSec: outcome.nodalEpochSec,
    })

    expect(p1!.isolated).toBe(true)
    expect(p1!.confoundedWith).toHaveLength(0)
    expect(p1!.magnitudeM).toBeCloseTo(0.11, 2)
  })

  it('flags the estimate as confounded when the record is too short to separate', () => {
    // Thirty days. P1 and K1 are the same wave here, so K1 has already
    // absorbed most of P1 and what is left in the residual is not P1's
    // amplitude. The magnitude must still come back — the reader asked how
    // much is at stake — but never without the confounding named.
    const { rec, outcome, residualM } = fitAnd(30, ['M2', 'S2', 'K1', 'O1'])
    const [p1] = residualLeakage({
      timesSec: rec.timesSec,
      residualM,
      fitted: outcome.constants.map((c) => c.name),
      refused: ['P1'],
      nodalEpochSec: outcome.nodalEpochSec,
    })

    expect(p1!.isolated).toBe(false)
    expect(p1!.confoundedWith.map((c) => c.name)).toContain('K1')
    expect(p1!.worstCorrelation).toBeGreaterThan(0.9)

    // And the estimate is indeed wrong — badly enough that reporting it as a
    // constant would be a lie. This asserts the honesty, not the accuracy.
    expect(Math.abs(p1!.magnitudeM - 0.11)).toBeGreaterThan(0.02)
  })

  it('finds nothing at a frequency the record does not contain', () => {
    // Q1 is not in TRUTH. On a clean synthetic there is no Q1 energy, and the
    // probe must not manufacture some.
    const { rec, outcome, residualM } = fitAnd(365, ['M2', 'S2', 'K1', 'O1', 'P1'])
    const [q1] = residualLeakage({
      timesSec: rec.timesSec,
      residualM,
      fitted: outcome.constants.map((c) => c.name),
      refused: ['Q1'],
      nodalEpochSec: outcome.nodalEpochSec,
    })
    expect(q1!.magnitudeM).toBeLessThan(0.005)
  })

  it('survives noise without inventing a constituent', () => {
    const { rec, outcome, residualM } = fitAnd(365, ['M2', 'S2', 'K1', 'O1', 'P1'], 0.05)
    const [q1] = residualLeakage({
      timesSec: rec.timesSec,
      residualM,
      fitted: outcome.constants.map((c) => c.name),
      refused: ['Q1'],
      nodalEpochSec: outcome.nodalEpochSec,
    })
    // Noise projects onto any frequency a little; it must stay far below the
    // smallest constituent anyone would report.
    expect(q1!.magnitudeM).toBeLessThan(0.01)
  })

  it('refuses to probe a constituent that was actually fitted', () => {
    const { rec, outcome, residualM } = fitAnd(365, ['M2', 'S2', 'K1', 'O1'])
    const estimates = residualLeakage({
      timesSec: rec.timesSec,
      residualM,
      fitted: outcome.constants.map((c) => c.name),
      refused: ['K1'],
      nodalEpochSec: outcome.nodalEpochSec,
    })
    expect(estimates).toEqual([])
  })

  it('returns nothing when nothing was refused, and is deterministic', () => {
    const { rec, outcome, residualM } = fitAnd(120, ['M2', 'S2', 'K1', 'O1'])
    const args = {
      timesSec: rec.timesSec,
      residualM,
      fitted: outcome.constants.map((c) => c.name),
      refused: [] as ConstituentName[],
      nodalEpochSec: outcome.nodalEpochSec,
    }
    expect(residualLeakage(args)).toEqual([])

    const withP1 = { ...args, refused: ['P1'] as ConstituentName[] }
    expect(JSON.stringify(residualLeakage(withP1))).toEqual(
      JSON.stringify(residualLeakage(withP1)),
    )
  })
})
