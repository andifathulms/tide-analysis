import { describe, expect, it } from 'vitest'
import {
  analyseAsymmetry,
  measureDurations,
  DETECTABLE_RATIO,
  STRONG_RATIO,
} from '@/lib/tide/asymmetry'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2026-01-01T00:00:00Z') / 1000)
const END = START + 60 * 86400

function tide(constants: readonly PredictableConstant[]) {
  return analyseAsymmetry({ constants, meanLevelM: 0, startSec: START, endSec: END })
}

describe('a tide with no shallow-water distortion', () => {
  it('rises and falls in equal times', () => {
    const durations = measureDurations({
      constants: [{ name: 'M2', amplitudeM: 1, phaseDeg: 40 }],
      meanLevelM: 0,
      startSec: START,
      endSec: END,
    })
    expect(durations.meanRiseHours).toBeCloseTo(durations.meanFallHours, 2)
    // Half an M2 period each way.
    expect(durations.meanRiseHours).toBeCloseTo(6.21, 1)
  })

  it('is reported as symmetric, with no direction claimed', () => {
    const result = tide([{ name: 'M2', amplitudeM: 1, phaseDeg: 40 }])
    expect(result?.type).toBe('hampir-simetris')
    expect(result?.belowNoise).toBe(true)
    expect(result?.amplitudeRatio).toBe(0)
  })
})

describe('the sign convention, fixed by simulation rather than memory', () => {
  /**
   * The claim under test is that 0° < 2g(M2) − g(M4) < 180° means the water
   * rises faster than it falls. Rather than trust that, every relative phase
   * is built as a synthetic tide and the durations are measured directly.
   */
  const cases: Array<{ gM4: number; relativePhase: number }> = []
  for (let gM4 = 0; gM4 < 360; gM4 += 15) {
    cases.push({ gM4, relativePhase: ((2 * 60 - gM4) % 360 + 360) % 360 })
  }

  it('every relative phase in (0, 180) measures a shorter rise', () => {
    for (const { gM4, relativePhase } of cases) {
      if (relativePhase <= 10 || relativePhase >= 170) continue // skip the turning points
      if (relativePhase >= 180) continue
      const result = tide([
        { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
        { name: 'M4', amplitudeM: 0.15, phaseDeg: gM4 },
      ])
      expect(result).not.toBeNull()
      expect(result?.shallowWater.differenceHours).toBeLessThan(0)
      expect(result?.type).toBe('pasang-lebih-cepat')
    }
  })

  it('every relative phase in (180, 360) measures a shorter fall', () => {
    for (const { gM4, relativePhase } of cases) {
      if (relativePhase <= 190 || relativePhase >= 350) continue
      const result = tide([
        { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
        { name: 'M4', amplitudeM: 0.15, phaseDeg: gM4 },
      ])
      expect(result).not.toBeNull()
      expect(result?.shallowWater.differenceHours).toBeGreaterThan(0)
      expect(result?.type).toBe('surut-lebih-cepat')
    }
  })

  it('the harmonic indicator and the measured durations never disagree', () => {
    for (const { gM4 } of cases) {
      const result = tide([
        { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
        { name: 'M4', amplitudeM: 0.12, phaseDeg: gM4 },
      ])
      if (result === null || result.type === 'hampir-simetris') continue
      if (Math.abs(result.shallowWater.differenceHours) < 0.05) continue
      const measuredFasterRise = result.shallowWater.differenceHours < 0
      expect(measuredFasterRise).toBe(result.type === 'pasang-lebih-cepat')
    }
  })
})

describe('where the diurnal tide, not shallow water, sets the durations', () => {
  /**
   * At Jakarta's port the water takes 12.2 hours to rise and 8.9 to fall. That
   * is not shallow-water distortion: it is K1 and O1 shaping a diurnal day.
   * The two statements must be allowed to differ, and the difference must be
   * reported rather than resolved by picking one.
   */
  const diurnal: readonly PredictableConstant[] = [
    { name: 'M2', amplitudeM: 0.07, phaseDeg: 60 },
    { name: 'M4', amplitudeM: 0.006, phaseDeg: 300 },
    { name: 'K1', amplitudeM: 0.26, phaseDeg: 10 },
    { name: 'O1', amplitudeM: 0.15, phaseDeg: 340 },
  ]

  it('measures the real tide and the shallow-water pair separately', () => {
    const result = tide(diurnal)
    expect(result).not.toBeNull()
    // The real tide takes far longer than an M2 half-cycle either way.
    expect(result?.actual.meanRiseHours as number).toBeGreaterThan(8)
    // The M2/M4 pair on its own is still a semidiurnal wave.
    expect(result?.shallowWater.meanRiseHours as number).toBeLessThan(8)
  })

  it('says plainly when the two point in different directions', () => {
    const conflicting: readonly PredictableConstant[] = [
      { name: 'M2', amplitudeM: 0.4, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.05, phaseDeg: 30 },
      { name: 'K1', amplitudeM: 0.5, phaseDeg: 10 },
      { name: 'O1', amplitudeM: 0.3, phaseDeg: 340 },
    ]
    const result = tide(conflicting)
    expect(result).not.toBeNull()
    expect(typeof result?.directionsAgree).toBe('boolean')
    if (
      Math.sign(result?.shallowWater.differenceHours as number) !==
      Math.sign(result?.actual.differenceHours as number)
    ) {
      expect(result?.directionsAgree).toBe(false)
    }
  })

  it('on a semidiurnal coast the two agree, which is the normal case', () => {
    const result = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'S2', amplitudeM: 0.4, phaseDeg: 90 },
      { name: 'M4', amplitudeM: 0.12, phaseDeg: 30 },
    ])
    expect(result?.directionsAgree).toBe(true)
  })
})

describe('how much asymmetry', () => {
  it('a bigger M4 skews the curve further', () => {
    const gentle = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.05, phaseDeg: 30 },
    ])
    const strong = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.2, phaseDeg: 30 },
    ])
    expect(Math.abs(strong?.shallowWater.differenceHours as number)).toBeGreaterThan(
      Math.abs(gentle?.shallowWater.differenceHours as number),
    )
    expect(strong?.amplitudeRatio).toBeGreaterThan(gentle?.amplitudeRatio as number)
  })

  it('grades the distortion against stated thresholds', () => {
    const weak = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.005, phaseDeg: 30 },
    ])
    const medium = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.02, phaseDeg: 30 },
    ])
    const strong = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.1, phaseDeg: 30 },
    ])
    expect(weak?.strength).toBe('lemah')
    expect(weak?.belowNoise).toBe(true)
    expect(medium?.strength).toBe('sedang')
    expect(strong?.strength).toBe('kuat')
    expect(DETECTABLE_RATIO).toBeLessThan(STRONG_RATIO)
  })

  it('rise and fall still add up to the tidal period', () => {
    const result = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'M4', amplitudeM: 0.15, phaseDeg: 30 },
    ])
    expect(
      (result?.shallowWater.meanRiseHours as number) +
        (result?.shallowWater.meanFallHours as number),
    ).toBeCloseTo(12.42, 1)
  })

  it('refuses to speak without M2', () => {
    expect(tide([{ name: 'K1', amplitudeM: 0.5, phaseDeg: 10 }])).toBeNull()
  })

  it('reports the spring-neap pair when MS4 is present', () => {
    const result = tide([
      { name: 'M2', amplitudeM: 1, phaseDeg: 60 },
      { name: 'S2', amplitudeM: 0.4, phaseDeg: 90 },
      { name: 'M4', amplitudeM: 0.1, phaseDeg: 30 },
      { name: 'MS4', amplitudeM: 0.05, phaseDeg: 45 },
    ])
    expect(result?.msRelativePhaseDeg).toBeCloseTo(((60 + 90 - 45) % 360), 6)
  })
})
