/**
 * Any source → one Record (invariant 11).
 *
 * Gaps are declared, never interpolated (invariant 13): a missing span is a
 * property of the record, it affects the fit, and filling it silently would
 * corrupt the constants.
 */

import type { Gap, SerialisedRecord, RecordMetadata } from '@/lib/tide/record'

/** What every adapter produces before normalisation. */
export interface RawSample {
  /** Integer seconds UTC. */
  readonly timeSec: number
  /** Sea level in metres, in the source's own datum. */
  readonly heightM: number
}

export interface NormaliseOptions {
  readonly metadata: Omit<RecordMetadata, 'gaps' | 'intervalSec' | 'units'>
  /** Target sampling interval, seconds. Hourly for harmonic analysis. */
  readonly targetIntervalSec: number
  /**
   * How far from a target instant a sample may be and still represent it.
   * A nearest-sample rule is used rather than an hourly mean: averaging over
   * an hour attenuates the shallow-water constituents (M6 by about 10%), and
   * an attenuated constituent is a wrong constant, not a smoothed one.
   */
  readonly toleranceSec?: number
  /** Samples outside this range are dropped as physically impossible. */
  readonly plausibleRangeM?: readonly [number, number]
  /**
   * Reject isolated spikes and declare the slots they occupied as gaps.
   * On by default: a nine-metre single-sample excursion is the instrument, not
   * the sea, and leaving it in makes the fit meaningless. Set false to see the
   * record exactly as the source served it.
   */
  readonly rejectSpikes?: boolean
}

export interface NormaliseResult {
  readonly record: SerialisedRecord
  readonly dropped: {
    readonly duplicates: number
    readonly outOfRange: number
    readonly missingSlots: number
    readonly spikes: number
  }
}

/**
 * How far from its neighbours a reading may sit before it is an instrument
 * artefact rather than an observation. Semarang's radar threw single-sample
 * excursions of nine metres and returned to the tide on the next reading.
 */
const SPIKE_THRESHOLD_SIGMAS = 8
const SPIKE_FLOOR_M = 0.3

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number)
}

/**
 * Isolated spikes, marked for rejection.
 *
 * This is not smoothing and not quality control of the record: a rejected
 * reading is removed and the slot becomes a declared gap (invariant 13), never
 * an interpolated value. A tide moves smoothly between neighbouring hours, so
 * a reading that disagrees with the straight line through both of its
 * neighbours by many robust deviations is the instrument, not the sea.
 */
function findSpikes(values: readonly number[], slots: readonly number[]): Set<number> {
  const spikes = new Set<number>()
  if (values.length < 3) return spikes

  // Only genuinely consecutive triples are tested. Either side of a declared
  // gap the neighbours are hours or days away, and a reading there is not a
  // spike just because the tide moved while nothing was recording.
  const testable: Array<{ index: number; deviation: number }> = []
  for (let i = 1; i < values.length - 1; i += 1) {
    const consecutive =
      (slots[i] as number) - (slots[i - 1] as number) === 1 &&
      (slots[i + 1] as number) - (slots[i] as number) === 1
    if (!consecutive) continue
    const interpolated = ((values[i - 1] as number) + (values[i + 1] as number)) / 2
    testable.push({ index: i, deviation: Math.abs((values[i] as number) - interpolated) })
  }
  if (testable.length < 3) return spikes

  const deviations = testable.map((t) => t.deviation)
  const centre = median(deviations)
  const scale = 1.4826 * median(deviations.map((d) => Math.abs(d - centre)))
  const threshold = Math.max(SPIKE_THRESHOLD_SIGMAS * scale, SPIKE_FLOOR_M)

  // A spike also makes each of its neighbours look deviant, since the line
  // through them passes through the spike. Taking candidates in order of
  // deviation and refusing to flag anything adjacent to an already-flagged
  // reading leaves the actual outlier marked and its neighbours intact.
  const candidates = testable
    .filter((t) => t.deviation > threshold)
    .sort((a, b) => b.deviation - a.deviation || a.index - b.index)

  for (const { index } of candidates) {
    if (spikes.has(index - 1) || spikes.has(index + 1)) continue
    spikes.add(index)
  }
  return spikes
}

export function normalise(samples: readonly RawSample[], options: NormaliseOptions): NormaliseResult {
  const { targetIntervalSec } = options
  const toleranceSec = options.toleranceSec ?? Math.min(600, targetIntervalSec / 2)
  const range = options.plausibleRangeM ?? [-15, 15]

  let outOfRange = 0
  const byTime = new Map<number, number>()
  for (const sample of samples) {
    if (!Number.isFinite(sample.heightM) || !Number.isFinite(sample.timeSec)) {
      outOfRange += 1
      continue
    }
    if (sample.heightM < range[0] || sample.heightM > range[1]) {
      outOfRange += 1
      continue
    }
    // First reading for an instant wins. Deterministic, and it matters: a
    // later reading for the same instant is a different sensor or a
    // retransmission, and quietly overwriting would mix them.
    const key = Math.round(sample.timeSec)
    if (!byTime.has(key)) byTime.set(key, sample.heightM)
  }
  const duplicates = samples.length - byTime.size - outOfRange

  const ordered = [...byTime.entries()].sort((a, b) => a[0] - b[0])
  if (ordered.length === 0) {
    throw new Error(`${options.metadata.stationId}: no usable samples`)
  }

  const firstSec = (ordered[0] as [number, number])[0]
  const lastSec = (ordered[ordered.length - 1] as [number, number])[0]
  const startSec = Math.ceil(firstSec / targetIntervalSec) * targetIntervalSec

  const slots: number[] = []
  const heights: number[] = []
  const gaps: Gap[] = []
  let cursor = 0
  let missingSlots = 0
  let openGapStart: number | null = null

  for (let t = startSec; t <= lastSec; t += targetIntervalSec) {
    while (
      cursor + 1 < ordered.length &&
      Math.abs((ordered[cursor + 1] as [number, number])[0] - t) <=
        Math.abs((ordered[cursor] as [number, number])[0] - t)
    ) {
      cursor += 1
    }
    const [nearestTime, nearestHeight] = ordered[cursor] as [number, number]

    if (Math.abs(nearestTime - t) <= toleranceSec) {
      if (openGapStart !== null) {
        // endSec is exclusive — the first slot that has an observation again —
        // so endSec − startSec is exactly the observation time missing.
        gaps.push({
          startSec: openGapStart,
          endSec: t,
          reason: 'Tidak ada pengamatan pada rentang ini',
        })
        openGapStart = null
      }
      slots.push((t - startSec) / targetIntervalSec)
      heights.push(nearestHeight)
    } else {
      missingSlots += 1
      if (openGapStart === null) openGapStart = t
    }
  }
  if (openGapStart !== null) {
    gaps.push({
      startSec: openGapStart,
      endSec: lastSec,
      reason: 'Rekaman berakhir sebelum jendela selesai',
    })
  }

  if (slots.length === 0) {
    throw new Error(`${options.metadata.stationId}: no sample fell on the target grid`)
  }

  // Spikes are rejected, and the slots they occupied become declared gaps.
  // Nothing is interpolated into their place.
  const spikes = options.rejectSpikes === false ? new Set<number>() : findSpikes(heights, slots)
  const keptSlots: number[] = []
  const keptHeights: number[] = []
  for (let i = 0; i < slots.length; i += 1) {
    if (spikes.has(i)) {
      const at = startSec + (slots[i] as number) * targetIntervalSec
      gaps.push({
        startSec: at,
        endSec: at + targetIntervalSec,
        reason: 'Bacaan lonjakan ditolak — tidak diinterpolasi',
      })
      continue
    }
    keptSlots.push(slots[i] as number)
    keptHeights.push(heights[i] as number)
  }

  if (keptSlots.length === 0) {
    throw new Error(`${options.metadata.stationId}: every sample was rejected as a spike`)
  }

  gaps.sort((a, b) => a.startSec - b.startSec)
  const firstSlot = keptSlots[0] as number
  return {
    record: {
      ...options.metadata,
      intervalSec: targetIntervalSec,
      units: 'm',
      gaps,
      startSec: startSec + firstSlot * targetIntervalSec,
      sampleIndices: keptSlots.map((slot) => slot - firstSlot),
      heightsM: keptHeights.map((h) => Math.round(h * 10000) / 10000),
    },
    dropped: {
      duplicates: Math.max(duplicates, 0),
      outOfRange,
      missingSlots,
      spikes: spikes.size,
    },
  }
}

/** Total declared gap, in hours — reported with the record, never hidden. */
export function totalGapHours(gaps: readonly Gap[]): number {
  return gaps.reduce((sum, g) => sum + (g.endSec - g.startSec) / 3600, 0)
}
