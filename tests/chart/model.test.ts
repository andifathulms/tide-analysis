import { describe, expect, it } from 'vitest'
import { buildChartModel } from '@/lib/chart/model'

const HOUR = 3600

/**
 * Regression: a long record was drawn as scattered dashes. Thinning kept two
 * samples per bucket of several hours, and the path then broke wherever two
 * consecutive kept samples were more than 1.5 sampling intervals apart —
 * which, after thinning, was nearly everywhere. Every station page's main
 * chart was affected; only short windows (the home hero) drew whole.
 */
function hourly(hours: number, gaps: ReadonlyArray<readonly [number, number]> = []) {
  const times: number[] = []
  const values: number[] = []
  for (let h = 0; h < hours; h++) {
    if (gaps.some(([from, to]) => h >= from && h < to)) continue
    times.push(h * HOUR)
    values.push(Math.cos((2 * Math.PI * h) / 12.42))
  }
  return { timesSec: Float64Array.from(times), observedM: Float64Array.from(values) }
}

function moves(path: string | null): number {
  return (path ?? '').split('M').length - 1
}

function chartOf(series: ReturnType<typeof hourly>) {
  return buildChartModel({
    ...series,
    modelM: series.observedM,
    residualM: series.observedM.map(() => 0),
    intervalSec: HOUR,
    width: 1100,
    chartHeight: 340,
    residualHeight: 150,
    datums: [],
  })
}

describe('chart traces on a long record', () => {
  it('draw an unbroken record as one continuous line', () => {
    const model = chartOf(hourly(24 * 212))
    expect(moves(model.observedPath)).toBe(1)
    expect(moves(model.modelPath)).toBe(1)
    expect(moves(model.residualPath)).toBe(1)
  })

  it('still break at a real gap, and only there', () => {
    const model = chartOf(hourly(24 * 212, [[2000, 2030]]))
    expect(moves(model.observedPath)).toBe(2)
  })

  it('break at a gap of two missing hours, however much the record is thinned', () => {
    const model = chartOf(hourly(24 * 212, [[3001, 3003]]))
    expect(moves(model.observedPath)).toBe(2)
  })
})
