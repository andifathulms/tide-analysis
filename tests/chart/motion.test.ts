import { describe, expect, it } from 'vitest'
import { blendSeries, easeInOutCubic, REBUILD_MS } from '@/lib/chart/motion'

describe('the rebuild tween', () => {
  it('starts where it started and ends where it ends', () => {
    const from = Float64Array.from([0, 1, 2])
    const to = Float64Array.from([10, 11, 12])

    expect(Array.from(blendSeries(from, to, 0))).toEqual([0, 1, 2])
    expect(Array.from(blendSeries(from, to, 1))).toEqual([10, 11, 12])
  })

  it('is monotone between the two — the curve never overshoots', () => {
    const from = Float64Array.from([0])
    const to = Float64Array.from([1])
    let previous = -1
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const value = blendSeries(from, to, p)[0] as number
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
      previous = value
    }
  })

  it('clamps progress outside [0, 1]', () => {
    expect(easeInOutCubic(-3)).toBe(0)
    expect(easeInOutCubic(7)).toBe(1)
  })

  it('is symmetric about the midpoint', () => {
    for (const t of [0.1, 0.25, 0.4]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 12)
    }
  })

  it('refuses to blend series of different lengths rather than guessing', () => {
    expect(() =>
      blendSeries(Float64Array.from([1, 2]), Float64Array.from([1, 2, 3]), 0.5),
    ).toThrow()
  })

  it('is short enough to repeat and long enough to read', () => {
    expect(REBUILD_MS).toBeGreaterThan(200)
    expect(REBUILD_MS).toBeLessThan(700)
  })

  it('the endpoint is exact — the drawn curve equals the computed one', () => {
    // The tween must not leave the curve a rounding error away from the truth.
    const from = Float64Array.from([0.123456789, -2.5])
    const to = Float64Array.from([1.987654321, 3.25])
    const finished = blendSeries(from, to, 1)
    expect(finished[0]).toBe(to[0])
    expect(finished[1]).toBe(to[1])
  })
})
