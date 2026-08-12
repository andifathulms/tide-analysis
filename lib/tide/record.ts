/**
 * The one internal record format. Every source normalises into this and
 * nothing downstream branches on provenance (invariant 11).
 *
 * Times are integer seconds UTC (invariant 8). Datum is a first-class field
 * and is never assumed to be MSL (invariant 9). Gaps are declared, never
 * interpolated (invariant 13).
 */

export type SourceId = 'ioc' | 'uhslc' | 'big' | 'synthetic'

/**
 * The zero the heights are referenced to. Records on different datums must
 * never be compared or merged without this being explicit on the face.
 */
export interface Datum {
  /** Short code as the source publishes it, e.g. 'station-zero', 'MSL'. */
  readonly code: string
  /** What the zero is, in Indonesian, for display on the chart face. */
  readonly label: string
  /** Anything the reader needs in order not to misread the heights. */
  readonly note?: string
}

/** A declared span with no observations. Part of the record, not an accident. */
export interface Gap {
  readonly startSec: number
  readonly endSec: number
  readonly reason: string
}

export interface RecordMetadata {
  /** Stable, readable, carries the source: 'ioc-benoa', 'uhslc-surabaya'. */
  readonly stationId: string
  readonly stationName: string
  readonly source: SourceId
  /** Licence identifier, resolved against data/records/manifest.json. */
  readonly licence: string
  readonly attribution: string
  readonly latitude: number
  readonly longitude: number
  readonly datum: Datum
  /**
   * Offset of the station's civil time from UTC, hours. Display only — the
   * numerical core never sees it (invariant 8).
   */
  readonly utcOffsetHours?: number
  /** Label for that offset, e.g. 'WITA'. Display only. */
  readonly timeZoneLabel?: string
  /** Nominal sampling interval in seconds. */
  readonly intervalSec: number
  readonly units: 'm'
  readonly gaps: readonly Gap[]
  /** How the record was retrieved and what was done to it. */
  readonly processing: string
}

/** A record in memory: typed arrays, ready for the design matrix. */
export interface TideRecord extends RecordMetadata {
  /** Integer seconds UTC, strictly increasing. */
  readonly timesSec: Float64Array
  /** Sea level in metres relative to `datum`. Same length as timesSec. */
  readonly heightsM: Float64Array
}

/**
 * The serialised form bundled under data/records.
 *
 * Times are stored as slot indices on the record's own interval rather than as
 * absolute seconds — the grid is regular by construction, so the absolute
 * times are derivable and storing them would triple the bundle. A slot that is
 * missing from `sampleIndices` is a gap, and the gap is declared as well.
 */
export interface SerialisedRecord extends RecordMetadata {
  readonly startSec: number
  /** Offsets from startSec in units of intervalSec, strictly increasing. */
  readonly sampleIndices: readonly number[]
  readonly heightsM: readonly number[]
}

export function toTideRecord(serialised: SerialisedRecord): TideRecord {
  const { sampleIndices, heightsM, startSec, ...metadata } = serialised
  if (sampleIndices.length !== heightsM.length) {
    throw new Error(`${metadata.stationId}: sample indices and heights differ in length`)
  }
  const timesSec = new Float64Array(sampleIndices.length)
  for (let i = 0; i < sampleIndices.length; i += 1) {
    timesSec[i] = startSec + (sampleIndices[i] as number) * metadata.intervalSec
  }
  return {
    ...metadata,
    timesSec,
    heightsM: Float64Array.from(heightsM),
  }
}

export function recordLengthHours(record: TideRecord): number {
  const n = record.timesSec.length
  if (n < 2) return 0
  return ((record.timesSec[n - 1] as number) - (record.timesSec[0] as number)) / 3600
}

export function recordLengthDays(record: TideRecord): number {
  return recordLengthHours(record) / 24
}

/** Midpoint of the record — where nodal f and u are evaluated. */
export function recordCentreSec(record: TideRecord): number {
  const n = record.timesSec.length
  if (n === 0) return 0
  return Math.round(((record.timesSec[0] as number) + (record.timesSec[n - 1] as number)) / 2)
}

/** Restrict a record to a window, keeping metadata and declared gaps. */
export function sliceRecord(record: TideRecord, startSec: number, endSec: number): TideRecord {
  const times: number[] = []
  const heights: number[] = []
  for (let i = 0; i < record.timesSec.length; i += 1) {
    const t = record.timesSec[i] as number
    if (t >= startSec && t <= endSec) {
      times.push(t)
      heights.push(record.heightsM[i] as number)
    }
  }
  return {
    ...record,
    gaps: record.gaps.filter((g) => g.endSec >= startSec && g.startSec <= endSec),
    timesSec: Float64Array.from(times),
    heightsM: Float64Array.from(heights),
  }
}

/** Root mean square of a series — the honest measure of a residual. */
export function rootMeanSquare(values: ArrayLike<number>): number {
  if (values.length === 0) return 0
  let sum = 0
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i] as number
    sum += v * v
  }
  return Math.sqrt(sum / values.length)
}
