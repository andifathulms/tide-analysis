import { describe, expect, it } from 'vitest'
import { beatFigure } from '@/lib/chart/beat'
import { requiredHoursFor } from '@/lib/tide/rayleigh'

/**
 * The figure exists to make one claim visible: that a pair drifts a full cycle
 * apart over T, passing through antiphase at T/2. If the panels stop landing
 * on those phases the picture is telling a story the criterion does not.
 */
describe('the beat figure', () => {
  const figure = beatFigure('K1', 'P1')

  it('spans exactly the length the Rayleigh criterion asks for', () => {
    expect(figure.requiredDays).toBeCloseTo(requiredHoursFor('K1', 'P1') / 24, 6)
    expect(figure.panels[0]!.atDays).toBe(0)
    expect(figure.panels[figure.panels.length - 1]!.atDays).toBeCloseTo(
      figure.requiredDays,
      6,
    )
  })

  it('opens in step, reaches antiphase halfway, and returns in step', () => {
    const [start, quarter, half, full] = figure.panels
    expect(start!.phaseDifferenceDeg).toBeCloseTo(0, 6)
    expect(quarter!.phaseDifferenceDeg).toBeCloseTo(90, 4)
    expect(half!.phaseDifferenceDeg).toBeCloseTo(180, 4)
    // Back to zero, not 360 — the pair is indistinguishable again, which is
    // why the criterion is a full cycle rather than the half that first
    // separates them.
    expect(full!.phaseDifferenceDeg).toBeCloseTo(0, 3)
  })

  it('draws two curves that coincide at the start and oppose at the half', () => {
    const sampleY = (path: string, index: number): number =>
      Number(path.split(/[ML]/).filter(Boolean)[index]!.trim().split(' ')[1])

    const start = figure.panels[0]!
    const half = figure.panels[2]!
    // At t = 0 the pair is the same wave to within a rounding error.
    expect(Math.abs(sampleY(start.pathA, 0) - sampleY(start.pathB, 0))).toBeLessThan(0.5)
    // Halfway, one is at the top of its swing where the other is at the bottom.
    const spread = Math.abs(sampleY(half.pathA, 0) - sampleY(half.pathB, 0))
    expect(spread).toBeGreaterThan(figure.height / 2)
  })

  it('is deterministic and needs no record', () => {
    expect(JSON.stringify(beatFigure('S2', 'K2'))).toEqual(
      JSON.stringify(beatFigure('S2', 'K2')),
    )
  })

  it('handles a pair that separates quickly as readily as one that does not', () => {
    const fast = beatFigure('M2', 'S2')
    expect(fast.requiredDays).toBeCloseTo(14.765, 2)
    expect(fast.panels).toHaveLength(4)
  })
})
