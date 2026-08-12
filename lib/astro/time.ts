/**
 * Time base for the numerical core.
 *
 * Invariant 8: integer seconds UTC everywhere below the UI. No Date objects,
 * no timezone handling. Everything here is arithmetic on a seconds count.
 */

/** Julian Date of the Unix epoch, 1970-01-01T00:00:00Z. */
export const JD_UNIX_EPOCH = 2440587.5

/** Julian Date of the standard epoch J2000.0, 2000-01-01T12:00:00 TT. */
export const JD_J2000 = 2451545.0

/** Days in a Julian century. */
export const DAYS_PER_JULIAN_CENTURY = 36525

export const SECONDS_PER_HOUR = 3600
export const SECONDS_PER_DAY = 86400

/** Julian Date for a UTC instant given as integer seconds since the Unix epoch. */
export function julianDate(tSec: number): number {
  return JD_UNIX_EPOCH + tSec / SECONDS_PER_DAY
}

/**
 * Julian centuries from J2000.0. UT1−UTC is under a second and ΔT is ignored:
 * both are far below the accuracy of the harmonic model itself.
 */
export function julianCenturies(tSec: number): number {
  return (julianDate(tSec) - JD_J2000) / DAYS_PER_JULIAN_CENTURY
}

/** Hours elapsed in the UTC day containing tSec. Handles negative times. */
export function hoursIntoUtcDay(tSec: number): number {
  const secondsIntoDay = ((tSec % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY
  return secondsIntoDay / SECONDS_PER_HOUR
}

/** Reduce an angle in degrees to [0, 360). */
export function normaliseDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Reduce an angle in degrees to (−180, 180] — for signed differences. */
export function signedDegrees(deg: number): number {
  const d = normaliseDegrees(deg)
  return d > 180 ? d - 360 : d
}

export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI
