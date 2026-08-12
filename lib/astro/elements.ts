/**
 * The five astronomical elements the tide is built from, plus mean lunar time.
 *
 * Constituent frequencies are not tabulated anywhere in this project
 * (invariant 3). They fall out of the time derivatives of these polynomials,
 * which is why an error here is invisible in the output and fatal to it.
 *
 * Polynomials: Meeus, *Astronomical Algorithms*, 2nd ed., ch. 22 (precession
 * of the equinoxes), ch. 25 (solar elements) and ch. 47 (lunar elements),
 * with T in Julian centuries from J2000.0. The tidal literature (Doodson 1921;
 * Schureman 1958, Special Publication 98) writes the same elements as
 * s, h, p, N, p′ referred to 1900 Jan 0.5; the polynomials below are the
 * modern determination of the same quantities.
 */

import { DAYS_PER_JULIAN_CENTURY, julianCenturies, hoursIntoUtcDay, normaliseDegrees } from './time'

export interface AstronomicalElements {
  /** s — mean longitude of the Moon, degrees. */
  readonly s: number
  /** h — mean longitude of the Sun, degrees. */
  readonly h: number
  /** p — mean longitude of the lunar perigee, degrees. */
  readonly p: number
  /** N — mean longitude of the Moon's ascending node, degrees. Decreases. */
  readonly N: number
  /** p′ — mean longitude of the solar perigee (perihelion), degrees. */
  readonly p1: number
  /** τ — mean lunar time, degrees. τ = 15°·t_UT + h − s. */
  readonly tau: number
}

/**
 * Polynomial coefficients in degrees, degrees/century, … from J2000.0.
 * Meeus ch. 47.1 (L′, M′ → p = L′ − M′), ch. 47.7 (Ω), ch. 25.2 (L0),
 * ch. 25 (solar perigee, = L0 − M).
 */
const MOON_MEAN_LONGITUDE = [218.3164477, 481267.88123421, -0.0015786, 1 / 538841, -1 / 65194000]
const SUN_MEAN_LONGITUDE = [280.46646, 36000.76983, 0.0003032]
const LUNAR_PERIGEE = [83.3532465, 4069.0137287, -0.01032, -1 / 80053, 1 / 18999000]
const ASCENDING_NODE = [125.0445479, -1934.1362891, 0.0020754, 1 / 467441, -1 / 60616000]
const SOLAR_PERIGEE = [282.93735, 1.71946, 0.00046]

function polynomial(coefficients: readonly number[], T: number): number {
  let value = 0
  for (let i = coefficients.length - 1; i >= 0; i -= 1) {
    value = value * T + (coefficients[i] as number)
  }
  return value
}

/** Elements at an instant given as integer seconds UTC since the Unix epoch. */
export function astronomicalElements(tSec: number): AstronomicalElements {
  const T = julianCenturies(tSec)

  const s = normaliseDegrees(polynomial(MOON_MEAN_LONGITUDE, T))
  const h = normaliseDegrees(polynomial(SUN_MEAN_LONGITUDE, T))
  const p = normaliseDegrees(polynomial(LUNAR_PERIGEE, T))
  const N = normaliseDegrees(polynomial(ASCENDING_NODE, T))
  const p1 = normaliseDegrees(polynomial(SOLAR_PERIGEE, T))

  // Mean lunar time: the Sun's hour angle plus the Sun's longitude gives the
  // Greenwich hour angle of the mean equinox; subtracting s gives the Moon's.
  const tau = normaliseDegrees(15 * hoursIntoUtcDay(tSec) + h - s)

  return { s, h, p, N, p1, tau }
}

/**
 * Rates of change in degrees per hour, evaluated at J2000.0 (the quadratic
 * terms move these by ~1e-9 °/h per century — far below the tolerance any
 * fit resolves). These are the numbers every constituent speed is built from.
 */
const HOURS_PER_CENTURY = DAYS_PER_JULIAN_CENTURY * 24

export interface ElementRates {
  readonly sDegPerHour: number
  readonly hDegPerHour: number
  readonly pDegPerHour: number
  readonly NDegPerHour: number
  readonly p1DegPerHour: number
  readonly tauDegPerHour: number
}

const sDegPerHour = (MOON_MEAN_LONGITUDE[1] as number) / HOURS_PER_CENTURY
const hDegPerHour = (SUN_MEAN_LONGITUDE[1] as number) / HOURS_PER_CENTURY
const pDegPerHour = (LUNAR_PERIGEE[1] as number) / HOURS_PER_CENTURY
const NDegPerHour = (ASCENDING_NODE[1] as number) / HOURS_PER_CENTURY
const p1DegPerHour = (SOLAR_PERIGEE[1] as number) / HOURS_PER_CENTURY

export const ELEMENT_RATES: ElementRates = {
  sDegPerHour,
  hDegPerHour,
  pDegPerHour,
  NDegPerHour,
  p1DegPerHour,
  // dτ/dt = 15°/h (mean solar) + dh/dt − ds/dt = 14.4920521 °/h.
  tauDegPerHour: 15 + hDegPerHour - sDegPerHour,
}
