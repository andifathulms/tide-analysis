import { describe, expect, it } from 'vitest'
import {
  assessResolution,
  requiredHoursFor,
  resolvableSubset,
  describeConflict,
} from '@/lib/tide/rayleigh'
import { fitHarmonics } from '@/lib/tide/fit'
import { buildDesignMatrix } from '@/lib/tide/design'
import { solveLeastSquares } from '@/lib/tide/solve'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { recordCentreSec, sliceRecord } from '@/lib/tide/record'
import type { ConstituentName } from '@/lib/tide/constituents'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)
const DAY = 86400

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'P1', amplitudeM: 0.09, phaseDeg: 296 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
]

function record(lengthDays: number, noiseSigmaM = 0) {
  return syntheticRecord({
    startSec: START,
    lengthDays,
    constants: TRUTH,
    noiseSigmaM,
    seed: 4242,
    nodalEpochSec: START + Math.round((lengthDays * DAY) / 2),
  })
}

describe('the published separation requirements', () => {
  it('K1 and P1 need roughly half a year', () => {
    const days = requiredHoursFor('K1', 'P1') / 24
    expect(days).toBeGreaterThan(180)
    expect(days).toBeLessThan(184)
  })

  it('S2 and K2 need the same half year', () => {
    expect(requiredHoursFor('S2', 'K2')).toBeCloseTo(requiredHoursFor('K1', 'P1'), 3)
  })

  it('M2 and S2 separate in under a fortnight — the spring-neap beat', () => {
    expect(requiredHoursFor('M2', 'S2') / 24).toBeCloseTo(14.765, 2)
  })

  it('M2 and N2 need a full anomalistic month', () => {
    expect(requiredHoursFor('M2', 'N2') / 24).toBeCloseTo(27.555, 2)
  })
})

describe('refusal fires when the record is too short', () => {
  it('fifteen days cannot separate K1 from P1', () => {
    const outcome = fitHarmonics({ record: record(15), constituents: ['M2', 'S2', 'K1', 'P1'] })
    expect(outcome.type).toBe('refusal')
    if (outcome.type !== 'refusal') return

    expect(outcome.reason).toBe('rayleigh')
    const pair = outcome.conflicts.find(
      (c) => (c.a === 'K1' && c.b === 'P1') || (c.a === 'P1' && c.b === 'K1'),
    )
    expect(pair).toBeDefined()
    expect(pair?.requiredDays).toBeGreaterThan(180)
    expect(outcome.message).toContain('K1')
    expect(outcome.message).toContain('P1')
    expect(outcome.requiredDays).toBeGreaterThan(180)
  })

  it('the refusal names what the record would have to be', () => {
    const assessment = assessResolution(['K1', 'P1'], 15 * 24)
    expect(assessment.type).toBe('refusal')
    if (assessment.type !== 'refusal') return
    const line = describeConflict(assessment.conflicts[0]!)
    expect(line).toContain('182')
    expect(line).toContain('15.0 hari')
  })

  it('a fortnight cannot separate M2 from N2 either', () => {
    const outcome = fitHarmonics({ record: record(14), constituents: ['M2', 'N2'] })
    expect(outcome.type).toBe('refusal')
  })

  it('a month cannot separate Sa from the mean level', () => {
    const assessment = assessResolution(['M2', 'Sa'], 30 * 24)
    expect(assessment.type).toBe('refusal')
    if (assessment.type !== 'refusal') return
    const againstMean = assessment.conflicts.find((c) => c.a === 'Sa' && c.b === 'Sa')
    expect(againstMean).toBeDefined()
    expect(againstMean?.requiredDays).toBeGreaterThan(360)
  })

  it('no amplitudes are returned with a refusal', () => {
    const outcome = fitHarmonics({ record: record(15), constituents: ['K1', 'P1'] })
    expect(outcome.type).toBe('refusal')
    expect(Object.hasOwn(outcome, 'constants')).toBe(false)
  })
})

describe('resolution succeeds when the record is long enough', () => {
  it('two hundred days separates K1 from P1 and recovers both', () => {
    const outcome = fitHarmonics({
      record: record(200),
      constituents: ['M2', 'S2', 'K1', 'P1', 'O1'],
    })
    expect(outcome.type).toBe('fit')
    if (outcome.type !== 'fit') return

    const k1 = outcome.constants.find((c) => c.name === 'K1')
    const p1 = outcome.constants.find((c) => c.name === 'P1')
    expect(k1?.amplitudeM).toBeCloseTo(0.27, 4)
    expect(p1?.amplitudeM).toBeCloseTo(0.09, 4)
    expect(outcome.conditionNumber).toBeLessThan(10)
  })

  it('fifteen days resolves the major four', () => {
    const outcome = fitHarmonics({ record: record(15), constituents: ['M2', 'S2', 'K1', 'O1'] })
    expect(outcome.type).toBe('fit')
    if (outcome.type !== 'fit') return
    expect(outcome.constants.find((c) => c.name === 'M2')?.amplitudeM).toBeCloseTo(0.62, 3)
    expect(outcome.resolution.tightestPair?.requiredDays).toBeLessThan(15)
  })
})

describe('the condition number tracks the window length', () => {
  /**
   * κ is not a function of window length alone — it measures how close the
   * requested set is to degeneracy on this window. A well-separated set stays
   * flat as the window shortens; a set holding a near-inseparable pair climbs.
   * Both halves matter: the first says κ is not just noise, the second says it
   * is the quantity the Rayleigh criterion is about.
   */
  function conditionAt(lengthDays: number, constituents: readonly ConstituentName[]): number {
    const window = sliceRecord(record(200, 0.05), START, START + lengthDays * DAY)
    const design = buildDesignMatrix({
      timesSec: window.timesSec,
      constituents,
      nodalEpochSec: recordCentreSec(window),
    })
    return solveLeastSquares(design, window.heightsM).conditionNumber
  }

  const wellSeparated: ConstituentName[] = ['M2', 'S2', 'N2', 'K1', 'O1']
  const nearDegenerate: ConstituentName[] = ['M2', 'S2', 'K1', 'P1']

  it('rises monotonically as the window closes on the K1–P1 limit', () => {
    const lengths = [200, 120, 60, 30, 15, 8, 4, 2]
    const conditions = lengths.map((d) => conditionAt(d, nearDegenerate))
    for (let i = 1; i < conditions.length; i += 1) {
      expect(conditions[i]!).toBeGreaterThan(conditions[i - 1]!)
    }
    // Roughly a doubling per halving of the window, once inside the limit.
    expect(conditions.at(-1)!).toBeGreaterThan(50 * conditions[0]!)
  })

  it('stays flat while every pair remains separable', () => {
    for (const lengthDays of [120, 90, 60, 45, 35, 30]) {
      expect(conditionAt(lengthDays, wellSeparated)).toBeLessThan(3)
    }
  })

  it('a full set on a very short record is ill-conditioned outright', () => {
    const everything: ConstituentName[] = ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1']
    expect(conditionAt(30, everything)).toBeLessThan(20)
    expect(conditionAt(5, everything)).toBeGreaterThan(500)
  })
})

describe('what the refusal is protecting', () => {
  /**
   * Bypass the Rayleigh gate and solve anyway — this is the ill-posed problem
   * the refusal exists to prevent, and it must be visibly ill-posed rather
   * than quietly wrong.
   */
  const short = record(15)
  const constituents: ConstituentName[] = ['M2', 'S2', 'K1', 'P1']
  const design = buildDesignMatrix({
    timesSec: short.timesSec,
    constituents,
    nodalEpochSec: recordCentreSec(short),
  })
  const solution = solveLeastSquares(design, short.heightsM)

  function recoveredK1(lengthDays: number): { kappa: number; amplitudeM: number } {
    const r = record(lengthDays)
    const d = buildDesignMatrix({
      timesSec: r.timesSec,
      constituents,
      nodalEpochSec: recordCentreSec(r),
    })
    const s = solveLeastSquares(d, r.heightsM)
    const pair = d.pairs.find((p) => p.name === 'K1')!
    const amplitudeM =
      Math.hypot(s.coefficients[pair.cosColumn]!, s.coefficients[pair.sinColumn]!) / pair.nodal.f
    return { kappa: s.conditionNumber, amplitudeM }
  }

  it('the design matrix is ill-conditioned on fifteen days', () => {
    expect(solution.conditionNumber).toBeGreaterThan(10)
  })

  it('the amplitudes blow apart from the truth that generated them', () => {
    // The truth is 0.27 m. Fifteen days returns three times that; four days
    // returns nine times it. These are the numbers a lookup tool would print
    // without comment.
    expect(recoveredK1(15).amplitudeM).toBeGreaterThan(3 * 0.27)
    expect(recoveredK1(4).amplitudeM).toBeGreaterThan(8 * 0.27)
  })

  it('a long record solves the same set stably', () => {
    const long = recoveredK1(200)
    expect(long.kappa).toBeLessThan(2)
    expect(long.amplitudeM).toBeCloseTo(0.27, 2)
    expect(solution.conditionNumber).toBeGreaterThan(5 * long.kappa)
  })
})

describe('the resolvable subset for the slider', () => {
  it('keeps the caller’s priority order and reports what it dropped', () => {
    const candidates: ConstituentName[] = ['M2', 'S2', 'K1', 'O1', 'N2', 'P1', 'K2']
    const { kept, dropped } = resolvableSubset(candidates, 20 * 24)

    expect(kept).toContain('M2')
    expect(kept).toContain('S2')
    expect(kept).toContain('K1')
    expect(kept).toContain('O1')
    expect(kept).not.toContain('P1')
    expect(kept).not.toContain('K2')
    expect(kept).not.toContain('N2')
    expect(dropped.map((d) => d.name)).toEqual(['N2', 'P1', 'K2'])
    expect(dropped[0]?.conflictsWith[0]?.b).toBe('M2')
  })

  it('a longer window keeps strictly more', () => {
    const candidates: ConstituentName[] = ['M2', 'S2', 'K1', 'O1', 'N2', 'P1', 'K2', 'Q1']
    const short = resolvableSubset(candidates, 20 * 24).kept
    const long = resolvableSubset(candidates, 200 * 24).kept
    expect(long.length).toBeGreaterThan(short.length)
    for (const name of short) expect(long).toContain(name)
  })

  it('every candidate is either kept or dropped — there is no third state', () => {
    const candidates: ConstituentName[] = ['M2', 'S2', 'K1', 'O1', 'N2', 'P1', 'K2']
    const { kept, dropped } = resolvableSubset(candidates, 45 * 24)
    expect(kept.length + dropped.length).toBe(candidates.length)
  })
})
