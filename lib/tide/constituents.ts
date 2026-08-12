/**
 * Constituent definitions.
 *
 * Each entry carries only its Doodson coefficients, its Schureman phase
 * offset, and which nodal series it follows. Speeds are derived from the
 * astronomical element rates at read time — no frequency is written down
 * here as a literal (invariant 3), so a wrong element rate shows up as a
 * wrong speed in `pnpm test:astro` rather than as a plausible wrong tide.
 *
 * Arguments in terms of Schureman's solar-time T are rewritten over mean
 * lunar time τ = T + h − s. Schureman 1958, SP 98, table 2.
 */

import { DoodsonCoefficients, speedDegPerHour, doodsonNumber } from '@/lib/astro/doodson'
import type { NodalScheme } from '@/lib/astro/nodal'

export type ConstituentName =
  | 'Sa'
  | 'Ssa'
  | 'Mm'
  | 'Mf'
  | 'Q1'
  | 'O1'
  | 'P1'
  | 'K1'
  | '2N2'
  | 'MU2'
  | 'N2'
  | 'NU2'
  | 'M2'
  | 'S2'
  | 'K2'
  | 'MN4'
  | 'M4'
  | 'MS4'
  | 'M6'

export type Species = 'long-period' | 'diurnal' | 'semidiurnal' | 'shallow-water'

export interface Constituent {
  readonly name: ConstituentName
  readonly coefficients: DoodsonCoefficients
  /** Schureman's constant phase offset, degrees. Part of the definition. */
  readonly offsetDeg: number
  readonly nodal: NodalScheme
  readonly species: Species
  /** What the constituent physically is, in Indonesian. */
  readonly description: string
}

function coefficients(
  tau: number,
  s: number,
  h: number,
  p: number,
  N: number,
  p1: number,
): DoodsonCoefficients {
  return { tau, s, h, p, N, p1 }
}

export const CONSTITUENTS: readonly Constituent[] = Object.freeze([
  {
    name: 'Sa',
    coefficients: coefficients(0, 0, 1, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'none',
    species: 'long-period',
    description: 'Tahunan matahari — musiman, sebagian besar bukan gravitasi',
  },
  {
    name: 'Ssa',
    coefficients: coefficients(0, 0, 2, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'none',
    species: 'long-period',
    description: 'Setengah tahunan matahari',
  },
  {
    name: 'Mm',
    coefficients: coefficients(0, 1, 0, -1, 0, 0),
    offsetDeg: 0,
    nodal: 'Mm',
    species: 'long-period',
    description: 'Bulanan bulan — siklus perigee',
  },
  {
    name: 'Mf',
    coefficients: coefficients(0, 2, 0, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'Mf',
    species: 'long-period',
    description: 'Dwimingguan bulan — deklinasi',
  },
  {
    name: 'Q1',
    coefficients: coefficients(1, -2, 0, 1, 0, 0),
    offsetDeg: 90,
    nodal: 'O1',
    species: 'diurnal',
    description: 'Eliptik besar diurnal bulan',
  },
  {
    name: 'O1',
    coefficients: coefficients(1, -1, 0, 0, 0, 0),
    offsetDeg: 90,
    nodal: 'O1',
    species: 'diurnal',
    description: 'Diurnal utama bulan',
  },
  {
    name: 'P1',
    coefficients: coefficients(1, 1, -2, 0, 0, 0),
    offsetDeg: 90,
    nodal: 'none',
    species: 'diurnal',
    description: 'Diurnal utama matahari',
  },
  {
    name: 'K1',
    coefficients: coefficients(1, 1, 0, 0, 0, 0),
    offsetDeg: -90,
    nodal: 'K1',
    species: 'diurnal',
    description: 'Diurnal deklinasi bulan-matahari',
  },
  {
    name: '2N2',
    coefficients: coefficients(2, -2, 0, 2, 0, 0),
    offsetDeg: 0,
    nodal: 'M2',
    species: 'semidiurnal',
    description: 'Eliptik orde kedua bulan',
  },
  {
    name: 'MU2',
    coefficients: coefficients(2, -2, 2, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'M2',
    species: 'semidiurnal',
    description: 'Variasional bulan',
  },
  {
    name: 'N2',
    coefficients: coefficients(2, -1, 0, 1, 0, 0),
    offsetDeg: 0,
    nodal: 'M2',
    species: 'semidiurnal',
    description: 'Eliptik besar semidiurnal bulan',
  },
  {
    name: 'NU2',
    coefficients: coefficients(2, -1, 2, -1, 0, 0),
    offsetDeg: 0,
    nodal: 'M2',
    species: 'semidiurnal',
    description: 'Evektional besar bulan',
  },
  {
    name: 'M2',
    coefficients: coefficients(2, 0, 0, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'M2',
    species: 'semidiurnal',
    description: 'Semidiurnal utama bulan — biasanya yang terbesar',
  },
  {
    name: 'S2',
    coefficients: coefficients(2, 2, -2, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'none',
    species: 'semidiurnal',
    description: 'Semidiurnal utama matahari — pasangan purnama-perbani M2',
  },
  {
    name: 'K2',
    coefficients: coefficients(2, 2, 0, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'K2',
    species: 'semidiurnal',
    description: 'Deklinasi semidiurnal bulan-matahari',
  },
  {
    name: 'MN4',
    coefficients: coefficients(4, -1, 0, 1, 0, 0),
    offsetDeg: 0,
    nodal: 'M2^2',
    species: 'shallow-water',
    description: 'Perairan dangkal, interaksi M2 dengan N2',
  },
  {
    name: 'M4',
    coefficients: coefficients(4, 0, 0, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'M2^2',
    species: 'shallow-water',
    description: 'Harmonik keempat M2 — asimetri pasang surut',
  },
  {
    name: 'MS4',
    coefficients: coefficients(4, 2, -2, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'MS4',
    species: 'shallow-water',
    description: 'Perairan dangkal, interaksi M2 dengan S2',
  },
  {
    name: 'M6',
    coefficients: coefficients(6, 0, 0, 0, 0, 0),
    offsetDeg: 0,
    nodal: 'M2^3',
    species: 'shallow-water',
    description: 'Harmonik keenam M2',
  },
] satisfies readonly Constituent[])

const BY_NAME = new Map<ConstituentName, Constituent>(CONSTITUENTS.map((c) => [c.name, c]))

export function constituent(name: ConstituentName): Constituent {
  const found = BY_NAME.get(name)
  if (found === undefined) throw new Error(`Unknown constituent: ${name}`)
  return found
}

export function isConstituentName(value: string): value is ConstituentName {
  return BY_NAME.has(value as ConstituentName)
}

/** Speed in degrees per hour, derived from the astronomical element rates. */
export function constituentSpeed(name: ConstituentName): number {
  return speedDegPerHour(constituent(name).coefficients)
}

/** Period in hours. */
export function constituentPeriodHours(name: ConstituentName): number {
  return 360 / constituentSpeed(name)
}

/** Classical printed Doodson number, e.g. M2 = 255.555. */
export function constituentDoodsonNumber(name: ConstituentName): string {
  return doodsonNumber(constituent(name).coefficients)
}

/** The set an Indonesian coastal record of a month or more usually supports. */
export const STANDARD_SET: readonly ConstituentName[] = Object.freeze([
  'M2',
  'S2',
  'N2',
  'K2',
  'K1',
  'O1',
  'P1',
  'Q1',
  'M4',
  'MS4',
])

/** The nine constituents the Admiralty method works with, plus its inferences. */
export const ADMIRALTY_SET: readonly ConstituentName[] = Object.freeze([
  'M2',
  'S2',
  'N2',
  'K2',
  'K1',
  'O1',
  'P1',
  'M4',
  'MS4',
])
