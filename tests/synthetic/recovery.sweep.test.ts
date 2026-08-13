import { describe, expect, it } from 'vitest'
import { recoverySweep, INVENTED_TIDE } from '@/lib/tide/recovery'

/**
 * The panel this feeds shows a reader numbers they can check against numbers
 * they were told went in. If the two ever stop corresponding the page becomes
 * a lie rather than a demonstration, so the correspondence is asserted here.
 */
describe('the recovery sweep', () => {
  const rows = recoverySweep()

  it('recovers a noiseless record exactly', () => {
    const clean = rows.find((row) => row.noiseSigmaM === 0)!
    for (const constant of clean.recovered) {
      expect(constant.fittedM).toBeCloseTo(constant.truthM, 9)
      expect(constant.phaseErrorDeg).toBeLessThan(1e-6)
    }
    expect(clean.residualRmsM).toBeLessThan(1e-9)
  })

  it('reports the truth it was given, not a rounded copy of the answer', () => {
    for (const row of rows) {
      for (const constant of row.recovered) {
        const truth = INVENTED_TIDE.find((c) => c.name === constant.name)!
        expect(constant.truthM).toBe(truth.amplitudeM)
        expect(constant.truthPhaseDeg).toBe(truth.phaseDeg)
      }
    }
  })

  it('degrades with noise, and monotonically', () => {
    const worst = rows.map((row) => row.worstErrorM)
    for (let i = 1; i < worst.length; i += 1) {
      expect(worst[i]!).toBeGreaterThanOrEqual(worst[i - 1]!)
    }
  })

  it('averages noise down by a large factor — the point of the panel', () => {
    // 15 cm of noise on every hourly reading, and sixty days of it, must still
    // leave every amplitude within a centimetre. If this ever fails, either
    // the solver regressed or the claim the page makes is no longer true.
    const rough = rows[rows.length - 1]!
    expect(rough.noiseSigmaM).toBeGreaterThanOrEqual(0.15)
    expect(rough.worstErrorM).toBeLessThan(0.01)
  })

  it('leaves the residual equal to the noise that was added', () => {
    // Nothing else is in this record, so the residual has nowhere else to come
    // from — which is what makes the residual an honest measure on real ones.
    for (const row of rows) {
      expect(row.residualRmsM).toBeCloseTo(row.noiseSigmaM, 2)
    }
  })

  it('is deterministic across runs', () => {
    expect(JSON.stringify(recoverySweep())).toEqual(JSON.stringify(rows))
  })
})
