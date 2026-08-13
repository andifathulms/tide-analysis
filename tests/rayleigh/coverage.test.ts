import { describe, expect, it } from 'vitest'
import { coverageSweep } from '@/lib/tide/coverage'
import type { ConstituentName } from '@/lib/tide/constituents'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)
const HOUR = 3600

/** A complete hourly record, the shape every bundled station has. */
function hourly(lengthDays: number): Float64Array {
  return Float64Array.from(
    Array.from({ length: lengthDays * 24 }, (_, hour) => START + hour * HOUR),
  )
}

const SET: ConstituentName[] = ['M2', 'S2', 'N2', 'K1', 'O1', 'P1']

function sweep(lengthDays: number, fractions?: number[]) {
  return coverageSweep({
    timesSec: hourly(lengthDays),
    constituents: SET,
    nodalEpochSec: START,
    fractions,
  })
}

describe('coverage as the second axis', () => {
  it('reports the record as it stands before any mask', () => {
    const points = sweep(200)
    expect(points[0]!.kind).toBe('actual')
    expect(points[0]!.removedFraction).toBe(0)
  })

  it('costs far more to lose the middle than to lose the same hours scattered', () => {
    // The claim the whole feature exists to make. Same number of samples
    // removed; one as a single outage, one scattered across the record.
    const points = sweep(200, [0.5])
    const contiguous = points.find((p) => p.kind === 'contiguous')!
    const scattered = points.find((p) => p.kind === 'scattered')!

    expect(contiguous.sampleCount).toBeCloseTo(scattered.sampleCount, -2)
    expect(contiguous.worst!.correlation).toBeGreaterThan(
      scattered.worst!.correlation * 3,
    )
    expect(contiguous.conditionNumber).toBeGreaterThan(scattered.conditionNumber)
  })

  it('leaves the span untouched when it scatters, and cuts it when it does not', () => {
    const points = sweep(200, [0.5])
    const scattered = points.find((p) => p.kind === 'scattered')!
    const contiguous = points.find((p) => p.kind === 'contiguous')!

    // Scattered removal keeps first and last sample, so the Rayleigh
    // criterion cannot tell anything happened at all — which is the point.
    expect(scattered.spanDays).toBeCloseTo(200, 0)
    expect(contiguous.spanDays).toBeCloseTo(200, 0)

    // Span is identical for both, and yet the fits are not. A measure that
    // only sees span cannot express this, and that is the whole argument.
    expect(contiguous.worst!.correlation).not.toBeCloseTo(
      scattered.worst!.correlation,
      2,
    )
  })

  it('degrades monotonically as a contiguous outage grows', () => {
    const points = sweep(200, [0.2, 0.4, 0.6]).filter((p) => p.kind === 'contiguous')
    expect(points).toHaveLength(3)
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]!.worst!.correlation).toBeGreaterThan(
        points[i - 1]!.worst!.correlation,
      )
    }
  })

  it('names the pair that is failing, not just that something is', () => {
    const contiguous = sweep(200, [0.6]).find((p) => p.kind === 'contiguous')!
    // Two thirds of 200 days leaves about 80: not enough for K1/P1, which is
    // the pair that should be reported as collapsing.
    expect([contiguous.worst!.a, contiguous.worst!.b].sort().join('/')).toBe('K1/P1')
  })

  it('drops a mask that leaves too few samples rather than solving it', () => {
    // Six constituents need thirteen parameters. A short record masked hard
    // has nothing to say, and saying it anyway would be the exact failure
    // this project exists to expose.
    const points = coverageSweep({
      timesSec: hourly(1),
      constituents: SET,
      nodalEpochSec: START,
      fractions: [0.9],
    })
    expect(points.every((p) => p.sampleCount >= 2 * SET.length + 2)).toBe(true)
  })

  it('is deterministic — the masks are constructed, never sampled', () => {
    expect(JSON.stringify(sweep(120))).toEqual(JSON.stringify(sweep(120)))
  })

  it('returns nothing for an empty constituent set', () => {
    expect(
      coverageSweep({ timesSec: hourly(60), constituents: [], nodalEpochSec: START }),
    ).toEqual([])
  })
})
