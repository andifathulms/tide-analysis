/**
 * Chart geometry. Invariant 16: nothing is computed in a component — scales,
 * ticks and path strings are built here, and the SVG components only render
 * what this produces.
 */

export interface Scale {
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  (value: number): number
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  const scale = ((value: number) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0)) as {
    (value: number): number
    domain?: readonly [number, number]
    range?: readonly [number, number]
  }
  scale.domain = domain
  scale.range = range
  return scale as Scale
}

export function extent(values: ArrayLike<number>): [number, number] {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i] as number
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  return [min, max]
}

/** Pad a domain by a fraction of its span, so traces never touch the frame. */
export function padDomain(
  domain: readonly [number, number],
  fraction = 0.08,
): [number, number] {
  const [min, max] = domain
  const span = max - min || 1
  return [min - span * fraction, max + span * fraction]
}

/** Round height ticks to a readable step — the ruling of a printed chart. */
export function heightTicks(domain: readonly [number, number], target = 6): number[] {
  const [min, max] = domain
  const span = max - min
  if (span <= 0) return [min]
  const rough = span / target
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * magnitude)
  const step = candidates.find((c) => c >= rough) ?? magnitude * 10
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = first; t <= max + step * 1e-6; t += step) {
    ticks.push(Math.round(t / step) * step)
  }
  return ticks
}

const DAY_SEC = 86400

/** Time ticks on day boundaries, thinned to a readable count. */
export function timeTicks(
  domain: readonly [number, number],
  target = 8,
): Array<{ timeSec: number; major: boolean }> {
  const [start, end] = domain
  const days = (end - start) / DAY_SEC
  const stepDays = [1, 2, 5, 7, 14, 28, 56, 91, 182].find((d) => days / d <= target) ?? 365
  const firstDay = Math.ceil(start / DAY_SEC) * DAY_SEC
  const ticks: Array<{ timeSec: number; major: boolean }> = []
  for (let t = firstDay; t <= end; t += stepDays * DAY_SEC) {
    ticks.push({ timeSec: t, major: true })
  }
  return ticks
}

export interface SeriesPoint {
  readonly timeSec: number
  readonly value: number
}

/**
 * SVG path for a series, broken wherever the record has a gap. A tide chart
 * that draws a straight line across a missing week is lying about the week —
 * gaps are declared, and here they are visible as breaks in the trace.
 */
export function seriesPath(
  timesSec: ArrayLike<number>,
  values: ArrayLike<number>,
  x: Scale,
  y: Scale,
  gapThresholdSec: number,
): string {
  let path = ''
  let penDown = false
  for (let i = 0; i < timesSec.length; i += 1) {
    const t = timesSec[i] as number
    const v = values[i] as number
    if (!Number.isFinite(v)) {
      penDown = false
      continue
    }
    const previous = i > 0 ? (timesSec[i - 1] as number) : null
    const broken = previous !== null && t - previous > gapThresholdSec
    const cx = x(t).toFixed(2)
    const cy = y(v).toFixed(2)
    if (!penDown || broken) {
      path += `M${cx} ${cy}`
      penDown = true
    } else {
      path += `L${cx} ${cy}`
    }
  }
  return path
}

/** Thin a long series to at most `maxPoints`, keeping extremes in each bucket. */
export function decimate(
  timesSec: ArrayLike<number>,
  values: ArrayLike<number>,
  maxPoints: number,
): { timesSec: Float64Array; values: Float64Array } {
  const n = timesSec.length
  if (n <= maxPoints) {
    return { timesSec: Float64Array.from(timesSec), values: Float64Array.from(values) }
  }
  const bucketSize = Math.ceil(n / Math.floor(maxPoints / 2))
  const outTimes: number[] = []
  const outValues: number[] = []
  for (let start = 0; start < n; start += bucketSize) {
    const end = Math.min(start + bucketSize, n)
    let minIndex = start
    let maxIndex = start
    for (let i = start; i < end; i += 1) {
      if ((values[i] as number) < (values[minIndex] as number)) minIndex = i
      if ((values[i] as number) > (values[maxIndex] as number)) maxIndex = i
    }
    const [first, second] = minIndex <= maxIndex ? [minIndex, maxIndex] : [maxIndex, minIndex]
    outTimes.push(timesSec[first] as number)
    outValues.push(values[first] as number)
    if (second !== first) {
      outTimes.push(timesSec[second] as number)
      outValues.push(values[second] as number)
    }
  }
  return { timesSec: Float64Array.from(outTimes), values: Float64Array.from(outValues) }
}
