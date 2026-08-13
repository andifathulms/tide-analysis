import { describe, expect, it } from 'vitest'
import { deriveConstituent, largestConstituent } from '@/lib/view/derivation'
import { fitHarmonics } from '@/lib/tide/fit'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { constituentSpeed } from '@/lib/tide/constituents'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
]

function fitted(lengthDays = 90) {
  const record = syntheticRecord({
    startSec: START,
    lengthDays,
    constants: TRUTH,
    noiseSigmaM: 0,
    seed: 7,
    nodalEpochSec: START + Math.round((lengthDays * 86400) / 2),
  })
  const outcome = fitHarmonics({ record, constituents: ['M2', 'S2', 'K1', 'O1'] })
  if (outcome.type !== 'fit') throw new Error('expected a fit')
  return { record, outcome }
}

/**
 * The panel's claim to a reader is that the arithmetic it prints reproduces
 * the number in the table above it. If that stops being true the worked
 * example is worse than no worked example.
 */
describe('the worked derivation', () => {
  it('rebuilds the reported constant from the pair it shows', () => {
    const { record, outcome } = fitted()
    const constant = largestConstituent(outcome.constants)!
    const derivation = deriveConstituent({
      record,
      constant,
      meanLevelM: outcome.meanLevelM,
    })!

    expect(derivation.amplitudeM).toBeCloseTo(constant.amplitudeM, 10)
    expect(derivation.phaseDeg).toBeCloseTo(constant.phaseDeg, 8)
  })

  it('picks the constituent that dominates the record', () => {
    const { outcome } = fitted()
    expect(largestConstituent(outcome.constants)?.name).toBe('M2')
  })

  it('advances the argument by the constituent speed, one hour per row', () => {
    // What a reader is invited to check against the speed column themselves.
    const { record, outcome } = fitted()
    const constant = largestConstituent(outcome.constants)!
    const d = deriveConstituent({ record, constant, meanLevelM: outcome.meanLevelM, rows: 4 })!

    for (let i = 1; i < d.rows.length; i += 1) {
      const previous = d.rows[i - 1]!
      const current = d.rows[i]!
      expect(current.atSec - previous.atSec).toBe(3600)
      let step = current.argumentDeg - previous.argumentDeg
      if (step < 0) step += 360
      expect(step).toBeCloseTo(constituentSpeed('M2'), 4)
    }
  })

  it('gives a contribution that never exceeds the constituent amplitude', () => {
    const { record, outcome } = fitted()
    const constant = largestConstituent(outcome.constants)!
    const d = deriveConstituent({ record, constant, meanLevelM: outcome.meanLevelM })!
    const peak = constant.amplitudeM * constant.nodalF
    for (const row of d.rows) {
      expect(Math.abs(row.contributionM)).toBeLessThanOrEqual(peak + 1e-12)
    }
  })

  it('converts the phase lag into hours consistently with the speed', () => {
    const { record, outcome } = fitted()
    const constant = largestConstituent(outcome.constants)!
    const d = deriveConstituent({ record, constant, meanLevelM: outcome.meanLevelM })!
    expect(d.lagHours * constant.speedDegPerHour).toBeCloseTo(constant.phaseDeg, 8)
    // M2 runs at ~29°/h, so a lag can never reach half a day.
    expect(d.lagHours).toBeLessThan(360 / constituentSpeed('M2'))
  })

  it('declines rather than inventing rows on a record too short to show', () => {
    const record = syntheticRecord({
      startSec: START,
      lengthDays: 0.05,
      constants: TRUTH,
      noiseSigmaM: 0,
      seed: 7,
      nodalEpochSec: START,
    })
    const { outcome } = fitted()
    const constant = largestConstituent(outcome.constants)!
    expect(
      deriveConstituent({ record, constant, meanLevelM: 0, rows: 40 }),
    ).toBeNull()
  })

  it('is deterministic', () => {
    const { record, outcome } = fitted()
    const constant = largestConstituent(outcome.constants)!
    const args = { record, constant, meanLevelM: outcome.meanLevelM }
    expect(JSON.stringify(deriveConstituent(args))).toEqual(
      JSON.stringify(deriveConstituent(args)),
    )
  })
})
