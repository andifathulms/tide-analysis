/**
 * UHSLC adapter — research-quality and fast-delivery hourly records.
 *
 * Implemented, and currently DISABLED behind the licence gate. UHSLC's portal
 * attaches per-country attribution conditions set by the national operator
 * that owns the gauge, and for the Indonesian stations that operator is BIG —
 * the same terms this project has not verified. Until they are read and
 * recorded in the manifest, the gate keeps this shut. See PRD §4.
 */

import type { RawSample } from '../normalise'

export const UHSLC_ERDDAP_URL = 'https://uhslc.soest.hawaii.edu/erddap/tabledap'

/** Hourly fast-delivery series for one station, as CSV. */
export function uhslcHourlyUrl(options: {
  readonly uhslcId: string
  readonly startIso: string
  readonly endIso: string
}): string {
  const constraints = [
    'sea_level',
    'time',
    `uhslc_id="${options.uhslcId}"`,
    `time>=${options.startIso}`,
    `time<=${options.endIso}`,
  ].join('&')
  return `${UHSLC_ERDDAP_URL}/global_hourly_fast.csv?${constraints}`
}

/**
 * Parse ERDDAP CSV: a header row, a units row, then data. Heights arrive in
 * millimetres and are converted once, here at the boundary.
 */
export function parseUhslcCsv(csv: string): RawSample[] {
  const lines = csv.split('\n').filter((line) => line.trim() !== '')
  if (lines.length < 3) return []

  const header = (lines[0] as string).split(',').map((h) => h.trim())
  const timeColumn = header.indexOf('time')
  const levelColumn = header.indexOf('sea_level')
  if (timeColumn < 0 || levelColumn < 0) {
    throw new Error('UHSLC CSV is missing a time or sea_level column')
  }

  const samples: RawSample[] = []
  for (const line of lines.slice(2)) {
    const fields = line.split(',')
    const timeField = fields[timeColumn]
    const levelField = fields[levelColumn]
    if (timeField === undefined || levelField === undefined) continue
    const millimetres = Number(levelField)
    if (!Number.isFinite(millimetres)) continue // ERDDAP writes NaN for gaps
    const timeSec = Math.round(Date.parse(timeField) / 1000)
    if (!Number.isFinite(timeSec)) continue
    samples.push({ timeSec, heightM: millimetres / 1000 })
  }
  return samples
}

/**
 * UHSLC publishes its research-quality series against a station benchmark
 * reference level, which is a documented datum but is not MSL.
 */
export const UHSLC_DATUM = {
  code: 'uhslc-station-reference',
  label: 'Referensi benchmark stasiun UHSLC',
  note: 'Tinggi merujuk level referensi stasiun yang didokumentasikan UHSLC, bukan MSL.',
} as const
