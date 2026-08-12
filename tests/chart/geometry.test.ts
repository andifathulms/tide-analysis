import { describe, expect, it } from 'vitest'
import { buildChartModel } from '@/lib/chart/model'
import { decimate, heightTicks, linearScale, seriesPath } from '@/lib/chart/geometry'

const HOUR = 3600

function grid(hours: number, skip: readonly number[] = []): { t: Float64Array; v: Float64Array } {
  const times: number[] = []
  const values: number[] = []
  for (let h = 0; h < hours; h += 1) {
    if (skip.includes(h)) continue
    times.push(h * HOUR)
    values.push(Math.sin(h / 3))
  }
  return { t: Float64Array.from(times), v: Float64Array.from(values) }
}

describe('scales and ticks', () => {
  it('maps a domain onto a range linearly', () => {
    const scale = linearScale([0, 10], [100, 200])
    expect(scale(0)).toBe(100)
    expect(scale(10)).toBe(200)
    expect(scale(5)).toBe(150)
  })

  it('produces readable height ticks', () => {
    const ticks = heightTicks([-0.42, 1.13])
    expect(ticks.length).toBeGreaterThan(2)
    expect(ticks.length).toBeLessThan(12)
    for (const tick of ticks) expect(tick).toBeGreaterThanOrEqual(-0.42)
  })

  it('keeps the extremes of every bucket when decimating', () => {
    const { t, v } = grid(5000)
    const thinned = decimate(t, v, 400)
    expect(thinned.timesSec.length).toBeLessThanOrEqual(400)
    expect(Math.max(...thinned.values)).toBeCloseTo(Math.max(...v), 6)
    expect(Math.min(...thinned.values)).toBeCloseTo(Math.min(...v), 6)
  })
})

describe('the trace never crosses a gap', () => {
  const x = linearScale([0, 100 * HOUR], [0, 1000])
  const y = linearScale([-1, 1], [100, 0])

  it('draws one continuous run when the record is complete', () => {
    const { t, v } = grid(48)
    const path = seriesPath(t, v, x, y, HOUR * 1.5)
    expect(path.split('M').length - 1).toBe(1)
  })

  it('lifts the pen across a declared gap rather than drawing through it', () => {
    const { t, v } = grid(48, [20, 21, 22])
    const path = seriesPath(t, v, x, y, HOUR * 1.5)
    // Two runs: before the gap and after it.
    expect(path.split('M').length - 1).toBe(2)
  })

  it('lifts the pen for every gap', () => {
    const { t, v } = grid(72, [10, 11, 30, 31, 50])
    const path = seriesPath(t, v, x, y, HOUR * 1.5)
    expect(path.split('M').length - 1).toBe(4)
  })
})

describe('the chart model', () => {
  const { t, v } = grid(240, [100, 101, 102])
  const model = buildChartModel({
    timesSec: t,
    observedM: v,
    modelM: v,
    residualM: Float64Array.from(v, () => 0.02),
    intervalSec: HOUR,
    width: 900,
    chartHeight: 300,
    residualHeight: 120,
    datums: [{ label: 'Z₀', heightM: 0, emphasis: true }],
    heldOutWindow: { startSec: 150 * HOUR, endSec: 239 * HOUR },
  })

  it('puts the residual band directly beneath the chart on the same x scale', () => {
    expect(model.residualPlot).not.toBeNull()
    expect(model.residualPlot?.x).toBe(model.plot.x)
    expect(model.residualPlot?.width).toBe(model.plot.width)
    expect(model.residualPlot?.y).toBe(300)
  })

  it('carries the datum line and the held-out window', () => {
    expect(model.datumLines).toHaveLength(1)
    expect(model.heldOutRect).not.toBeNull()
    expect(model.heldOutRect!.width).toBeGreaterThan(0)
  })

  it('breaks the observed trace at the gap', () => {
    expect(model.observedPath.split('M').length - 1).toBeGreaterThan(1)
  })

  it('is a plain value — no NaN reaches the SVG', () => {
    expect(model.observedPath).not.toContain('NaN')
    expect(model.modelPath).not.toContain('NaN')
    expect(model.residualPath).not.toContain('NaN')
  })
})
