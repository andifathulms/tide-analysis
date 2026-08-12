/**
 * Nodal corrections f and u.
 *
 * The lunar node regresses once in 18.61 years, modulating the amplitude (f)
 * and phase (u) of every lunar constituent. Invariant 4: these are applied
 * explicitly, cited, and surfaced — never folded silently into a reported
 * constant.
 *
 * Series in N (longitude of the ascending node) from Schureman 1958,
 * Special Publication 98, tables 2 and 14, in the compact form given by
 * Pugh, *Tides, Surges and Mean Sea Level* (1987), table 4:2. Accurate to
 * about 1e-3 in f and 0.1° in u across the whole cycle, which is well inside
 * the uncertainty of a fit from a few months of coastal record.
 */

import { DEG_TO_RAD, normaliseDegrees } from './time'

/**
 * Which nodal series a constituent follows. Constituents in the same species
 * with the same lunar dependence share one — N2 and 2N2 follow M2 exactly.
 */
export type NodalScheme =
  | 'none' // solar constituents: f = 1, u = 0 for all time
  | 'Mm'
  | 'Mf'
  | 'O1'
  | 'K1'
  | 'M2'
  | 'K2'
  | 'M2^2' // quarter-diurnal from M2 alone: f², 2u
  | 'M2^3' // sixth-diurnal: f³, 3u
  | 'MS4' // M2 × S2: f(M2), u(M2)

export interface NodalCorrection {
  /** f — amplitude factor, dimensionless, ~1. */
  readonly f: number
  /** u — phase correction, degrees. */
  readonly uDeg: number
}

export const NO_NODAL_CORRECTION: NodalCorrection = { f: 1, uDeg: 0 }

/** cosine series in N: c0 + c1 cos N + c2 cos 2N + c3 cos 3N */
type Series = readonly [number, number, number, number]

const F_SERIES: Record<'Mm' | 'Mf' | 'O1' | 'K1' | 'M2' | 'K2', Series> = {
  Mm: [1.0, -0.13, 0.0013, 0],
  Mf: [1.0429, 0.4135, -0.004, 0],
  O1: [1.0089, 0.1871, -0.0147, 0.0014],
  K1: [1.006, 0.115, -0.0088, 0.0006],
  M2: [1.0004, -0.0373, 0.0002, 0],
  K2: [1.0241, 0.2863, 0.0083, -0.0015],
}

/** sine series in N: c1 sin N + c2 sin 2N + c3 sin 3N, degrees */
type USeries = readonly [number, number, number]

const U_SERIES: Record<'Mm' | 'Mf' | 'O1' | 'K1' | 'M2' | 'K2', USeries> = {
  Mm: [0, 0, 0],
  Mf: [-23.74, 2.68, -0.38],
  O1: [10.8, -1.34, 0.19],
  K1: [-8.86, 0.68, -0.07],
  M2: [-2.14, 0, 0],
  K2: [-17.74, 0.68, -0.04],
}

function evaluate(scheme: keyof typeof F_SERIES, NDeg: number): NodalCorrection {
  const n = NDeg * DEG_TO_RAD
  const fs = F_SERIES[scheme]
  const us = U_SERIES[scheme]
  const f = fs[0] + fs[1] * Math.cos(n) + fs[2] * Math.cos(2 * n) + fs[3] * Math.cos(3 * n)
  const uDeg = us[0] * Math.sin(n) + us[1] * Math.sin(2 * n) + us[2] * Math.sin(3 * n)
  return { f, uDeg }
}

/**
 * f and u for a scheme at a given node longitude N (degrees).
 * Compound constituents take the product of their parents, as Schureman §77.
 */
export function nodalCorrection(scheme: NodalScheme, NDeg: number): NodalCorrection {
  switch (scheme) {
    case 'none':
      return NO_NODAL_CORRECTION
    case 'Mm':
    case 'Mf':
    case 'O1':
    case 'K1':
    case 'M2':
    case 'K2':
      return evaluate(scheme, NDeg)
    case 'M2^2': {
      const m2 = evaluate('M2', NDeg)
      return { f: m2.f * m2.f, uDeg: 2 * m2.uDeg }
    }
    case 'M2^3': {
      const m2 = evaluate('M2', NDeg)
      return { f: m2.f * m2.f * m2.f, uDeg: 3 * m2.uDeg }
    }
    case 'MS4': {
      // S2 carries f = 1, u = 0, so the product is M2's alone.
      return evaluate('M2', NDeg)
    }
    default: {
      const exhaustive: never = scheme
      return exhaustive
    }
  }
}

/** The node's longitude reduced to [0, 360) — the argument every series takes. */
export function nodeLongitude(NDeg: number): number {
  return normaliseDegrees(NDeg)
}
