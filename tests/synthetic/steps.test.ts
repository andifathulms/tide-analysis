import { describe, expect, it } from 'vitest'
import { detectSteps, segmentsFor } from '@/lib/tide/steps'
import { fitHarmonics } from '@/lib/tide/fit'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { signedDegrees } from '@/lib/astro/time'
import type { PredictableConstant } from '@/lib/tide/predict'
import type { TideRecord } from '@/lib/tide/record'

const START = Math.round(Date.parse('2026-01-01T00:00:00Z') / 1000)

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'N2', amplitudeM: 0.14, phaseDeg: 96 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
]

const NAMES = TRUTH.map((c) => c.name)

/** A record whose gauge zero jumps partway through, as a reset does. */
function recordWithStep(
  lengthDays: number,
  stepAtDay: number,
  shiftM: number,
  noiseSigmaM = 0.04,
): { record: TideRecord; stepAtSec: number } {
  const base = syntheticRecord({
    startSec: START,
    lengthDays,
    meanLevelM: 1.4,
    constants: TRUTH,
    noiseSigmaM,
    seed: 8080,
  })
  const stepAtSec = START + stepAtDay * 86400
  const heightsM = Float64Array.from(base.heightsM)
  for (let i = 0; i < base.timesSec.length; i += 1) {
    if ((base.timesSec[i] as number) >= stepAtSec) {
      heightsM[i] = (heightsM[i] as number) + shiftM
    }
  }
  return { record: { ...base, heightsM }, stepAtSec }
}

describe('detecting a datum step', () => {
  it('finds a step, sized right and placed within half a day', () => {
    const { record, stepAtSec } = recordWithStep(60, 30, 0.45)
    const steps = detectSteps(record.timesSec, record.heightsM, record.intervalSec)

    expect(steps).toHaveLength(1)
    // The magnitude is provisional — two medians with weather still in them —
    // and good to roughly 20%. The fit refines it; see below.
    const shiftM = (steps[0] as { shiftM: number }).shiftM
    expect(shiftM).toBeGreaterThan(0.45 * 0.8)
    expect(shiftM).toBeLessThan(0.45 * 1.25)
    // The instant is not: the measured shift plateaus as the window slides
    // across the step, so half the window is the resolution of the method.
    expect(Math.abs((steps[0] as { atSec: number }).atSec - stepAtSec)).toBeLessThanOrEqual(
      12 * 3600,
    )
  })

  it('gets the sign right for a downward step', () => {
    const { record } = recordWithStep(60, 30, -0.4)
    const steps = detectSteps(record.timesSec, record.heightsM, record.intervalSec)
    expect(steps).toHaveLength(1)
    expect((steps[0] as { shiftM: number }).shiftM).toBeLessThan(0)
  })

  it('finds several steps in one record', () => {
    const first = recordWithStep(120, 30, 0.5)
    const heightsM = Float64Array.from(first.record.heightsM)
    const secondAt = START + 80 * 86400
    for (let i = 0; i < first.record.timesSec.length; i += 1) {
      if ((first.record.timesSec[i] as number) >= secondAt) {
        heightsM[i] = (heightsM[i] as number) - 0.6
      }
    }
    const steps = detectSteps(first.record.timesSec, heightsM, first.record.intervalSec)
    expect(steps).toHaveLength(2)
    expect((steps[0] as { shiftM: number }).shiftM).toBeGreaterThan(0)
    expect((steps[1] as { shiftM: number }).shiftM).toBeLessThan(0)
  })

  it('declares nothing on a clean record', () => {
    const clean = syntheticRecord({
      startSec: START,
      lengthDays: 90,
      meanLevelM: 1.4,
      constants: TRUTH,
      noiseSigmaM: 0.06,
      seed: 3,
    })
    expect(detectSteps(clean.timesSec, clean.heightsM, clean.intervalSec)).toEqual([])
  })

  it('does not mistake a large tide for a step', () => {
    // A 3 m spring range moves the water far more than any plausible reset;
    // taking a day of medians either side is what tells them apart.
    const big = syntheticRecord({
      startSec: START,
      lengthDays: 90,
      constants: [
        { name: 'M2', amplitudeM: 1.5, phaseDeg: 20 },
        { name: 'S2', amplitudeM: 0.7, phaseDeg: 60 },
      ],
      noiseSigmaM: 0.05,
      seed: 4,
    })
    expect(detectSteps(big.timesSec, big.heightsM, big.intervalSec)).toEqual([])
  })

  it('does not call a gap a step', () => {
    // Either side of a gap the level may legitimately differ. Calling that a
    // step would be inventing a fact about hours nobody observed.
    const { record } = recordWithStep(60, 30, 0.45)
    const keep: number[] = []
    const heights: number[] = []
    for (let i = 0; i < record.timesSec.length; i += 1) {
      const t = record.timesSec[i] as number
      if (t >= START + 29 * 86400 && t < START + 31 * 86400) continue
      keep.push(t)
      heights.push(record.heightsM[i] as number)
    }
    const steps = detectSteps(
      Float64Array.from(keep),
      Float64Array.from(heights),
      record.intervalSec,
    )
    expect(steps).toEqual([])
  })

  it('ignores a shift too small to matter', () => {
    const { record } = recordWithStep(60, 30, 0.02)
    expect(detectSteps(record.timesSec, record.heightsM, record.intervalSec)).toEqual([])
  })
})

describe('what an unmodelled step costs, and what modelling it recovers', () => {
  const { record } = recordWithStep(90, 45, 0.5)

  const ignored = fitHarmonics({ record, constituents: NAMES, steps: [] })
  const modelled = fitHarmonics({ record, constituents: NAMES })

  it('both produce a fit', () => {
    expect(ignored.type).toBe('fit')
    expect(modelled.type).toBe('fit')
  })

  it('ignoring the step inflates the residual', () => {
    if (ignored.type !== 'fit' || modelled.type !== 'fit') throw new Error('expected fits')
    // The step is 0.5 m; unmodelled it lands squarely in the residual.
    expect(ignored.residualRmsM).toBeGreaterThan(0.2)
    expect(modelled.residualRmsM).toBeLessThan(0.06)
  })

  it('modelling it recovers the constants the step was hiding', () => {
    if (modelled.type !== 'fit') throw new Error('expected a fit')
    for (const truth of TRUTH) {
      const found = modelled.constants.find((c) => c.name === truth.name)
      expect(Math.abs((found as { amplitudeM: number }).amplitudeM - truth.amplitudeM)).toBeLessThan(
        0.01,
      )
      expect(
        Math.abs(signedDegrees((found as { phaseDeg: number }).phaseDeg - truth.phaseDeg)),
      ).toBeLessThan(2,)
    }
  })

  it('reports the shift as a result rather than absorbing it', () => {
    if (modelled.type !== 'fit') throw new Error('expected a fit')
    expect(modelled.levels).toHaveLength(2)
    expect(modelled.steps).toHaveLength(1)
    expect(modelled.levels[1]?.shiftFromPreviousM).toBeCloseTo(0.5, 1)
    expect(modelled.levels[0]?.meanLevelM).toBeCloseTo(1.4, 1)
    expect(modelled.levels[1]?.meanLevelM).toBeCloseTo(1.9, 1)
  })

  it('the reported Z0 is the level a prediction carries forward', () => {
    if (modelled.type !== 'fit') throw new Error('expected a fit')
    expect(modelled.meanLevelM).toBe(modelled.levels[modelled.levels.length - 1]?.meanLevelM)
  })

  it('a clean record still reports exactly one level and no steps', () => {
    const clean = syntheticRecord({
      startSec: START,
      lengthDays: 90,
      meanLevelM: 0.8,
      constants: TRUTH,
      noiseSigmaM: 0.05,
      seed: 12,
    })
    const outcome = fitHarmonics({ record: clean, constituents: NAMES })
    if (outcome.type !== 'fit') throw new Error('expected a fit')
    expect(outcome.steps).toEqual([])
    expect(outcome.levels).toHaveLength(1)
    expect(outcome.levels[0]?.shiftFromPreviousM).toBeNull()
    expect(outcome.meanLevelM).toBeCloseTo(0.8, 2)
  })

  it('the extra level column shows up in the conditioning, not in silence', () => {
    if (ignored.type !== 'fit' || modelled.type !== 'fit') throw new Error('expected fits')
    expect(Number.isFinite(modelled.conditionNumber)).toBe(true)
    expect(modelled.conditionNumber).toBeGreaterThan(1)
  })
})

describe('segments', () => {
  it('a record with no steps is one segment', () => {
    const times = Float64Array.from({ length: 100 }, (_, i) => START + i * 3600)
    expect(segmentsFor(times, [])).toEqual([{ startIndex: 0, endIndex: 99 }])
  })

  it('each step opens a new segment', () => {
    const times = Float64Array.from({ length: 100 }, (_, i) => START + i * 3600)
    const segments = segmentsFor(times, [
      { atSec: START + 30 * 3600, shiftM: 0.5, significance: 12 },
      { atSec: START + 70 * 3600, shiftM: -0.4, significance: 9 },
    ])
    expect(segments).toEqual([
      { startIndex: 0, endIndex: 29 },
      { startIndex: 30, endIndex: 69 },
      { startIndex: 70, endIndex: 99 },
    ])
  })
})
