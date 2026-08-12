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

/** Parse the service's JSON, keeping the sensor each reading came from. */
export function parseIocSamples(payload: unknown): Array<RawSample & { sensor: string }> {
  if (!Array.isArray(payload)) {
    throw new Error('IOC response was not an array')
  }
  const samples: Array<RawSample & { sensor: string }> = []
  for (const entry of payload) {
    if (typeof entry !== 'object' || entry === null) continue
    const candidate = entry as Partial<IocSample>
    if (typeof candidate.stime !== 'string' || typeof candidate.slevel !== 'number') continue
    // The service reports UTC as 'YYYY-MM-DD HH:MM:SS' with no zone marker.
    const timeSec = Math.round(Date.parse(`${candidate.stime.replace(' ', 'T')}Z`) / 1000)
    if (!Number.isFinite(timeSec)) continue
    samples.push({
      timeSec,
      heightM: candidate.slevel,
      sensor: typeof candidate.sensor === 'string' ? candidate.sensor : '',
    })
  }
  return samples
}

/** Parse and keep one sensor. Unknown shapes are rejected, not coerced. */
export function parseIocResponse(payload: unknown, sensor?: string): RawSample[] {
  return parseIocSamples(payload)
    .filter((s) => sensor === undefined || s.sensor === sensor)
    .map(({ timeSec, heightM }) => ({ timeSec, heightM }))
}

export interface SensorProfile {
  readonly sensor: string
  readonly count: number
  /** Standard deviation of the readings, metres. Inflated by spikes. */
  readonly sigmaM: number
  /**
   * Robust scale: 1.4826 × median absolute deviation, metres. Equal to σ for
   * clean data and unmoved by the occasional 9-metre instrument spike, which
   * is what makes it the right basis for choosing between sensors.
   */
  readonly robustSigmaM: number
  readonly minM: number
  readonly maxM: number
}

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number)
}

/** 1.4826 × MAD — the normal-consistent robust estimate of scale. */
export function robustScale(values: readonly number[]): number {
  if (values.length === 0) return 0
  const centre = median([...values].sort((a, b) => a - b))
  const deviations = values.map((v) => Math.abs(v - centre)).sort((a, b) => a - b)
  return 1.4826 * median(deviations)
}

/** What each sensor at a station actually reported — the basis of the choice. */
export function profileSensors(
  samples: ReadonlyArray<{ sensor: string; heightM: number }>,
): SensorProfile[] {
  const grouped = new Map<string, number[]>()
  for (const sample of samples) {
    const values = grouped.get(sample.sensor)
    if (values === undefined) grouped.set(sample.sensor, [sample.heightM])
    else values.push(sample.heightM)
  }

  return [...grouped.entries()]
    .map(([sensor, values]) => {
      // Accumulated in one pass. A station reports hundreds of thousands of
      // readings per sensor, and Math.min(...values) on that many arguments
      // overflows the stack.
      let sum = 0
      let minM = Number.POSITIVE_INFINITY
      let maxM = Number.NEGATIVE_INFINITY
      for (const value of values) {
        sum += value
        if (value < minM) minM = value
        if (value > maxM) maxM = value
      }
      const mean = sum / values.length
      let squares = 0
      for (const value of values) squares += (value - mean) ** 2

      return {
        sensor,
        count: values.length,
        sigmaM: Math.sqrt(squares / values.length),
        robustSigmaM: robustScale(values),
        minM,
        maxM,
      }
    })
    .sort((a, b) => b.count - a.count || a.sensor.localeCompare(b.sensor))
}

/**
 * A stuck gauge reports the same number for months. Benoa's `rad` sensor sat
 * at −0.281 m for the whole of 2026 while `ras` recorded a 2.3 m tide beside
 * it, so "the sensor with the most readings" picks the dead one.
 *
 * Below this, a sensor is flat-lined rather than quiet: even the calmest
 * Indonesian station moves by more than 2 cm over a month. Measured on the
 * robust scale, so a stuck gauge that throws the occasional spike still reads
 * as stuck.
 */
export const MINIMUM_SENSOR_SIGMA_M = 0.02

/** Above this, the readings are not a sea level record at all. */
export const MAXIMUM_SENSOR_SIGMA_M = 5

/**
 * Which sensor to take when a station reports several.
 *
 * A station commonly carries a radar, a pressure sensor and a backup, each
 * reporting on the same timestamps against its own zero. Merging them would
 * silently mix datums — the risk PRD §13 names — so exactly one is chosen.
 *
 * The choice is the sensor that actually varies: among those with comparable
 * coverage, the one with the largest *robust* scale inside a plausible tidal
 * band. Robust, not standard deviation: Semarang's radar sat around 5 m and
 * threw single-sample excursions to −4 m, which gave it the largest σ at the
 * station and would have won it the record on that basis. Ties break by count
 * and then by name, so the choice is deterministic, and the full profile is
 * recorded on the record rather than discarded.
 */
export function chooseSensor(profiles: readonly SensorProfile[]):
  | { readonly sensor: string; readonly reason: string }
  | { readonly sensor: null; readonly reason: string } {
  if (profiles.length === 0) return { sensor: null, reason: 'tidak ada bacaan' }

  const bestCoverage = Math.max(...profiles.map((p) => p.count))
  const candidates = profiles.filter(
    (p) =>
      p.count >= bestCoverage * 0.5 &&
      p.robustSigmaM >= MINIMUM_SENSOR_SIGMA_M &&
      p.robustSigmaM <= MAXIMUM_SENSOR_SIGMA_M,
  )

  if (candidates.length === 0) {
    return {
      sensor: null,
      reason: `tidak ada sensor yang bervariasi wajar (σ antara ${MINIMUM_SENSOR_SIGMA_M} m dan ${MAXIMUM_SENSOR_SIGMA_M} m) dengan cakupan memadai`,
    }
  }

  const chosen = [...candidates].sort(
    (a, b) =>
      b.robustSigmaM - a.robustSigmaM || b.count - a.count || a.sensor.localeCompare(b.sensor),
  )[0] as SensorProfile

  return {
    sensor: chosen.sensor,
    reason: `σ robust = ${chosen.robustSigmaM.toFixed(3)} m atas ${chosen.count} bacaan`,
  }
}

/** One line per sensor, for the record's processing note. */
export function describeSensors(profiles: readonly SensorProfile[]): string {
  return profiles
    .map(
      (p) =>
        `${p.sensor} (n=${p.count}, σ=${p.sigmaM.toFixed(3)} m, σ robust=${p.robustSigmaM.toFixed(3)} m, ${p.minM.toFixed(3)}…${p.maxM.toFixed(3)} m)`,
    )
    .join(', ')
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
