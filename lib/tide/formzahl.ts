/**
 * Formzahl number and tide type.
 *
 *   F = (K1 + O1) / (M2 + S2)
 *
 * The ratio of the diurnal to the semidiurnal amplitudes, and the standard
 * classification of tidal character. Computed from fitted constants — the
 * point of PRD §3 is that four Indonesian ports give four different answers
 * from identical physics, which only means something if the numbers come out
 * of the record rather than a table.
 *
 * Class boundaries follow Courtier (1938), as used in Indonesian practice and
 * reproduced in Pugh (1987) §4.2.
 */

import type { ConstituentName } from './constituents'

export type TideType =
  | 'harian-ganda'
  | 'campuran-condong-ganda'
  | 'campuran-condong-tunggal'
  | 'harian-tunggal'

export interface FormzahlResult {
  readonly value: number
  readonly type: TideType
  /** Indonesian name of the class, for display. */
  readonly label: string
  /** One line on what the tide actually does, for a reader who is new to it. */
  readonly description: string
  readonly amplitudes: {
    readonly K1: number
    readonly O1: number
    readonly M2: number
    readonly S2: number
  }
  /** Which of the four the fit could not supply — F is unreliable without all. */
  readonly missing: readonly ConstituentName[]
}

const CLASSES: ReadonlyArray<{
  readonly limit: number
  readonly type: TideType
  readonly label: string
  readonly description: string
}> = [
  {
    limit: 0.25,
    type: 'harian-ganda',
    label: 'Harian ganda (semidiurnal)',
    description: 'Dua pasang dan dua surut setiap hari, tingginya hampir sama.',
  },
  {
    limit: 1.5,
    type: 'campuran-condong-ganda',
    label: 'Campuran condong ke harian ganda',
    description: 'Dua pasang dan dua surut setiap hari, tetapi tinggi dan waktunya berbeda.',
  },
  {
    limit: 3.0,
    type: 'campuran-condong-tunggal',
    label: 'Campuran condong ke harian tunggal',
    description:
      'Umumnya satu pasang dan satu surut sehari; pada saat tertentu muncul dua yang sangat timpang.',
  },
  {
    limit: Number.POSITIVE_INFINITY,
    type: 'harian-tunggal',
    label: 'Harian tunggal (diurnal)',
    description: 'Satu pasang dan satu surut setiap hari.',
  },
]

export function classifyFormzahl(value: number): {
  type: TideType
  label: string
  description: string
} {
  const found = CLASSES.find((c) => value <= c.limit) ?? CLASSES[CLASSES.length - 1]
  const klass = found as (typeof CLASSES)[number]
  return { type: klass.type, label: klass.label, description: klass.description }
}

export interface AmplitudeSource {
  readonly name: ConstituentName
  readonly amplitudeM: number
}

export function formzahl(constants: readonly AmplitudeSource[]): FormzahlResult {
  const amplitudeOf = (name: ConstituentName): number =>
    constants.find((c) => c.name === name)?.amplitudeM ?? 0

  const required: ConstituentName[] = ['K1', 'O1', 'M2', 'S2']
  const missing = required.filter((name) => constants.every((c) => c.name !== name))

  const K1 = amplitudeOf('K1')
  const O1 = amplitudeOf('O1')
  const M2 = amplitudeOf('M2')
  const S2 = amplitudeOf('S2')
  const denominator = M2 + S2
  const value = denominator === 0 ? Number.POSITIVE_INFINITY : (K1 + O1) / denominator

  return {
    value,
    ...classifyFormzahl(value),
    amplitudes: { K1, O1, M2, S2 },
    missing,
  }
}

/**
 * Published Formzahl values for Indonesian sites, for comparison on screen.
 * These are quoted from the literature and labelled as such — they are never
 * used as inputs to anything this project computes.
 */
export const PUBLISHED_INDONESIAN_FORMZAHL: ReadonlyArray<{
  readonly place: string
  readonly value: number | null
  readonly stated: string
  readonly citation: string
}> = [
  {
    place: 'Segara Anakan',
    value: 0.557,
    stated: 'campuran condong ke harian ganda',
    citation: 'Nilai terbit F = 0,557',
  },
  {
    place: 'Teluk Balikpapan',
    value: 0.37,
    stated: 'campuran condong ke harian ganda',
    citation: 'Nilai terbit F = 0,35–0,39',
  },
  {
    place: 'Teluk Banten',
    value: null,
    stated: 'campuran condong ke harian tunggal',
    citation: 'Klasifikasi terbit tanpa nilai F tunggal',
  },
  {
    place: 'Tanjung Priok',
    value: null,
    stated: 'harian tunggal',
    citation: 'Klasifikasi terbit tanpa nilai F tunggal',
  },
]
