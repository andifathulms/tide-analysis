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
  /** Samples outside this range are dropped as instrument spikes. */
  readonly plausibleRangeM?: readonly [number, number]
}

export interface NormaliseResult {
  readonly record: SerialisedRecord
  readonly dropped: {
    readonly duplicates: number
    readonly outOfRange: number
    readonly missingSlots: number
  }
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
    byTime.set(Math.round(sample.timeSec), sample.heightM)
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
  const firstSlot = slots[0] as number
  return {
    record: {
      ...options.metadata,
      intervalSec: targetIntervalSec,
      units: 'm',
      gaps,
      startSec: startSec + firstSlot * targetIntervalSec,
      sampleIndices: slots.map((slot) => slot - firstSlot),
      heightsM: heights.map((h) => Math.round(h * 10000) / 10000),
    },
    dropped: { duplicates: Math.max(duplicates, 0), outOfRange, missingSlots },
  }
}

/** Total declared gap, in hours — reported with the record, never hidden. */
export function totalGapHours(gaps: readonly Gap[]): number {
  return gaps.reduce((sum, g) => sum + (g.endSec - g.startSec) / 3600, 0)
}
