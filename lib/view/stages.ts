import type { TideType } from '@/lib/tide/formzahl'

/**
 * The station workspace as the inverse problem, in order: record the sea,
 * decompose it, test what the record can support, predict forward.
 *
 * Stages are a grouping over the existing routes, never new ones — every URL
 * the site has published keeps working. Uji holds two views because both are
 * checks on the fit: what the record length can resolve, and whether a second
 * method agrees.
 */

export const STATION_VIEWS = ['catatan', 'komponen', 'resolusi', 'banding', 'prediksi'] as const
export type StationView = (typeof STATION_VIEWS)[number]

export const STAGES = ['rekam', 'urai', 'uji', 'ramal'] as const
export type Stage = (typeof STAGES)[number]

const VIEWS_OF: Record<Stage, readonly StationView[]> = {
  rekam: ['catatan'],
  urai: ['komponen'],
  uji: ['resolusi', 'banding'],
  ramal: ['prediksi'],
}

export function stageOf(view: StationView): Stage {
  for (const stage of STAGES) {
    if (VIEWS_OF[stage].includes(view)) return stage
  }
  // Unreachable while VIEWS_OF covers STATION_VIEWS; asserted in tests.
  return 'rekam'
}

/** The views inside a stage, first one being where the stage link lands. */
export function viewsOf(stage: Stage): readonly StationView[] {
  return VIEWS_OF[stage]
}

/**
 * Formzahl class as a position on the ordered ramp, 1 (two tides a day) to 4
 * (one). The ramp tokens are `fz1`…`fz4`.
 */
export function formzahlRank(type: TideType): 1 | 2 | 3 | 4 {
  switch (type) {
    case 'harian-ganda':
      return 1
    case 'campuran-condong-ganda':
      return 2
    case 'campuran-condong-tunggal':
      return 3
    case 'harian-tunggal':
      return 4
    default: {
      const unreachable: never = type
      return unreachable
    }
  }
}
