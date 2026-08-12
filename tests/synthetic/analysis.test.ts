import { describe, expect, it } from 'vitest'
import { analyse } from '@/lib/view/analysis'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { resolvableSubset } from '@/lib/tide/rayleigh'
import { recordLengthHours } from '@/lib/tide/record'
import { STANDARD_SET } from '@/lib/tide/constituents'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2026-01-01T00:00:00Z') / 1000)

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.5, phaseDeg: 100 },
  { name: 'S2', amplitudeM: 0.25, phaseDeg: 140 },
  { name: 'K1', amplitudeM: 0.3, phaseDeg: 300 },
  { name: 'O1', amplitudeM: 0.2, phaseDeg: 280 },
]

/** A record of the length the bundled stations actually carry. */
function record(lengthDays: number) {
  return syntheticRecord({
    startSec: START,
    lengthDays,
    meanLevelM: 0.8,
    constants: TRUTH,
    noiseSigmaM: 0.05,
    seed: 5150,
  })
}

describe('holding a window out changes what is resolvable', () => {
  /**
   * A 212-day record separates K1 from P1. Fit two thirds of it and the window
   * is 141 days, which does not — so the fallback subset has to be computed on
   * the window that will be fitted, not on the record it came from.
   */
  const full = record(212)
  const fittedHours = recordLengthHours(full) * (2 / 3)

  it('the standard set is refused on the fitted window', () => {
    const analysis = analyse({ record: full, constituents: STANDARD_SET, fitFraction: 2 / 3 })
    expect(analysis.outcome.type).toBe('refusal')
  })

  it('the subset resolvable on the whole record is not resolvable on the window', () => {
    const wholeRecord = resolvableSubset(STANDARD_SET, recordLengthHours(full)).kept
    const window = resolvableSubset(STANDARD_SET, fittedHours).kept
    expect(wholeRecord.length).toBeGreaterThan(window.length)
    expect(wholeRecord).toContain('P1')
    expect(window).not.toContain('P1')
  })

  it('the window subset fits, and the whole-record subset would not', () => {
    const windowSet = resolvableSubset(STANDARD_SET, fittedHours).kept
    const recordSet = resolvableSubset(STANDARD_SET, recordLengthHours(full)).kept

    expect(analyse({ record: full, constituents: windowSet, fitFraction: 2 / 3 }).outcome.type).toBe(
      'fit',
    )
    expect(analyse({ record: full, constituents: recordSet, fitFraction: 2 / 3 }).outcome.type).toBe(
      'refusal',
    )
  })
})

describe('the analysis a station page renders', () => {
  const analysis = analyse({
    record: record(212),
    constituents: ['M2', 'S2', 'N2', 'K1', 'O1'],
    fitFraction: 2 / 3,
  })

  it('models the whole record, including the part it never fitted', () => {
    if (analysis.outcome.type !== 'fit') throw new Error('expected a fit')
    expect(analysis.series?.modelM.length).toBe(analysis.series?.observedM.length)
    expect(analysis.heldOutWindow).not.toBeNull()
    expect(analysis.heldOutResidualRmsM).not.toBeNull()
  })

  it('reports the fitted and held-out residuals separately', () => {
    expect(analysis.fitResidualRmsM as number).toBeGreaterThan(0)
    expect(analysis.heldOutResidualRmsM as number).toBeGreaterThan(0)
    expect(analysis.heldOutResidualRmsM as number).toBeLessThan(
      (analysis.fitResidualRmsM as number) * 2,
    )
  })

  it('classifies the tide from the constants it fitted', () => {
    expect(analysis.formzahl?.value).toBeCloseTo((0.3 + 0.2) / (0.5 + 0.25), 2)
  })
})
