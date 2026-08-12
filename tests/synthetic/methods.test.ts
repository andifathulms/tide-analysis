import { describe, expect, it } from 'vitest'
import { admiraltyFit, compareMethods, INFERENCE_RELATIONS } from '@/lib/tide/admiralty'
import { fitHarmonics } from '@/lib/tide/fit'
import { formzahl, classifyFormzahl, PUBLISHED_INDONESIAN_FORMZAHL } from '@/lib/tide/formzahl'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { signedDegrees } from '@/lib/astro/time'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-03-01T00:00:00Z') / 1000)

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'N2', amplitudeM: 0.14, phaseDeg: 96 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
  { name: 'M4', amplitudeM: 0.05, phaseDeg: 41 },
  { name: 'MS4', amplitudeM: 0.03, phaseDeg: 77 },
]

function record(lengthDays: number, noiseSigmaM = 0) {
  return syntheticRecord({
    startSec: START,
    lengthDays,
    meanLevelM: 1.2,
    constants: TRUTH,
    noiseSigmaM,
    seed: 31,
    nodalEpochSec: START + Math.round((lengthDays * 86400) / 2),
  })
}

describe('the Admiralty method on a record it was designed for', () => {
  const r = record(29)
  const outcome = admiraltyFit({ record: r })

  it('produces a fit on 29 days of hourly heights', () => {
    expect(outcome.type).toBe('fit')
  })

  it('recovers the major constituents close to the truth', () => {
    if (outcome.type !== 'fit') throw new Error('expected a fit')
    for (const name of ['M2', 'S2', 'K1', 'O1'] as const) {
      const truth = TRUTH.find((c) => c.name === name)!
      const found = outcome.constants.find((c) => c.name === name)!
      expect(Math.abs(found.amplitudeM - truth.amplitudeM)).toBeLessThan(0.03)
      expect(Math.abs(signedDegrees(found.phaseDeg - truth.phaseDeg))).toBeLessThan(6)
    }
  })

  it('marks what it inferred rather than solved', () => {
    if (outcome.type !== 'fit') throw new Error('expected a fit')
    expect(outcome.inferred).toEqual(['K2', 'P1'])
    for (const relation of INFERENCE_RELATIONS) {
      const inferred = outcome.constants.find((c) => c.name === relation.target)!
      const parent = outcome.constants.find((c) => c.name === relation.from)!
      expect(inferred.determination).toBe('disimpulkan')
      expect(inferred.inferredFrom).toBe(relation.from)
      expect(inferred.amplitudeM).toBeCloseTo(parent.amplitudeM * relation.ratio, 9)
      expect(inferred.phaseDeg).toBeCloseTo(parent.phaseDeg, 9)
    }
    for (const name of ['M2', 'S2', 'N2', 'K1', 'O1'] as const) {
      expect(outcome.constants.find((c) => c.name === name)?.determination).toBe('langsung')
    }
  })

  it('refuses a record shorter than a fortnight', () => {
    const short = admiraltyFit({ record: record(10) })
    expect(short.type).toBe('refusal')
    if (short.type !== 'refusal') return
    expect(short.requiredDays).toBe(14)
  })
})

describe('least squares and Admiralty agree on the major constituents', () => {
  const r = record(29, 0.02)
  const names = ['M2', 'S2', 'N2', 'K1', 'O1', 'M4', 'MS4'] as const
  const lsq = fitHarmonics({ record: r, constituents: [...names] })
  const adm = admiraltyFit({ record: r })

  it('both methods produce a fit on the same record', () => {
    expect(lsq.type).toBe('fit')
    expect(adm.type).toBe('fit')
  })

  it('amplitudes agree within 3 cm and phases within 6°', () => {
    if (lsq.type !== 'fit' || adm.type !== 'fit') throw new Error('expected fits')
    const rows = compareMethods(lsq.constants, adm.constants)
    for (const name of ['M2', 'S2', 'K1', 'O1'] as const) {
      const row = rows.find((r2) => r2.name === name)!
      expect(Math.abs(row.amplitudeDifferenceM as number)).toBeLessThan(0.03)
      expect(Math.abs(row.phaseDifferenceDeg as number)).toBeLessThan(6)
    }
  })

  it('least squares fits the record at least as closely', () => {
    if (lsq.type !== 'fit' || adm.type !== 'fit') throw new Error('expected fits')
    expect(lsq.residualRmsM).toBeLessThanOrEqual(adm.residualRmsM)
  })

  it('the comparison covers every constituent either method reports', () => {
    if (lsq.type !== 'fit' || adm.type !== 'fit') throw new Error('expected fits')
    const rows = compareMethods(lsq.constants, adm.constants)
    expect(rows.find((r2) => r2.name === 'K2')?.leastSquaresAmplitudeM).toBeNull()
    expect(rows.find((r2) => r2.name === 'K2')?.determination).toBe('disimpulkan')
  })
})

describe('Formzahl classification', () => {
  it('reproduces the published Indonesian classifications', () => {
    for (const published of PUBLISHED_INDONESIAN_FORMZAHL) {
      if (published.value === null) continue
      expect(classifyFormzahl(published.value).label.toLowerCase()).toContain(
        published.stated.includes('ganda') ? 'ganda' : 'tunggal',
      )
    }
  })

  it('places Segara Anakan and Teluk Balikpapan as mixed tending semidiurnal', () => {
    expect(classifyFormzahl(0.557).type).toBe('campuran-condong-ganda')
    expect(classifyFormzahl(0.35).type).toBe('campuran-condong-ganda')
    expect(classifyFormzahl(0.39).type).toBe('campuran-condong-ganda')
  })

  it('holds the class boundaries at 0.25, 1.5 and 3.0', () => {
    expect(classifyFormzahl(0.25).type).toBe('harian-ganda')
    expect(classifyFormzahl(0.26).type).toBe('campuran-condong-ganda')
    expect(classifyFormzahl(1.5).type).toBe('campuran-condong-ganda')
    expect(classifyFormzahl(1.51).type).toBe('campuran-condong-tunggal')
    expect(classifyFormzahl(3.0).type).toBe('campuran-condong-tunggal')
    expect(classifyFormzahl(3.01).type).toBe('harian-tunggal')
  })

  it('computes F from fitted constants', () => {
    const r = record(60)
    const outcome = fitHarmonics({ record: r, constituents: ['M2', 'S2', 'N2', 'K1', 'O1'] })
    if (outcome.type !== 'fit') throw new Error('expected a fit')
    const result = formzahl(outcome.constants)
    // (0.27 + 0.19) / (0.62 + 0.31) = 0.4946
    expect(result.value).toBeCloseTo(0.4946, 3)
    expect(result.type).toBe('campuran-condong-ganda')
    expect(result.missing).toEqual([])
  })

  it('reports which of the four it is missing rather than guessing', () => {
    const result = formzahl([
      { name: 'M2', amplitudeM: 0.6 },
      { name: 'K1', amplitudeM: 0.2 },
    ])
    expect(result.missing).toEqual(['O1', 'S2'])
  })
})
