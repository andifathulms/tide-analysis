/**
 * The chart as a value: every path string, tick and rectangle computed here so
 * the SVG components stay presentational (invariant 16).
 *
 * The residual band sits directly beneath the main chart on the same time axis,
 * with no gap, so a spike in one lines up exactly with a deviation in the other
 * (PRD §9).
 */

import {
  decimate,
  extent,
  heightTicks,
  linearScale,
  padDomain,
  seriesPath,
  timeTicks,
  type Scale,
} from './geometry'
import { buildReadout, type LinearMap, type Readout, type ReadoutFrame } from './readout'

export interface DatumLine {
  readonly label: string
  readonly heightM: number
  readonly emphasis?: boolean
}

export interface ChartInput {
  readonly timesSec: Float64Array
  readonly observedM: Float64Array
  readonly modelM: Float64Array | null
  readonly residualM: Float64Array | null
  readonly intervalSec: number
  readonly width: number
  readonly chartHeight: number
  readonly residualHeight: number
  readonly datums: readonly DatumLine[]
  readonly fitWindow?: { readonly startSec: number; readonly endSec: number }
  readonly heldOutWindow?: { readonly startSec: number; readonly endSec: number } | null
  /** Datum steps to mark on the face. The zero moved here. */
  readonly datumSteps?: ReadonlyArray<{ readonly atSec: number; readonly shiftM: number }>
}

export interface ChartModel {
  readonly width: number
  readonly height: number
  readonly plot: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  readonly residualPlot: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  } | null
  readonly observedPath: string
  readonly modelPath: string | null
  readonly residualPath: string | null
  readonly residualZeroY: number | null
  readonly verticalRules: ReadonlyArray<{ readonly x: number; readonly label: string }>
  readonly horizontalRules: ReadonlyArray<{ readonly y: number; readonly label: string }>
  readonly residualRules: ReadonlyArray<{ readonly y: number; readonly label: string }>
  readonly datumLines: ReadonlyArray<{
    readonly y: number
    readonly label: string
    readonly emphasis: boolean
  }>
  readonly heldOutRect: {
    readonly x: number
    readonly width: number
  } | null
  readonly datumStepMarks: ReadonlyArray<{ readonly x: number; readonly label: string }>
  readonly xDomain: readonly [number, number]
  /** What the crosshair reads off, and where it draws its marks. */
  readonly readout: Readout
  readonly frame: ReadoutFrame
}

const MARGIN = { top: 16, right: 84, bottom: 28, left: 56 }

/** Day-of-month label; the chart's own axis, not a locale-formatted string. */
function dayLabel(timeSec: number): string {
  const date = new Date(timeSec * 1000)
  const day = date.getUTCDate().toString().padStart(2, '0')
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

export function buildChartModel(input: ChartInput): ChartModel {
  const plotWidth = Math.max(input.width - MARGIN.left - MARGIN.right, 10)
  const plotHeight = Math.max(input.chartHeight - MARGIN.top - MARGIN.bottom, 10)
  const hasResidual = input.residualM !== null && input.residualHeight > 0
  const residualHeight = hasResidual ? input.residualHeight : 0

  const xDomain: [number, number] = [
    input.timesSec[0] ?? 0,
    input.timesSec[input.timesSec.length - 1] ?? 1,
  ]
  const x = linearScale(xDomain, [MARGIN.left, MARGIN.left + plotWidth])

  const observedExtent = extent(input.observedM)
  const modelExtent = input.modelM === null ? observedExtent : extent(input.modelM)
  const datumExtent: [number, number] = input.datums.length
    ? [
        Math.min(...input.datums.map((d) => d.heightM)),
        Math.max(...input.datums.map((d) => d.heightM)),
      ]
    : observedExtent
  const yDomain = padDomain([
    Math.min(observedExtent[0], modelExtent[0], datumExtent[0]),
    Math.max(observedExtent[1], modelExtent[1], datumExtent[1]),
  ])
  const y = linearScale(yDomain, [MARGIN.top + plotHeight, MARGIN.top])

  /*
   * A break in the trace wherever the record has no observation. Gaps are
   * found on the full series, before thinning, and arrive at seriesPath as NaN
   * samples — so the path breaks on those alone (an infinite spacing
   * threshold), never on the spacing thinning itself creates.
   */
  const gapThresholdSec = input.intervalSec * 1.5
  const breakOnNaNOnly = Number.POSITIVE_INFINITY
  const maxPoints = Math.max(Math.round(plotWidth * 2), 200)

  const observed = decimate(input.timesSec, input.observedM, maxPoints, gapThresholdSec)
  const observedPath = seriesPath(observed.timesSec, observed.values, x, y, breakOnNaNOnly)

  let modelPath: string | null = null
  if (input.modelM !== null) {
    const modelled = decimate(input.timesSec, input.modelM, maxPoints, gapThresholdSec)
    modelPath = seriesPath(modelled.timesSec, modelled.values, x, y, breakOnNaNOnly)
  }

  let residualPath: string | null = null
  let residualRules: Array<{ y: number; label: string }> = []
  let residualZeroY: number | null = null
  let residualPlot: ChartModel['residualPlot'] = null
  let residualMap: LinearMap | null = null

  if (hasResidual && input.residualM !== null) {
    const top = input.chartHeight
    const innerHeight = Math.max(residualHeight - MARGIN.bottom, 10)
    const residualExtent = padDomain(extent(input.residualM), 0.15)
    const bound = Math.max(Math.abs(residualExtent[0]), Math.abs(residualExtent[1])) || 0.1
    const yr = linearScale([-bound, bound], [top + innerHeight, top])
    residualMap = { d0: -bound, d1: bound, r0: top + innerHeight, r1: top }
    const decimated = decimate(input.timesSec, input.residualM, maxPoints, gapThresholdSec)
    residualPath = seriesPath(decimated.timesSec, decimated.values, x, yr, breakOnNaNOnly)
    residualZeroY = yr(0)
    residualRules = heightTicks([-bound, bound], 3).map((value) => ({
      y: yr(value),
      label: value.toFixed(2),
    }))
    residualPlot = { x: MARGIN.left, y: top, width: plotWidth, height: innerHeight }
  }

  const plot = { x: MARGIN.left, y: MARGIN.top, width: plotWidth, height: plotHeight }

  return {
    width: input.width,
    height: input.chartHeight + residualHeight,
    plot,
    residualPlot,
    observedPath,
    modelPath,
    residualPath,
    residualZeroY,
    verticalRules: timeTicks(xDomain).map((tick) => ({
      x: x(tick.timeSec),
      label: dayLabel(tick.timeSec),
    })),
    horizontalRules: heightTicks(yDomain).map((value) => ({
      y: y(value),
      label: value.toFixed(2),
    })),
    residualRules,
    datumLines: input.datums.map((datum) => ({
      y: y(datum.heightM),
      label: datum.label,
      emphasis: datum.emphasis ?? false,
    })),
    datumStepMarks: (input.datumSteps ?? []).map((step) => ({
      x: x(step.atSec),
      label: `${step.shiftM >= 0 ? '+' : ''}${step.shiftM.toFixed(2)} m`,
    })),
    heldOutRect:
      input.heldOutWindow == null
        ? null
        : {
            x: x(input.heldOutWindow.startSec),
            width: Math.max(x(input.heldOutWindow.endSec) - x(input.heldOutWindow.startSec), 0),
          },
    xDomain,
    readout: buildReadout({
      timesSec: input.timesSec,
      observedM: input.observedM,
      modelM: input.modelM,
      residualM: hasResidual ? input.residualM : null,
    }),
    frame: {
      width: input.width,
      height: input.chartHeight + residualHeight,
      plot,
      x: { d0: xDomain[0], d1: xDomain[1], r0: MARGIN.left, r1: MARGIN.left + plotWidth },
      y: { d0: yDomain[0], d1: yDomain[1], r0: MARGIN.top + plotHeight, r1: MARGIN.top },
      residualY: residualMap,
    },
  }
}

export type { Scale }
