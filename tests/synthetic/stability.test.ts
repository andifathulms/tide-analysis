import { describe, expect, it } from 'vitest'
import { windowStability, angularDistanceDeg } from '@/lib/tide/stability'
import { syntheticRecord } from '@/lib/tide/synthetic'
import type { ConstituentName } from '@/lib/tide/constituents'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
]

const SET: ConstituentName[] = ['M2', 'S2', 'K1', 'O1']

function record(lengthDays: number, noiseSigmaM: number) {
  return syntheticRecord({
    startSec: START,
    lengthDays,
    constants: TRUTH,
    noiseSigmaM,
    seed: 31337,
    nodalEpochSec: START + Math.round((lengthDays * 86400) / 2),
  })
}

describe('angular distance', () => {
  it('measures on the circle, not the number line', () => {
    // The reason phases cannot be compared by subtraction.
    expect(angularDistanceDeg(359, 1)).toBeCloseTo(2, 9)
    expect(angularDistanceDeg(1, 359)).toBeCloseTo(2, 9)
    expect(angularDistanceDeg(10, 190)).toBeCloseTo(180, 9)
    expect(angularDistanceDeg(0, 0)).toBe(0)
  })
})

describe('stability across windows of one record', () => {
  it('finds a clean record to be the same tide in every stretch', () => {
    // No noise: the constants are genuinely a property of this "place", and
    // four separate stretches must agree to well inside a percent.
    const report = windowStability({ record: record(240, 0), constituents: SET })
    expect(report.windows).toHaveLength(4)
    for (const constituent of report.constituents) {
      expect(constituent.amplitudeSpread).toBeLessThan(0.01)
      expect(constituent.phaseSpreadDeg).toBeLessThan(1)
    }
  })

  it('spreads the small constituents further than the large ones under noise', () => {
    // The lesson the panel exists to carry: what moves between stretches is
    // the constituents whose signal is closest to the noise.
    const report = windowStability({ record: record(240, 0.12), constituents: SET })
    const m2 = report.constituents.find((c) => c.name === 'M2')!
    const o1 = report.constituents.find((c) => c.name === 'O1')!
    expect(o1.amplitudeSpread).toBeGreaterThan(m2.amplitudeSpread)
    expect(o1.phaseSpreadDeg).toBeGreaterThan(m2.phaseSpreadDeg)
  })

  it('brackets the truth it was generated from', () => {
    const report = windowStability({ record: record(240, 0.05), constituents: SET })
    const m2 = report.constituents.find((c) => c.name === 'M2')!
    expect(m2.minAmplitudeM).toBeLessThanOrEqual(0.62)
    expect(m2.maxAmplitudeM).toBeGreaterThanOrEqual(0.62)
    expect(m2.meanAmplitudeM).toBeCloseTo(0.62, 2)
  })

  it('reports a constituent no window could resolve as incomparable, not as zero', () => {
    // Four windows of 60 days cannot separate K1 from P1, so P1 must be named
    // as uncomparable rather than silently given a number.
    const report = windowStability({
      record: record(240, 0),
      constituents: [...SET, 'P1'],
    })
    expect(report.incomparable).toContain('P1')
    expect(report.constituents.map((c) => c.name)).not.toContain('P1')
  })

  it('compares phases across the 0/360 seam without inventing a spread', () => {
    const wrapping: readonly PredictableConstant[] = [
      { name: 'M2', amplitudeM: 0.62, phaseDeg: 0.4 },
      { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
    ]
    const rec = syntheticRecord({
      startSec: START,
      lengthDays: 240,
      constants: wrapping,
      noiseSigmaM: 0.02,
      seed: 5,
      nodalEpochSec: START + 120 * 86400,
    })
    const report = windowStability({ record: rec, constituents: ['M2', 'S2'] })
    const m2 = report.constituents.find((c) => c.name === 'M2')!
    // Windows will straddle 0° and 359°; a naive subtraction would report
    // something close to 180 here.
    expect(m2.phaseSpreadDeg).toBeLessThan(10)
  })

  it('declines when a window has fewer samples than parameters', () => {
    // Four windows of six hours: six samples each against ten parameters.
    // There is nothing to say and it must not say anything.
    const report = windowStability({ record: record(1, 0), constituents: SET, windows: 4 })
    expect(report.constituents).toEqual([])
  })

  it('reports a window too short to trust as a wide spread, not a confident number', () => {
    // Three days cut four ways leaves eighteen hours per window. Rayleigh is
    // satisfied for M2 alone — it needs 12.4 hours to separate from the mean —
    // so a fit happens and returns something. The honest signal is not a
    // refusal here but the spread: the answer moves by a quarter of itself
    // between stretches, which is exactly what this panel exists to expose.
    const report = windowStability({ record: record(3, 0), constituents: SET })
    const m2 = report.constituents.find((c) => c.name === 'M2')
    expect(m2).toBeDefined()
    expect(m2!.amplitudeSpread).toBeGreaterThan(0.1)
  })

  it('is deterministic', () => {
    const rec = record(240, 0.05)
    const a = windowStability({ record: rec, constituents: SET })
    const b = windowStability({ record: rec, constituents: SET })
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })
})
