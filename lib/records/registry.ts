/**
 * The station registry the app reads: the manifest, plus one loader per record.
 *
 * The licence gate runs here too, before a record can be loaded — a record
 * whose source is unverified cannot reach a page even if a file for it exists.
 */

import manifestJson from '@/data/records/manifest.json'
import { RECORD_LOADERS } from '@/data/records/loaders'
import { assertSourceUsable, type RecordManifest, type SourceDeclaration } from '@/lib/sources/manifest'
import { toTideRecord, type TideRecord } from '@/lib/tide/record'

export const MANIFEST = manifestJson as RecordManifest

export interface StationSummary {
  readonly stationId: string
  readonly stationName: string
  readonly source: string
  readonly sourceName: string
  readonly licence: string
  readonly attribution: string
  readonly datumCode: string
  readonly startSec: number
  readonly endSec: number
  readonly lengthDays: number
  readonly sampleCount: number
  readonly gapCount: number
}

export function stations(): StationSummary[] {
  return MANIFEST.records
    .filter((record) => {
      try {
        assertSourceUsable(MANIFEST, record.source)
        return true
      } catch {
        return false
      }
    })
    .map((record) => {
      const source = MANIFEST.sources.find((s) => s.id === record.source) as SourceDeclaration
      return {
        stationId: record.stationId,
        stationName: record.stationName,
        source: record.source,
        sourceName: source.name,
        licence: source.licence,
        attribution: source.attribution,
        datumCode: record.datumCode,
        startSec: record.startSec,
        endSec: record.endSec,
        lengthDays: (record.endSec - record.startSec) / 86400,
        sampleCount: record.sampleCount,
        gapCount: record.gapCount,
      }
    })
    .sort((a, b) => a.stationName.localeCompare(b.stationName))
}

export function stationSummary(stationId: string): StationSummary | undefined {
  return stations().find((s) => s.stationId === stationId)
}

export function sourceOf(stationId: string): SourceDeclaration | undefined {
  const record = MANIFEST.records.find((r) => r.stationId === stationId)
  if (record === undefined) return undefined
  return MANIFEST.sources.find((s) => s.id === record.source)
}

/** Load a record's samples. Throws if the gate does not allow it. */
export async function loadRecord(stationId: string): Promise<TideRecord> {
  const declaration = MANIFEST.records.find((r) => r.stationId === stationId)
  if (declaration === undefined) {
    throw new Error(`No record declared for station '${stationId}'`)
  }
  assertSourceUsable(MANIFEST, declaration.source)
  const loader = RECORD_LOADERS[stationId]
  if (loader === undefined) {
    throw new Error(`No loader generated for station '${stationId}'`)
  }
  return toTideRecord(await loader())
}
