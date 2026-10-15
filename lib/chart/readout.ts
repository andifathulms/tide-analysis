/**
 * What the chart's crosshair reads off: a strided sample of the series it
 * draws, and the mapping from a point on the chart face back to a time and
 * three heights. Pure, so the lookup is tested rather than trusted, and the
 * crosshair component only draws what this returns (invariant 16).
 *
 * Heights are carried as whole millimetres. A readout is display, and the
 * chart a reader points at is drawn from the same numbers to well under a
 * pixel; the fitted constants are reported elsewhere at full precision. It
 * keeps the payload a page ships for its chart to a few kilobytes.
 */

export interface LinearMap {
  readonly d0: number
  readonly d1: number
  readonly r0: number
  readonly r1: number
}

export function applyMap(map: LinearMap, value: number): number {
  const span = map.d1 - map.d0
  return span === 0 ? (map.r0 + map.r1) / 2 : map.r0 + ((value - map.d0) / span) * (map.r1 - map.r0)
}

export function invertMap(map: LinearMap, value: number): number {
  const span = map.r1 - map.r0
  return span === 0 ? map.d0 : map.d0 + ((value - map.r0) / span) * (map.d1 - map.d0)
}

export interface Readout {
  readonly startSec: number
  /** Seconds after startSec, one per sample, ascending. */
  readonly offsetsSec: readonly number[]
  readonly observedMm: ReadonlyArray<number | null>
  readonly modelMm: ReadonlyArray<number | null> | null
  readonly residualMm: ReadonlyArray<number | null> | null
}

/** The geometry the crosshair needs from the chart model. */
export interface ReadoutFrame {
  readonly width: number
  readonly height: number
  readonly plot: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  /** Time (s) → x. */
  readonly x: LinearMap
  /** Height (m) → y on the main plot. */
  readonly y: LinearMap
  /** Residual (m) → y on the residual band; null when there is none. */
  readonly residualY: LinearMap | null
}

const toMm = (value: number | undefined): number | null =>
  value === undefined || !Number.isFinite(value) ? null : Math.round(value * 1000)

/**
 * Every stride-th sample, never min/max buckets: a readout must report a
 * value the record actually holds at the time it names.
 */
export function buildReadout(
  input: {
    readonly timesSec: ArrayLike<number>
    readonly observedM: ArrayLike<number>
    readonly modelM: ArrayLike<number> | null
    readonly residualM: ArrayLike<number> | null
  },
  maxSamples = 1200,
): Readout {
  const n = input.timesSec.length
  const stride = Math.max(1, Math.ceil(n / maxSamples))
  const startSec = n > 0 ? (input.timesSec[0] as number) : 0
  const offsetsSec: number[] = []
  const observedMm: Array<number | null> = []
  const modelMm: Array<number | null> = []
  const residualMm: Array<number | null> = []

  for (let i = 0; i < n; i += stride) {
    offsetsSec.push((input.timesSec[i] as number) - startSec)
    observedMm.push(toMm(input.observedM[i]))
    if (input.modelM !== null) modelMm.push(toMm(input.modelM[i]))
    if (input.residualM !== null) residualMm.push(toMm(input.residualM[i]))
  }

  return {
    startSec,
    offsetsSec,
    observedMm,
    modelMm: input.modelM === null ? null : modelMm,
    residualMm: input.residualM === null ? null : residualMm,
  }
}

/** Index of the sample nearest a time, by binary search. -1 when empty. */
export function nearestSample(readout: Readout, timeSec: number): number {
  const offsets = readout.offsetsSec
  if (offsets.length === 0) return -1
  const target = timeSec - readout.startSec
  let lo = 0
  let hi = offsets.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if ((offsets[mid] as number) <= target) lo = mid
    else hi = mid
  }
  return Math.abs((offsets[lo] as number) - target) <= Math.abs((offsets[hi] as number) - target)
    ? lo
    : hi
}

export interface CrosshairPoint {
  readonly timeSec: number
  readonly x: number
  readonly observed: { readonly m: number; readonly y: number } | null
  readonly model: { readonly m: number; readonly y: number } | null
  readonly residual: { readonly m: number; readonly y: number } | null
}

/**
 * The crosshair at a point on the chart face, in viewBox units. Null outside
 * the plot, and for a sample further than `maxGapSec` from the pointer — a
 * gap in the record is reported as a gap, never bridged by a neighbour.
 */
export function pointAt(
  frame: ReadoutFrame,
  readout: Readout,
  svgX: number,
  maxGapSec = 2 * 3600,
): CrosshairPoint | null {
  if (svgX < frame.plot.x || svgX > frame.plot.x + frame.plot.width) return null
  const timeSec = invertMap(frame.x, svgX)
  const index = nearestSample(readout, timeSec)
  if (index < 0) return null
  const sampleSec = readout.startSec + (readout.offsetsSec[index] as number)
  const strideSec =
    readout.offsetsSec.length > 1
      ? ((readout.offsetsSec[readout.offsetsSec.length - 1] as number) - (readout.offsetsSec[0] as number)) /
        (readout.offsetsSec.length - 1)
      : 0
  if (Math.abs(sampleSec - timeSec) > Math.max(maxGapSec, strideSec)) return null

  const pick = (series: ReadonlyArray<number | null> | null, map: LinearMap | null) => {
    if (series === null || map === null) return null
    const mm = series[index]
    if (mm === null || mm === undefined) return null
    const m = mm / 1000
    return { m, y: applyMap(map, m) }
  }

  return {
    timeSec: sampleSec,
    x: applyMap(frame.x, sampleSec),
    observed: pick(readout.observedMm, frame.y),
    model: pick(readout.modelMm, frame.y),
    residual: pick(readout.residualMm, frame.residualY),
  }
}
