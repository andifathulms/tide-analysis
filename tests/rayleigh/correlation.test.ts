import { describe, expect, it } from 'vitest'
import { constituentCorrelations } from '@/lib/tide/correlation'
import { buildDesignMatrix } from '@/lib/tide/design'
import { solveLeastSquares } from '@/lib/tide/solve'
import { requiredHoursFor } from '@/lib/tide/rayleigh'
import type { ConstituentName } from '@/lib/tide/constituents'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)
const HOUR = 3600

/** Hourly sample times, the shape every bundled record has. */
function times(lengthDays: number, gapDays?: { from: number; to: number }): Float64Array {
  const out: number[] = []
  for (let hour = 0; hour < lengthDays * 24; hour += 1) {
    const day = hour / 24
    if (gapDays !== undefined && day >= gapDays.from && day < gapDays.to) continue
    out.push(START + hour * HOUR)
  }
  return Float64Array.from(out)
}

function report(lengthDays: number, constituents: readonly ConstituentName[], gap?: { from: number; to: number }) {
  const timesSec = times(lengthDays, gap)
  return constituentCorrelations(
    buildDesignMatrix({
      timesSec,
      constituents,
      nodalEpochSec: START + Math.round((lengthDays * 86400) / 2),
    }),
  )
}

function between(
  r: ReturnType<typeof report>,
  a: ConstituentName,
  b: ConstituentName,
): number {
  const rung = r.rungs.find(
    (x) => (x.a === a && x.b === b) || (x.a === b && x.b === a),
  )
  if (rung === undefined) throw new Error(`no rung for ${a}/${b}`)
  return rung.correlation
}

describe('constituent correlation', () => {
  it('stays inside [0, 1] and is symmetric', () => {
    const r = report(60, ['M2', 'S2', 'K1', 'O1'])
    for (const rung of r.rungs) {
      expect(rung.correlation).toBeGreaterThanOrEqual(0)
      expect(rung.correlation).toBeLessThanOrEqual(1)
    }
    for (let i = 0; i < r.names.length; i += 1) {
      expect(r.matrix[i]![i]).toBe(1)
      for (let j = 0; j < r.names.length; j += 1) {
        expect(r.matrix[i]![j]).toBeCloseTo(r.matrix[j]![i]!, 12)
      }
    }
  })

  it('reports K1 against P1 as near-identical on a month of record', () => {
    // They need 182.6 days. On 30 days they are the same wave to within a
    // rounding error, which is exactly why the fit refuses to separate them.
    expect(between(report(30, ['K1', 'P1']), 'K1', 'P1')).toBeGreaterThan(0.95)
  })

  it('falls as the record grows past the length the pair demands', () => {
    const required = requiredHoursFor('K1', 'P1') / 24
    const short = between(report(Math.round(required / 4), ['K1', 'P1']), 'K1', 'P1')
    const atLimit = between(report(Math.round(required), ['K1', 'P1']), 'K1', 'P1')
    expect(atLimit).toBeLessThan(short)
    expect(atLimit).toBeLessThan(0.2)
  })

  it('agrees with the Rayleigh criterion about which pair is worst', () => {
    // On six weeks, the standard set's hardest separation is the one that
    // needs half a year. The two measures are the same geometry, so the
    // continuum had better name the same pair the threshold does.
    const r = report(42, ['M2', 'S2', 'N2', 'K2', 'K1', 'O1', 'P1', 'Q1'])
    const worst = [r.worst!.a, r.worst!.b].sort().join('/')
    expect(['K1/P1', 'K2/S2']).toContain(worst)
  })

  it('separates M2 from S2 on a record long enough for the spring-neap beat', () => {
    const beat = requiredHoursFor('M2', 'S2') / 24
    expect(between(report(Math.round(beat * 4), ['M2', 'S2']), 'M2', 'S2')).toBeLessThan(0.1)
  })

  it('reports a long-period constituent against the mean level', () => {
    // Sa needs a year to separate from Z0. On 60 days it is nearly a constant,
    // and the rung against the mean is the only place that shows.
    const r = report(60, ['Sa', 'M2'])
    const sa = r.rungs.find((rung) => rung.a === 'Sa' && rung.b === null)
    const m2 = r.rungs.find((rung) => rung.a === 'M2' && rung.b === null)
    expect(sa!.correlation).toBeGreaterThan(0.9)
    expect(m2!.correlation).toBeLessThan(0.1)
  })

  it('cares where the gaps fall, not how many hours are missing', () => {
    // The claim the Rayleigh criterion cannot make: span is not coverage. But
    // the naive version of that claim — gaps are bad — is false, and this
    // asserts both halves so nobody has to rediscover it from a station page.
    //
    // Both masks keep the first and last sample, so the span — the only thing
    // the Rayleigh criterion reads — is identical. A contiguous outage still
    // wrecks the fit: it leaves two clusters with nothing joining them, and
    // the phase difference across the hole is ambiguous, so the pair that
    // needed half a year collapses back together. The same hours removed at
    // scattered times leave the record joined up and cost almost nothing.
    // Kolinamil is the second case — 740 hours missing, well conditioned.
    const span = 200
    const set: ConstituentName[] = ['K1', 'P1']

    const complete = between(report(span, set), 'K1', 'P1')
    const contiguous = between(report(span, set, { from: 40, to: 140 }), 'K1', 'P1')
    const scattered = between(
      constituentCorrelations(
        buildDesignMatrix({
          timesSec: Float64Array.from(
            Array.from({ length: span * 24 }, (_, hour) => hour)
              // A fixed, seedless decimation — half the samples, no clustering.
              .filter((hour) => hour % 2 === 0)
              .map((hour) => START + hour * HOUR),
          ),
          constituents: set,
          nodalEpochSec: START,
        }),
      ),
      'K1',
      'P1',
    )

    expect(contiguous).toBeGreaterThan(complete * 5)
    expect(scattered).toBeCloseTo(complete, 3)
  })

  it('tracks the condition number of the same design matrix', () => {
    const constituents: ConstituentName[] = ['M2', 'S2', 'K1', 'P1', 'O1']
    const shortDesign = buildDesignMatrix({
      timesSec: times(20),
      constituents,
      nodalEpochSec: START,
    })
    const longDesign = buildDesignMatrix({
      timesSec: times(220),
      constituents,
      nodalEpochSec: START,
    })
    const shortWorst = constituentCorrelations(shortDesign).worst!.correlation
    const longWorst = constituentCorrelations(longDesign).worst!.correlation
    expect(shortWorst).toBeGreaterThan(longWorst)

    // κ and the worst correlation are two readings of one geometry; they must
    // move together or one of them is lying.
    const shortKappa = solveLeastSquares(shortDesign, new Float64Array(shortDesign.rows))
      .conditionNumber
    const longKappa = solveLeastSquares(longDesign, new Float64Array(longDesign.rows))
      .conditionNumber
    expect(shortKappa).toBeGreaterThan(longKappa)
  })

  it('is deterministic', () => {
    const a = report(90, ['M2', 'S2', 'K1', 'O1', 'N2'])
    const b = report(90, ['M2', 'S2', 'K1', 'O1', 'N2'])
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })
})
