import { describe, expect, it } from 'vitest'
import { buildChartModel } from '@/lib/chart/model'
import { applyMap, buildReadout, invertMap, nearestSample, pointAt } from '@/lib/chart/readout'

const HOUR = 3600

/** Hourly synthetic series with a 30-hour outage in the middle. */
function series() {
  const times: number[] = []
  const observed: number[] = []
  const model: number[] = []
  for (let h = 0; h < 24 * 20; h++) {
    if (h >= 200 && h < 230) continue
    times.push(1_767_225_600 + h * HOUR)
    const m = Math.cos((2 * Math.PI * h) / 12.42)
    model.push(m)
    observed.push(m + 0.05 * Math.sin(h / 7))
  }
  const residual = observed.map((o, i) => o - (model[i] as number))
  return {
    timesSec: Float64Array.from(times),
    observedM: Float64Array.from(observed),
    modelM: Float64Array.from(model),
    residualM: Float64Array.from(residual),
  }
}

function chart() {
  const s = series()
  return {
    s,
    model: buildChartModel({
      ...s,
      intervalSec: HOUR,
      width: 1100,
      chartHeight: 340,
      residualHeight: 150,
      datums: [],
    }),
  }
}

describe('chart readout', () => {
  it('maps and inverts a scale exactly', () => {
    const map = { d0: 10, d1: 20, r0: 300, r1: 100 }
    expect(invertMap(map, applyMap(map, 13.7))).toBeCloseTo(13.7, 10)
  })

  it('finds the nearest sample by time', () => {
    const readout = buildReadout({ ...series(), modelM: null, residualM: null })
    expect(nearestSample(readout, readout.startSec + 10 * HOUR + 1000)).toBe(10)
    expect(nearestSample(readout, readout.startSec + 10 * HOUR + 2600)).toBe(11)
  })

  it('reads back the value the record holds, placed where the chart draws it', () => {
    const { s, model } = chart()
    const i = 120
    const t = s.timesSec[i] as number
    const point = pointAt(model.frame, model.readout, applyMap(model.frame.x, t))
    expect(point).not.toBeNull()
    expect(point?.timeSec).toBe(t)
    expect(point?.observed?.m).toBeCloseTo(s.observedM[i] as number, 3)
    expect(point?.model?.m).toBeCloseTo(s.modelM[i] as number, 3)
    expect(point?.residual?.m).toBeCloseTo(s.residualM[i] as number, 3)
    // On the plot, between its top and bottom edges.
    const y = point?.observed?.y ?? -1
    expect(y).toBeGreaterThanOrEqual(model.plot.y)
    expect(y).toBeLessThanOrEqual(model.plot.y + model.plot.height)
  })

  it('reports a gap as a gap rather than borrowing a neighbour', () => {
    const { s, model } = chart()
    const middleOfOutage = (s.timesSec[0] as number) + 215 * HOUR
    expect(pointAt(model.frame, model.readout, applyMap(model.frame.x, middleOfOutage))).toBeNull()
  })

  it('reads nothing outside the plot', () => {
    const { model } = chart()
    expect(pointAt(model.frame, model.readout, model.plot.x - 5)).toBeNull()
    expect(pointAt(model.frame, model.readout, model.plot.x + model.plot.width + 5)).toBeNull()
  })

  it('keeps the payload bounded on a long record', () => {
    const n = 24 * 400
    const times = Float64Array.from({ length: n }, (_, i) => i * HOUR)
    const values = new Float64Array(n)
    const readout = buildReadout({ timesSec: times, observedM: values, modelM: values, residualM: values })
    expect(readout.offsetsSec.length).toBeLessThanOrEqual(1200)
  })

  it('is deterministic', () => {
    expect(chart().model.readout).toEqual(chart().model.readout)
  })
})
