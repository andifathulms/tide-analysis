/**
 * DEV/CI only: pull station records from the open sources and bundle them.
 *
 * The app never does this — there is no runtime network. The licence gate runs
 * before any adapter is touched (invariant 12), so a source whose terms are
 * unverified cannot be fetched even by accident.
 *
 *   pnpm records:fetch                 # every enabled station
 *   pnpm records:fetch ioc-benoa       # one station
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  assertSourceUsable,
  LicenceGateError,
  type RecordDeclaration,
  type RecordManifest,
} from '../lib/sources/manifest'
import { normalise, totalGapHours, type RawSample } from '../lib/sources/normalise'
import {
  iocDataUrl,
  parseIocSamples,
  chooseSensor,
  describeSensors,
  profileSensors,
  IOC_DATUM,
} from '../lib/sources/ioc'
import type { SerialisedRecord, SourceId } from '../lib/tide/record'

const RECORDS_DIR = join(process.cwd(), 'data', 'records')
const MANIFEST_PATH = join(RECORDS_DIR, 'manifest.json')

/** Fetch window. Long enough to separate K1 from P1 and S2 from K2. */
const WINDOW_START = '2026-01-01'
const WINDOW_END = '2026-08-01'
const CHUNK_DAYS = 25

interface StationSpec {
  readonly stationId: string
  readonly stationName: string
  readonly source: SourceId
  /** Station code at the source. */
  readonly code: string
  readonly latitude: number
  readonly longitude: number
  /** Display only: the station's civil time, never used in the fit. */
  readonly utcOffsetHours: number
  readonly timeZoneLabel: string
  /** Which sensor to take when the station reports more than one. */
  readonly sensor?: string
}

/**
 * Four coasts, four tidal characters — PRD §3. The Formzahl number that
 * classifies them is computed from the fit, never looked up.
 */
const STATIONS: readonly StationSpec[] = [
  {
    stationId: 'ioc-benoa',
    stationName: 'Benoa, Bali',
    source: 'ioc',
    code: 'beno',
    latitude: -8.75,
    longitude: 115.21,
    utcOffsetHours: 8,
    timeZoneLabel: 'WITA',
  },
  {
    stationId: 'ioc-surabaya',
    stationName: 'Surabaya, Jawa Timur',
    source: 'ioc',
    code: 'sura',
    latitude: -7.2,
    longitude: 112.73,
    utcOffsetHours: 7,
    timeZoneLabel: 'WIB',
  },
  {
    stationId: 'ioc-semarang',
    stationName: 'Semarang, Jawa Tengah',
    source: 'ioc',
    code: 'sema',
    latitude: -6.95,
    longitude: 110.43,
    utcOffsetHours: 7,
    timeZoneLabel: 'WIB',
  },
  {
    stationId: 'ioc-bitung',
    stationName: 'Bitung, Sulawesi Utara',
    source: 'ioc',
    code: 'bitu',
    latitude: 1.44,
    longitude: 125.19,
    utcOffsetHours: 8,
    timeZoneLabel: 'WITA',
  },
  {
    stationId: 'ioc-padang',
    stationName: 'Padang, Sumatera Barat',
    source: 'ioc',
    code: 'pada',
    latitude: -0.95,
    longitude: 100.35,
    utcOffsetHours: 7,
    timeZoneLabel: 'WIB',
  },
  {
    // Diurnal — the regime PRD §3 names Tanjung Priok for. This gauge sits in
    // Jakarta's port, and the sweep put it at F = 3.8: one tide a day.
    stationId: 'ioc-kolinamil',
    stationName: 'Kolinamil, Pelabuhan Jakarta',
    source: 'ioc',
    code: 'koli',
    latitude: -6.1,
    longitude: 106.85,
    utcOffsetHours: 7,
    timeZoneLabel: 'WIB',
  },
  {
    // Semidiurnal — the other end of the range, at the mouth of the Malacca
    // Strait. Two nearly equal tides a day.
    stationId: 'ioc-sabang',
    stationName: 'Sabang, Aceh',
    source: 'ioc',
    code: 'saba',
    latitude: 5.88,
    longitude: 95.32,
    utcOffsetHours: 7,
    timeZoneLabel: 'WIB',
  },
  {
    stationId: 'ioc-ambon',
    stationName: 'Ambon, Maluku',
    source: 'ioc',
    code: 'ambon',
    latitude: -3.69,
    longitude: 128.18,
    utcOffsetHours: 9,
    timeZoneLabel: 'WIT',
  },
]

function readManifest(): RecordManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as RecordManifest
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const REQUEST_TIMEOUT_MS = 90_000
const ATTEMPTS = 3

/**
 * The service occasionally holds a connection open indefinitely. A build step
 * that hangs is worse than one that fails, so each request carries a timeout
 * and a bounded retry, and a station that will not come down is skipped with a
 * message rather than silently half-fetched.
 */
async function fetchJsonWithRetry(url: string, stationId: string): Promise<unknown> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (!response.ok) {
        throw new Error(`${stationId}: IOC responded ${response.status}`)
      }
      return (await response.json()) as unknown
    } catch (error) {
      lastError = error as Error
      process.stdout.write(`    attempt ${attempt}/${ATTEMPTS} failed: ${lastError.message}\n`)
    }
  }
  throw lastError ?? new Error(`${stationId}: request failed`)
}

interface IocFetchResult {
  readonly samples: readonly RawSample[]
  readonly sensor: string
  readonly sensorNote: string
}

async function fetchIoc(spec: StationSpec): Promise<IocFetchResult> {
  const raw: Array<RawSample & { sensor: string }> = []
  const end = new Date(`${WINDOW_END}T00:00:00Z`)
  let cursor = new Date(`${WINDOW_START}T00:00:00Z`)

  while (cursor < end) {
    const chunkEnd = new Date(
      Math.min(cursor.getTime() + CHUNK_DAYS * 86400_000, end.getTime()),
    )
    const url = iocDataUrl({
      code: spec.code,
      startIso: isoDay(cursor),
      endIso: isoDay(chunkEnd),
    })
    const payload = await fetchJsonWithRetry(url, spec.stationId)
    const chunk = parseIocSamples(payload)
    // Pushed one at a time: spreading a chunk of this size overflows the stack.
    for (const sample of chunk) raw.push(sample)
    process.stdout.write(
      `  ${spec.stationId} ${isoDay(cursor)} → ${isoDay(chunkEnd)}: ${chunk.length} bacaan\n`,
    )
    cursor = chunkEnd
  }

  // One sensor, chosen deterministically. A station reports several against
  // their own zeros, and merging them would mix datums (invariant 9). The one
  // that actually varies is the one recording a tide; a stuck gauge is not a
  // record, and a station where nothing varies is skipped rather than bundled.
  const profiles = profileSensors(raw)
  const chosen = spec.sensor === undefined ? chooseSensor(profiles) : { sensor: spec.sensor, reason: 'dipilih manual' }
  process.stdout.write(`  ${spec.stationId} sensor: ${describeSensors(profiles)}\n`)
  if (chosen.sensor === null) {
    throw new Error(`${spec.stationId}: ${chosen.reason} — ${describeSensors(profiles)}`)
  }
  process.stdout.write(`  ${spec.stationId} → sensor ${chosen.sensor} (${chosen.reason})\n`)

  return {
    samples: raw
      .filter((sample) => sample.sensor === chosen.sensor)
      .map(({ timeSec, heightM }) => ({ timeSec, heightM })),
    sensor: chosen.sensor,
    sensorNote: `Sensor ${chosen.sensor} dipilih (${chosen.reason}) dari ${describeSensors(profiles)}; hanya satu sensor dipakai agar datum tidak tercampur.`,
  }
}

async function fetchStation(
  spec: StationSpec,
  manifest: RecordManifest,
): Promise<{ record: SerialisedRecord; declaration: RecordDeclaration }> {
  // The gate, before the adapter. Not after, and not optionally.
  const source = assertSourceUsable(manifest, spec.source)

  if (spec.source !== 'ioc') {
    throw new Error(`No fetcher wired for source '${spec.source}'`)
  }
  const { samples, sensorNote } = await fetchIoc(spec)

  const { record: normalised, dropped } = normalise(samples, {
    targetIntervalSec: 3600,
    metadata: {
      stationId: spec.stationId,
      stationName: spec.stationName,
      source: spec.source,
      licence: source.licence,
      attribution: source.attribution,
      latitude: spec.latitude,
      longitude: spec.longitude,
      datum: IOC_DATUM,
      utcOffsetHours: spec.utcOffsetHours,
      timeZoneLabel: spec.timeZoneLabel,
      processing: '',
    },
  })

  // Written after normalisation, because it reports what normalisation did.
  const record: SerialisedRecord = {
    ...normalised,
    processing:
      `Diambil dari ${source.name} untuk ${WINDOW_START}…${WINDOW_END}. ` +
      `${sensorNote} ` +
      `Disampel ke grid jam dengan aturan sampel terdekat (toleransi 10 menit); tanpa interpolasi. ` +
      `${dropped.spikes} bacaan lonjakan ditolak dan slotnya dinyatakan sebagai jeda; ` +
      `${dropped.outOfRange} bacaan di luar rentang wajar dibuang.`,
  }

  const lastIndex = record.sampleIndices[record.sampleIndices.length - 1] as number
  const endSec = record.startSec + lastIndex * record.intervalSec
  const declaration: RecordDeclaration = {
    stationId: record.stationId,
    stationName: record.stationName,
    source: record.source,
    file: `${record.stationId}.json`,
    startSec: record.startSec,
    endSec,
    sampleCount: record.sampleIndices.length,
    intervalSec: record.intervalSec,
    datumCode: record.datum.code,
    gapCount: record.gaps.length,
    fetchedOn: new Date().toISOString().slice(0, 10),
  }

  const days = (endSec - record.startSec) / 86400
  console.log(
    `  → ${record.stationId}: ${days.toFixed(1)} hari, ${declaration.sampleCount} sampel, ` +
      `${record.gaps.length} jeda (${totalGapHours(record.gaps).toFixed(0)} jam), ` +
      `${dropped.outOfRange} di luar rentang, ${dropped.spikes} lonjakan ditolak, ${dropped.missingSlots} slot kosong`,
  )
  return { record, declaration }
}

/**
 * One dynamic import per record, so each ships as its own chunk (PRD §12) and
 * a page pulls only the station it is showing.
 */
function writeLoaders(declarations: readonly RecordDeclaration[]): void {
  const entries = declarations
    .map(
      (d) =>
        `  '${d.stationId}': () =>\n    import('./${d.file}').then((m) => m.default as unknown as SerialisedRecord),`,
    )
    .join('\n')

  const contents = `/**
 * Generated by scripts/fetch-records.ts. Do not edit by hand.
 */

import type { SerialisedRecord } from '@/lib/tide/record'

export const RECORD_LOADERS: Record<string, () => Promise<SerialisedRecord>> = {
${entries}
}
`
  writeFileSync(join(RECORDS_DIR, 'loaders.ts'), contents)
}

async function main(): Promise<void> {
  const manifest = readManifest()
  const requested = process.argv.slice(2)
  const wanted =
    requested.length > 0 ? STATIONS.filter((s) => requested.includes(s.stationId)) : STATIONS

  if (wanted.length === 0) {
    console.error(`No station matched ${requested.join(', ')}`)
    process.exit(1)
  }

  const declarations: RecordDeclaration[] = [...manifest.records]
  for (const spec of wanted) {
    console.log(`${spec.stationId} (${spec.code})`)
    try {
      const { record, declaration } = await fetchStation(spec, manifest)
      writeFileSync(join(RECORDS_DIR, declaration.file), `${JSON.stringify(record)}\n`)
      const existing = declarations.findIndex((d) => d.stationId === declaration.stationId)
      if (existing >= 0) declarations[existing] = declaration
      else declarations.push(declaration)
    } catch (error) {
      if (error instanceof LicenceGateError) {
        console.error(`  gate closed: ${error.message}`)
        continue
      }
      console.error(`  failed: ${(error as Error).message}`)
    }
  }

  declarations.sort((a, b) => a.stationId.localeCompare(b.stationId))
  const updated: RecordManifest = { ...manifest, records: declarations }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(updated, null, 2)}\n`)
  writeLoaders(declarations)
  console.log(`\nManifest updated: ${declarations.length} records declared.`)
}

void main()
