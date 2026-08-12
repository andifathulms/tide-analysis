import { describe, expect, it } from 'vitest'
import { fitHarmonics, type HarmonicFit } from '@/lib/tide/fit'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { signedDegrees } from '@/lib/astro/time'
import type { ConstituentName } from '@/lib/tide/constituents'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)

/**
 * Tolerances, set once from the sweep below and documented here rather than
 * widened when something fails. If a case misses these, the solver or the
 * astronomy is wrong — in that order.
 */
const TOLERANCE = {
  /** Noise-free recovery of amplitude, metres. */
  cleanAmplitudeM: 1e-6,
  /** Noise-free recovery of phase, degrees. */
  cleanPhaseDeg: 1e-4,
  /** With noise: amplitude error as a multiple of σ/√N. */
  noisyAmplitudeSigmas: 6,
} as const

/** A mixed tide of the kind the archipelago actually produces. */
const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'N2', amplitudeM: 0.14, phaseDeg: 96 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
  { name: 'M4', amplitudeM: 0.05, phaseDeg: 41 },
]

function truthFor(name: ConstituentName): PredictableConstant {
  const found = TRUTH.find((c) => c.name === name)
  if (found === undefined) throw new Error(`No truth for ${name}`)
  return found
}

/** Centre of a window — where a fit evaluates f and u. */
function centreSec(startSec: number, lengthDays: number): number {
  return startSec + Math.round((lengthDays * 86400) / 2)
}

function fitOrThrow(record: Parameters<typeof fitHarmonics>[0]['record'], names: readonly ConstituentName[]): HarmonicFit {
  const outcome = fitHarmonics({ record, constituents: names })
  if (outcome.type === 'refusal') throw new Error(`Unexpected refusal: ${outcome.message}`)
  return outcome
}

describe('noise-free recovery of known constants', () => {
  const names = TRUTH.map((c) => c.name)
  // f and u held at the window centre in both generator and fit, so what is
  // being tested is the solver and the equilibrium arguments alone.
  const record = syntheticRecord({
    startSec: START,
    lengthDays: 90,
    meanLevelM: 1.4,
    constants: TRUTH,
    nodalEpochSec: centreSec(START, 90),
  })
  const fit = fitOrThrow(record, names)

  it('recovers the mean level', () => {
    expect(fit.meanLevelM).toBeCloseTo(1.4, 6)
  })

  for (const truth of TRUTH) {
    it(`recovers ${truth.name} amplitude and phase exactly`, () => {
      const recovered = fit.constants.find((c) => c.name === truth.name)
      expect(recovered).toBeDefined()
      expect(Math.abs((recovered as { amplitudeM: number }).amplitudeM - truth.amplitudeM)).toBeLessThan(
        TOLERANCE.cleanAmplitudeM,
      )
      expect(
        Math.abs(signedDegrees((recovered as { phaseDeg: number }).phaseDeg - truth.phaseDeg)),
      ).toBeLessThan(TOLERANCE.cleanPhaseDeg)
    })
  }

  it('reports a residual RMS at the numerical floor', () => {
    expect(fit.residualRmsM).toBeLessThan(1e-9)
  })

  it('reports a well-conditioned design matrix', () => {
    expect(fit.conditionNumber).toBeLessThan(10)
    expect(fit.conditioning).toBe('baik')
  })

  it('applies a nodal factor that is neither 1 nor hidden', () => {
    const m2 = fit.constants.find((c) => c.name === 'M2')
    expect(m2?.nodalF).toBeGreaterThan(0.9)
    expect(m2?.nodalF).toBeLessThan(1.1)
    expect(m2?.nodalF).not.toBe(1)
  })
})

describe('the cost of holding f and u at one epoch', () => {
  /**
   * A fit evaluates the nodal factors once, at the centre of the window; the
   * node keeps moving. This is the standard approximation for records shorter
   * than a year, and this test states what it costs rather than hiding it —
   * the error must be small, must be bounded, and must grow with the window.
   */
  const names = TRUTH.map((c) => c.name)

  function driftError(lengthDays: number): { residualRmsM: number; worstAmplitudeErrorM: number } {
    const record = syntheticRecord({ startSec: START, lengthDays, constants: TRUTH })
    const fit = fitOrThrow(record, names)
    const worst = Math.max(
      ...TRUTH.map((truth) => {
        const recovered = fit.constants.find((c) => c.name === truth.name)
        return Math.abs((recovered as { amplitudeM: number }).amplitudeM - truth.amplitudeM)
      }),
    )
    return { residualRmsM: fit.residualRmsM, worstAmplitudeErrorM: worst }
  }

  it('costs under 2 mm of residual over 90 days', () => {
    const { residualRmsM, worstAmplitudeErrorM } = driftError(90)
    expect(residualRmsM).toBeLessThan(0.002)
    expect(worstAmplitudeErrorM).toBeLessThan(0.002)
  })

  it('grows with the window — 365 days costs more than 30', () => {
    expect(driftError(365).residualRmsM).toBeGreaterThan(driftError(30).residualRmsM)
  })

  it('still stays under a centimetre over a full year', () => {
    expect(driftError(365).worstAmplitudeErrorM).toBeLessThan(0.01)
  })
})

describe('recovery across the noise sweep', () => {
  const names = TRUTH.map((c) => c.name)

  for (const noiseSigmaM of [0.01, 0.05, 0.15, 0.3]) {
    it(`σ = ${noiseSigmaM} m over 90 days`, () => {
      const record = syntheticRecord({
        startSec: START,
        lengthDays: 90,
        meanLevelM: 1.4,
        constants: TRUTH,
        noiseSigmaM,
        seed: 20250101,
      })
      const fit = fitOrThrow(record, names)
      // For white noise the amplitude uncertainty is about σ√(2/N).
      const expectedSigma = noiseSigmaM * Math.sqrt(2 / record.timesSec.length)

      for (const truth of TRUTH) {
        const recovered = fit.constants.find((c) => c.name === truth.name)
        expect(recovered).toBeDefined()
        const error = Math.abs((recovered as { amplitudeM: number }).amplitudeM - truth.amplitudeM)
        expect(error).toBeLessThan(TOLERANCE.noisyAmplitudeSigmas * expectedSigma)
      }
      expect(fit.residualRmsM).toBeGreaterThan(noiseSigmaM * 0.8)
      expect(fit.residualRmsM).toBeLessThan(noiseSigmaM * 1.2)
    })
  }
})

describe('recovery across the record-length sweep', () => {
  for (const lengthDays of [30, 60, 180, 365]) {
    it(`${lengthDays} days recovers the major constituents`, () => {
      const names: ConstituentName[] =
        lengthDays >= 180 ? ['M2', 'S2', 'N2', 'K1', 'O1', 'M4'] : ['M2', 'S2', 'N2', 'K1', 'O1', 'M4']
      const record = syntheticRecord({
        startSec: START,
        lengthDays,
        constants: TRUTH,
        noiseSigmaM: 0.05,
        seed: 7,
      })
      const fit = fitOrThrow(record, names)
      for (const name of ['M2', 'S2', 'K1', 'O1'] as const) {
        const truth = truthFor(name)
        const recovered = fit.constants.find((c) => c.name === name)
        expect(recovered).toBeDefined()
        expect(
          Math.abs((recovered as { amplitudeM: number }).amplitudeM - truth.amplitudeM),
        ).toBeLessThan(0.02)
        expect(
          Math.abs(signedDegrees((recovered as { phaseDeg: number }).phaseDeg - truth.phaseDeg)),
        ).toBeLessThan(4)
      }
    })
  }
})

describe('recovery with a different constituent set', () => {
  it('a purely diurnal record recovers K1 and O1 and reports near-zero elsewhere', () => {
    const diurnal: readonly PredictableConstant[] = [
      { name: 'K1', amplitudeM: 0.44, phaseDeg: 12 },
      { name: 'O1', amplitudeM: 0.31, phaseDeg: 340 },
    ]
    const record = syntheticRecord({
      startSec: START,
      lengthDays: 120,
      constants: diurnal,
      nodalEpochSec: centreSec(START, 120),
    })
    const fit = fitOrThrow(record, ['M2', 'S2', 'K1', 'O1'])

    expect(fit.constants.find((c) => c.name === 'K1')?.amplitudeM).toBeCloseTo(0.44, 6)
    expect(fit.constants.find((c) => c.name === 'O1')?.amplitudeM).toBeCloseTo(0.31, 6)
    expect(fit.constants.find((c) => c.name === 'M2')?.amplitudeM).toBeLessThan(1e-6)
    expect(fit.constants.find((c) => c.name === 'S2')?.amplitudeM).toBeLessThan(1e-6)
  })

  it('fitting more constituents than were generated leaves the extras at zero', () => {
    const record = syntheticRecord({
      startSec: START,
      lengthDays: 200,
      constants: TRUTH,
      nodalEpochSec: centreSec(START, 200),
    })
    const fit = fitOrThrow(record, ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1', 'M4'])
    for (const absent of ['K2', 'P1', 'Q1'] as const) {
      expect(fit.constants.find((c) => c.name === absent)?.amplitudeM).toBeLessThan(1e-6)
    }
  })
})

describe('determinism', () => {
  it('the same record, window and set produce identical constants', () => {
    const record = syntheticRecord({
      startSec: START,
      lengthDays: 45,
      constants: TRUTH,
      noiseSigmaM: 0.08,
      seed: 99,
    })
    const first = fitOrThrow(record, ['M2', 'S2', 'N2', 'K1', 'O1'])
    const second = fitOrThrow(record, ['M2', 'S2', 'N2', 'K1', 'O1'])
    expect(JSON.stringify(first.constants)).toBe(JSON.stringify(second.constants))
    expect(first.conditionNumber).toBe(second.conditionNumber)
    expect(first.meanLevelM).toBe(second.meanLevelM)
  })

  it('the same seed reproduces the same synthetic record', () => {
    const options = { startSec: START, lengthDays: 10, constants: TRUTH, noiseSigmaM: 0.1, seed: 5 }
    const a = syntheticRecord(options)
    const b = syntheticRecord(options)
    expect(Array.from(a.heightsM)).toEqual(Array.from(b.heightsM))
  })
})
