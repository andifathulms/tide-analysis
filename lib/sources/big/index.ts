/**
 * BIG (Badan Informasi Geospasial) adapter — DISABLED.
 *
 * tides.big.go.id serves records from BIG's permanent station network at ports
 * around the archipelago, referenced to SWL = 0, and BIG's Model Pasut product
 * publishes harmonic constants and tidal datums. Whether either is
 * redistributable is unverified (PRD §4), so this adapter ships disabled behind
 * the licence gate and no BIG data is committed to this repository.
 *
 * Do not enable this, and do not paste BIG data in, until the terms are read
 * and recorded in data/records/manifest.json.
 *
 * The parser below exists so that enabling the source later is a manifest
 * change plus a fetch, not a rewrite — the shape it emits is the same Record
 * every other source emits (invariant 11).
 */

import type { RawSample } from '../normalise'

export const BIG_DISABLED_REASON =
  'Syarat penggunaan data BIG belum diverifikasi. Adapter tersedia, gerbang lisensi menutupnya.'

export interface BigObservation {
  readonly waktu: string
  readonly tinggi: number
}

export function parseBigObservations(payload: unknown): RawSample[] {
  if (!Array.isArray(payload)) {
    throw new Error('BIG response was not an array')
  }
  const samples: RawSample[] = []
  for (const entry of payload) {
    if (typeof entry !== 'object' || entry === null) continue
    const candidate = entry as Partial<BigObservation>
    if (typeof candidate.waktu !== 'string' || typeof candidate.tinggi !== 'number') continue
    const timeSec = Math.round(Date.parse(candidate.waktu) / 1000)
    if (!Number.isFinite(timeSec)) continue
    samples.push({ timeSec, heightM: candidate.tinggi })
  }
  return samples
}

/** BIG references its stations to SWL = 0, which is not MSL. */
export const BIG_DATUM = {
  code: 'big-swl-zero',
  label: 'SWL = 0 (BIG)',
  note: 'BIG merujuk rekaman stasiunnya ke SWL = 0. Bukan MSL dan bukan chart datum.',
} as const
