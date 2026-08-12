/**
 * DEV only: survey every open Indonesian station and classify its tide.
 *
 * PRD §3 wants four ports with four tidal characters. The six bundled records
 * span two regimes, so this asks the obvious question of the source itself:
 * which open stations exist, which of them are actually recording, and what
 * Formzahl number does each one's record give?
 *
 * A month is enough. F needs only M2, S2, K1 and O1, and thirty days separates
 * M2 from S2 (14.8 days) and K1 from O1 (13.7 days) — so this fetches a short
 * window per station rather than the 212 days a bundled record carries. The
 * same licence gate, sensor choice and normalisation run as in records:fetch;
 * nothing here bundles anything.
 *
 *   pnpm records:sweep              # every Indonesian station IOC lists
 *   pnpm records:sweep --days 45    # a longer window
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertSourceUsable, type RecordManifest } from '../lib/sources/manifest'
import { normalise } from '../lib/sources/normalise'
import {
  chooseSensor,
  describeSensors,
  iocDataUrl,
  parseIocSamples,
  profileSensors,
  IOC_DATUM,
} from '../lib/sources/ioc'
import { toTideRecord, recordLengthDays } from '../lib/tide/record'
import { fitHarmonics } from '../lib/tide/fit'
import { formzahl, type TideType } from '../lib/tide/formzahl'
import type { RawSample } from '../lib/sources/normalise'

const RECORDS_DIR = join(process.cwd(), 'data', 'records')
const MANIFEST_PATH = join(RECORDS_DIR, 'manifest.json')
const STATION_LIST_URL =
  'https://www.ioc-sealevelmonitoring.org/service.php?query=stationlist&showall=all&format=json'

const REQUEST_TIMEOUT_MS = 90_000
const ATTEMPTS = 3

interface IocStation {
  readonly Code?: string
  readonly Location?: string
  readonly countryname?: string
  readonly country?: string
  readonly lat?: number
  readonly lon?: number
  readonly lasttime?: string
}

function argument(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0) return fallback
  const value = Number(process.argv[index + 1])
  return Number.isFinite(value) ? value : fallback
}

/** The window ends where the bundled records end, so this is comparable. */
const WINDOW_END = '2026-08-01'
const WINDOW_DAYS = argument('days', 35)
const CHUNK_DAYS = 25

async function fetchJson(url: string, label: string): Promise<unknown> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`)
      return (await response.json()) as unknown
    } catch (error) {
      lastError = error as Error
    }
  }
  throw lastError ?? new Error(`${label}: request failed`)
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function indonesianStations(): Promise<IocStation[]> {
  const payload = await fetchJson(STATION_LIST_URL, 'station list')
  if (!Array.isArray(payload)) throw new Error('station list was not an array')

  const seen = new Set<string>()
  const stations: IocStation[] = []
  for (const entry of payload as IocStation[]) {
    const code = entry.Code
    if (typeof code !== 'string' || code === '') continue
    const country = `${entry.countryname ?? ''} ${entry.country ?? ''}`.toLowerCase()
    if (!country.includes('indone') && !country.includes('idn')) continue
    // Only stations that reported inside the sweep window are worth a request.
    if (typeof entry.lasttime !== 'string' || entry.lasttime === '') continue
    if (seen.has(code)) continue
    seen.add(code)
    stations.push(entry)
  }
  return stations.sort((a, b) => (a.Code ?? '').localeCompare(b.Code ?? ''))
}

export interface SweepRow {
  readonly code: string
  readonly location: string
  readonly sensor: string | null
  readonly sampleCount: number
  readonly gapCount: number
  readonly lengthDays: number
  readonly M2: number | null
  readonly S2: number | null
  readonly K1: number | null
  readonly O1: number | null
  readonly formzahl: number | null
  readonly tideType: TideType | null
  readonly conditionNumber: number | null
  readonly residualRmsM: number | null
  readonly signalSigmaM: number | null
  readonly verdict: string
}

async function sweepStation(station: IocStation): Promise<SweepRow> {
  const code = station.Code as string
  const location = station.Location ?? code
  const blank: Omit<SweepRow, 'verdict'> = {
    code,
    location,
    sensor: null,
    sampleCount: 0,
    gapCount: 0,
    lengthDays: 0,
    M2: null,
    S2: null,
    K1: null,
    O1: null,
    formzahl: null,
    tideType: null,
    conditionNumber: null,
    residualRmsM: null,
    signalSigmaM: null,
  }

  const end = new Date(`${WINDOW_END}T00:00:00Z`)
  const start = new Date(end.getTime() - WINDOW_DAYS * 86400_000)
  const raw: Array<RawSample & { sensor: string }> = []

  let cursor = start
  while (cursor < end) {
    const chunkEnd = new Date(Math.min(cursor.getTime() + CHUNK_DAYS * 86400_000, end.getTime()))
    const payload = await fetchJson(
      iocDataUrl({ code, startIso: isoDay(cursor), endIso: isoDay(chunkEnd) }),
      code,
    )
    for (const sample of parseIocSamples(payload)) raw.push(sample)
    cursor = chunkEnd
  }

  if (raw.length === 0) return { ...blank, verdict: 'tidak ada bacaan' }

  const profiles = profileSensors(raw)
  const chosen = chooseSensor(profiles)
  if (chosen.sensor === null) {
    return { ...blank, verdict: `sensor mati atau tidak wajar — ${describeSensors(profiles)}` }
  }

  let serialised
  try {
    const result = normalise(
      raw
        .filter((sample) => sample.sensor === chosen.sensor)
        .map(({ timeSec, heightM }) => ({ timeSec, heightM })),
      {
        targetIntervalSec: 3600,
        metadata: {
          stationId: `ioc-${code}`,
          stationName: location,
          source: 'ioc',
          licence: 'sweep',
          attribution: 'sweep',
          latitude: station.lat ?? 0,
          longitude: station.lon ?? 0,
          datum: IOC_DATUM,
          processing: 'sweep',
        },
      },
    )
    serialised = result.record
  } catch (error) {
    return { ...blank, sensor: chosen.sensor, verdict: `normalisasi gagal: ${(error as Error).message}` }
  }

  const record = toTideRecord(serialised)
  const lengthDays = recordLengthDays(record)
  const mean =
    Array.from(record.heightsM).reduce((sum, h) => sum + h, 0) / record.heightsM.length
  const signalSigmaM = Math.sqrt(
    Array.from(record.heightsM).reduce((sum, h) => sum + (h - mean) ** 2, 0) /
      record.heightsM.length,
  )

  const partial = {
    ...blank,
    sensor: chosen.sensor,
    sampleCount: record.timesSec.length,
    gapCount: record.gaps.length,
    lengthDays,
    signalSigmaM,
  }

  const outcome = fitHarmonics({ record, constituents: ['M2', 'S2', 'K1', 'O1'] })
  if (outcome.type === 'refusal') {
    return { ...partial, verdict: `ditolak: ${outcome.message}` }
  }

  const amplitude = (name: 'M2' | 'S2' | 'K1' | 'O1'): number =>
    outcome.constants.find((c) => c.name === name)?.amplitudeM ?? 0
  const F = formzahl(outcome.constants)

  return {
    ...partial,
    M2: amplitude('M2'),
    S2: amplitude('S2'),
    K1: amplitude('K1'),
    O1: amplitude('O1'),
    formzahl: F.value,
    tideType: F.type,
    conditionNumber: outcome.conditionNumber,
    residualRmsM: outcome.residualRmsM,
    verdict:
      outcome.residualRmsM > signalSigmaM * 0.7
        ? 'cocok buruk — model tidak menjelaskan rekaman'
        : 'baik',
  }
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as RecordManifest
  // The gate, before any request. A sweep is still a use of the source.
  assertSourceUsable(manifest, 'ioc')

  const stations = await indonesianStations()
  console.log(`${stations.length} stasiun Indonesia terdaftar dan pernah mengirim data.`)
  console.log(`Jendela: ${WINDOW_DAYS} hari sampai ${WINDOW_END}.\n`)

  const rows: SweepRow[] = []
  for (const station of stations) {
    process.stdout.write(`  ${(station.Code ?? '').padEnd(8)} ${station.Location ?? ''}… `)
    try {
      const row = await sweepStation(station)
      rows.push(row)
      process.stdout.write(
        row.formzahl === null
          ? `${row.verdict}\n`
          : `F=${row.formzahl.toFixed(3)} ${row.tideType} (${row.verdict})\n`,
      )
    } catch (error) {
      rows.push({
        code: station.Code as string,
        location: station.Location ?? '',
        sensor: null,
        sampleCount: 0,
        gapCount: 0,
        lengthDays: 0,
        M2: null,
        S2: null,
        K1: null,
        O1: null,
        formzahl: null,
        tideType: null,
        conditionNumber: null,
        residualRmsM: null,
        signalSigmaM: null,
        verdict: `gagal: ${(error as Error).message}`,
      })
      process.stdout.write(`gagal: ${(error as Error).message}\n`)
    }
  }

  const usable = rows
    .filter((row) => row.formzahl !== null && row.verdict === 'baik')
    .sort((a, b) => (b.formzahl as number) - (a.formzahl as number))

  console.log(`\n${usable.length} stasiun menghasilkan pencocokan yang layak:\n`)
  console.log(
    'kode     lokasi                                   F      tipe                          M2     S2     K1     O1     RMS',
  )
  for (const row of usable) {
    console.log(
      `${row.code.padEnd(8)} ${row.location.slice(0, 40).padEnd(40)} ` +
        `${(row.formzahl as number).toFixed(3).padStart(6)} ${(row.tideType as string).padEnd(28)} ` +
        `${(row.M2 as number).toFixed(3)}  ${(row.S2 as number).toFixed(3)}  ` +
        `${(row.K1 as number).toFixed(3)}  ${(row.O1 as number).toFixed(3)}  ` +
        `${(row.residualRmsM as number).toFixed(3)}`,
    )
  }

  const byType = new Map<string, number>()
  for (const row of usable) byType.set(row.tideType as string, (byType.get(row.tideType as string) ?? 0) + 1)
  console.log('\nSebaran tipe:')
  for (const [type, count] of byType) console.log(`  ${type.padEnd(30)} ${count}`)

  const path = join(process.cwd(), 'sweep-results.json')
  writeFileSync(path, `${JSON.stringify(rows, null, 2)}\n`)
  console.log(`\nHasil lengkap: ${path}`)
}

void main()
