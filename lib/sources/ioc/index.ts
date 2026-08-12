/**
 * IOC Sea Level Station Monitoring Facility adapter.
 *
 * The facility serves raw, uncontrolled sensor data — its own disclaimer says
 * so plainly — which is exactly what harmonic analysis should be shown working
 * on. Heights are metres against the station's own sensor zero, not MSL, and
 * that is carried through as the datum (invariant 9).
 *
 * Retrieval happens at build time in scripts/fetch-records.ts. Nothing here is
 * called from the app: there is no runtime network.
 */

import type { RawSample } from '../normalise'

export const IOC_SERVICE_URL = 'https://www.ioc-sealevelmonitoring.org/service.php'

/** One request per window; the service caps how much it returns at a time. */
export function iocDataUrl(options: {
  readonly code: string
  readonly startIso: string
  readonly endIso: string
}): string {
  const parameters = new URLSearchParams({
    query: 'data',
    code: options.code,
    timestart: options.startIso,
    timestop: options.endIso,
    format: 'json',
  })
  return `${IOC_SERVICE_URL}?${parameters.toString()}`
}

export interface IocSample {
  readonly stime: string
  readonly slevel: number
  readonly sensor: string
}

/** Parse the service's JSON. Unknown shapes are rejected, not coerced. */
export function parseIocResponse(payload: unknown, sensor?: string): RawSample[] {
  if (!Array.isArray(payload)) {
    throw new Error('IOC response was not an array')
  }
  const samples: RawSample[] = []
  for (const entry of payload) {
    if (typeof entry !== 'object' || entry === null) continue
    const candidate = entry as Partial<IocSample>
    if (typeof candidate.stime !== 'string' || typeof candidate.slevel !== 'number') continue
    if (sensor !== undefined && candidate.sensor !== sensor) continue
    // The service reports UTC as 'YYYY-MM-DD HH:MM:SS' with no zone marker.
    const timeSec = Math.round(Date.parse(`${candidate.stime.replace(' ', 'T')}Z`) / 1000)
    if (!Number.isFinite(timeSec)) continue
    samples.push({ timeSec, heightM: candidate.slevel })
  }
  return samples
}

/** Which sensor to prefer when a station reports several. */
export function preferredSensor(samples: readonly IocSample[]): string | undefined {
  const counts = new Map<string, number>()
  for (const s of samples) counts.set(s.sensor, (counts.get(s.sensor) ?? 0) + 1)
  let best: string | undefined
  let bestCount = 0
  for (const [sensor, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count > bestCount) {
      best = sensor
      bestCount = count
    }
  }
  return best
}

/**
 * The datum IOC records carry. Never assumed to be MSL — the facility does not
 * publish a levelling for most stations, and treating sensor zero as MSL is
 * the datum confusion PRD §13 lists as a risk.
 */
export const IOC_DATUM = {
  code: 'ioc-sensor-zero',
  label: 'Nol sensor stasiun (bukan MSL)',
  note: 'IOC menyajikan data mentah terhadap nol sensor masing-masing stasiun. Tinggi di sini tidak merujuk MSL, LAT, maupun chart datum.',
} as const
