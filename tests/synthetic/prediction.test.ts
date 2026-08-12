import { describe, expect, it } from 'vitest'
import { fitHarmonics, type HarmonicFit } from '@/lib/tide/fit'
import { findExtrema, predictHeights, timeGrid, residual } from '@/lib/tide/predict'
import { syntheticRecord } from '@/lib/tide/synthetic'
import { rootMeanSquare, sliceRecord } from '@/lib/tide/record'
import { constituentPeriodHours } from '@/lib/tide/constituents'
import { analyse } from '@/lib/view/analysis'
import type { PredictableConstant } from '@/lib/tide/predict'

const START = Math.round(Date.parse('2025-01-01T00:00:00Z') / 1000)

const TRUTH: readonly PredictableConstant[] = [
  { name: 'M2', amplitudeM: 0.62, phaseDeg: 118 },
  { name: 'S2', amplitudeM: 0.31, phaseDeg: 154 },
  { name: 'N2', amplitudeM: 0.14, phaseDeg: 96 },
  { name: 'K1', amplitudeM: 0.27, phaseDeg: 302 },
  { name: 'O1', amplitudeM: 0.19, phaseDeg: 285 },
]

describe('extrema', () => {
  it('finds two highs and two lows a day for a purely semidiurnal tide', () => {
    const extrema = findExtrema({
      meanLevelM: 0,
      constants: [{ name: 'M2', amplitudeM: 1, phaseDeg: 0 }],
      startSec: START,
      endSec: START + 10 * 86400,
    })
    const highs = extrema.filter((e) => e.kind === 'pasang')
    const lows = extrema.filter((e) => e.kind === 'surut')
    expect(highs.length).toBeGreaterThanOrEqual(19)
    expect(highs.length).toBeLessThanOrEqual(20)
    expect(lows.length).toBeGreaterThanOrEqual(19)

    // Successive highs are one M2 period apart.
    const periodSec = constituentPeriodHours('M2') * 3600
    for (let i = 1; i < highs.length; i += 1) {
      const spacing = (highs[i]!.timeSec - highs[i - 1]!.timeSec) / periodSec
      expect(spacing).toBeCloseTo(1, 2)
    }
  })

  it('gets the heights of the turning points right', () => {
    const extrema = findExtrema({
      meanLevelM: 1.5,
      constants: [{ name: 'M2', amplitudeM: 1, phaseDeg: 0 }],
      startSec: START,
      endSec: START + 3 * 86400,
    })
    for (const extremum of extrema) {
      const expected = extremum.kind === 'pasang' ? 1.5 + 1 * 0.963 : 1.5 - 1 * 0.963
      // The nodal factor for M2 in 2025 is near 0.98; allow the whole range.
      expect(Math.abs(extremum.heightM - expected)).toBeLessThan(0.08)
    }
  })

  it('finds one high a day for a purely diurnal tide', () => {
    const extrema = findExtrema({
      meanLevelM: 0,
      constants: [{ name: 'K1', amplitudeM: 0.5, phaseDeg: 30 }],
      startSec: START,
      endSec: START + 10 * 86400,
    })
    expect(extrema.filter((e) => e.kind === 'pasang').length).toBeGreaterThanOrEqual(9)
    expect(extrema.filter((e) => e.kind === 'pasang').length).toBeLessThanOrEqual(11)
  })
})

describe('held-out prediction degrades gracefully', () => {
  const record = syntheticRecord({
    startSec: START,
    lengthDays: 120,
    meanLevelM: 1.1,
    constants: TRUTH,
    noiseSigmaM: 0.06,
    seed: 2718,
  })

  const analysis = analyse({
    record,
    constituents: ['M2', 'S2', 'N2', 'K1', 'O1'],
    fitFraction: 2 / 3,
  })

  it('produces a fit and a residual over the whole record', () => {
    expect(analysis.outcome.type).toBe('fit')
    expect(analysis.series?.residualM.length).toBe(record.timesSec.length)
  })

  it('the held-out residual is bounded, not catastrophic', () => {
    const fitRms = analysis.fitResidualRmsM as number
    const heldOutRms = analysis.heldOutResidualRmsM as number
    expect(heldOutRms).toBeLessThan(0.12)
    // Some degradation is expected; an order of magnitude is not.
    expect(heldOutRms).toBeLessThan(fitRms * 2)
  })

  it('the residual is close to the noise that was added', () => {
    expect(analysis.fitResidualRmsM as number).toBeGreaterThan(0.04)
    expect(analysis.fitResidualRmsM as number).toBeLessThan(0.08)
  })

  it('predicting a year beyond the record stays bounded', () => {
    const fit = analysis.outcome as HarmonicFit
    const endSec = record.timesSec[record.timesSec.length - 1] as number
    const futureTimes = timeGrid(endSec, endSec + 365 * 86400, 3600)
    const predicted = predictHeights({
      meanLevelM: fit.meanLevelM,
      constants: fit.constants.map((c) => ({
        name: c.name,
        amplitudeM: c.amplitudeM,
        phaseDeg: c.phaseDeg,
      })),
      timesSec: futureTimes,
    })
    const truth = predictHeights({ meanLevelM: 1.1, constants: TRUTH, timesSec: futureTimes })
    const error = rootMeanSquare(residual(truth, predicted))
    // A year on, with nodal corrections tracking the node, the prediction is
    // still within a few centimetres of the tide that generated the record.
    expect(error).toBeLessThan(0.05)
  })
})

describe('fitting a window and predicting the rest', () => {
  it('a fit from the first half predicts the second half', () => {
    const record = syntheticRecord({
      startSec: START,
      lengthDays: 200,
      constants: TRUTH,
      noiseSigmaM: 0.03,
      seed: 11,
    })
    const firstHalf = sliceRecord(record, START, START + 100 * 86400)
    const outcome = fitHarmonics({
      record: firstHalf,
      constituents: ['M2', 'S2', 'N2', 'K1', 'O1'],
    })
    if (outcome.type !== 'fit') throw new Error('expected a fit')

    const secondHalf = sliceRecord(record, START + 100 * 86400, START + 200 * 86400)
    const predicted = predictHeights({
      meanLevelM: outcome.meanLevelM,
      constants: outcome.constants.map((c) => ({
        name: c.name,
        amplitudeM: c.amplitudeM,
        phaseDeg: c.phaseDeg,
      })),
      timesSec: secondHalf.timesSec,
    })
    const rms = rootMeanSquare(residual(secondHalf.heightsM, predicted))
    expect(rms).toBeLessThan(0.05)
  })
})
