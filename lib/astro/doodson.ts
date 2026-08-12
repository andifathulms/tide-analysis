/**
 * Doodson's formulation: every tidal constituent is an integer combination of
 * the six astronomical arguments.
 *
 *   V = n1·τ + n2·s + n3·h + n4·p + n5·N + n6·p′ + offset
 *
 * with τ mean lunar time, s the Moon's mean longitude, h the Sun's, p the
 * lunar perigee, N the ascending node and p′ the solar perigee.
 * Doodson, *The Harmonic Development of the Tide-Generating Potential* (1921);
 * Schureman 1958 §§ 71–79.
 *
 * The speed of a constituent is the same combination of the element rates —
 * which is why no frequency in this project is ever typed in as a literal
 * (invariant 3).
 */

import { AstronomicalElements, ELEMENT_RATES } from './elements'
import { normaliseDegrees } from './time'

/** Integer coefficients over (τ, s, h, p, N, p′). */
export interface DoodsonCoefficients {
  readonly tau: number
  readonly s: number
  readonly h: number
  readonly p: number
  readonly N: number
  readonly p1: number
}

/** Speed in degrees per hour, from the element rates alone. */
export function speedDegPerHour(n: DoodsonCoefficients): number {
  const r = ELEMENT_RATES
  return (
    n.tau * r.tauDegPerHour +
    n.s * r.sDegPerHour +
    n.h * r.hDegPerHour +
    n.p * r.pDegPerHour +
    n.N * r.NDegPerHour +
    n.p1 * r.p1DegPerHour
  )
}

/**
 * Equilibrium argument V at an instant, degrees in [0, 360).
 * `offsetDeg` is the constant phase Schureman attaches to some constituents
 * (K1 carries −90°, O1 and P1 +90°, L2 180°); it is part of the definition,
 * not a correction.
 */
export function equilibriumArgument(
  n: DoodsonCoefficients,
  offsetDeg: number,
  e: AstronomicalElements,
): number {
  return normaliseDegrees(
    n.tau * e.tau + n.s * e.s + n.h * e.h + n.p * e.p + n.N * e.N + n.p1 * e.p1 + offsetDeg,
  )
}

/** Doodson number in the classical printed form, e.g. M2 = 255.555. */
export function doodsonNumber(n: DoodsonCoefficients): string {
  const digit = (v: number): string => {
    const shifted = v + 5
    if (shifted < 0 || shifted > 9) return `(${v})`
    return String(shifted)
  }
  return `${n.tau}${digit(n.s)}${digit(n.h)}.${digit(n.p)}${digit(n.N)}${digit(n.p1)}`
}
