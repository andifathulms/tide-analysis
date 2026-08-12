/**
 * The Rayleigh criterion, and the refusal it produces.
 *
 * Two constituents can only be separated by a record long enough for them to
 * drift a full cycle apart:
 *
 *   T_required = 360° / |σ_i − σ_j|
 *
 * K1 and P1 differ by 0.0821 °/h and so need 4383 hours — half a year. Asking
 * fifteen days to separate them is not a hard problem, it is an impossible
 * one, and the honest answer is a refusal that names the pair and the record
 * length required (invariant 6). A constituent must also be separable from the
 * mean level, which needs one full period of the constituent itself.
 */

import { constituentSpeed, type ConstituentName } from './constituents'

export interface ResolutionConflict {
  readonly a: ConstituentName
  readonly b: ConstituentName
  readonly separationDegPerHour: number
  readonly requiredHours: number
  readonly requiredDays: number
  readonly availableHours: number
  /** How much longer the record needs to be, in days. */
  readonly shortfallDays: number
}

export type ConstituentResolution =
  | { readonly type: 'resolved'; readonly name: ConstituentName }
  | {
      readonly type: 'unresolved'
      readonly name: ConstituentName
      /** Every constituent it cannot be separated from, worst first. */
      readonly conflictsWith: readonly ResolutionConflict[]
    }

export type ResolutionAssessment =
  | {
      readonly type: 'resolvable'
      readonly constituents: readonly ConstituentName[]
      readonly availableHours: number
      /** The tightest pair that still resolves — how close to the edge it is. */
      readonly tightestPair: ResolutionConflict | null
    }
  | {
      readonly type: 'refusal'
      readonly reason: 'rayleigh'
      readonly conflicts: readonly ResolutionConflict[]
      readonly statuses: readonly ConstituentResolution[]
      readonly availableHours: number
      /** Record length that would resolve the whole requested set, days. */
      readonly requiredDays: number
    }

const HOURS_PER_DAY = 24

/** Hours of record needed to separate two constituents. */
export function requiredHoursFor(a: ConstituentName, b: ConstituentName): number {
  const separation = Math.abs(constituentSpeed(a) - constituentSpeed(b))
  if (separation === 0) return Number.POSITIVE_INFINITY
  return 360 / separation
}

/** Hours needed to separate a constituent from the mean level Z0. */
export function requiredHoursAgainstMean(name: ConstituentName): number {
  return 360 / Math.abs(constituentSpeed(name))
}

function conflict(
  a: ConstituentName,
  b: ConstituentName,
  availableHours: number,
): ResolutionConflict {
  const separationDegPerHour = Math.abs(constituentSpeed(a) - constituentSpeed(b))
  const requiredHours = requiredHoursFor(a, b)
  return {
    a,
    b,
    separationDegPerHour,
    requiredHours,
    requiredDays: requiredHours / HOURS_PER_DAY,
    availableHours,
    shortfallDays: Math.max(0, (requiredHours - availableHours) / HOURS_PER_DAY),
  }
}

/**
 * Assess a requested set against a record length. Returns a refusal — not a
 * fit with a warning attached — when any pair is inseparable.
 */
export function assessResolution(
  constituents: readonly ConstituentName[],
  availableHours: number,
): ResolutionAssessment {
  const conflicts: ResolutionConflict[] = []

  for (const name of constituents) {
    // Against the mean: Z0 is a column of the design matrix like any other.
    const required = requiredHoursAgainstMean(name)
    if (required > availableHours) {
      conflicts.push({
        a: name,
        b: name,
        separationDegPerHour: Math.abs(constituentSpeed(name)),
        requiredHours: required,
        requiredDays: required / HOURS_PER_DAY,
        availableHours,
        shortfallDays: (required - availableHours) / HOURS_PER_DAY,
      })
    }
  }

  for (let i = 0; i < constituents.length; i += 1) {
    for (let j = i + 1; j < constituents.length; j += 1) {
      const a = constituents[i] as ConstituentName
      const b = constituents[j] as ConstituentName
      if (requiredHoursFor(a, b) > availableHours) {
        conflicts.push(conflict(a, b, availableHours))
      }
    }
  }

  if (conflicts.length === 0) {
    let tightestPair: ResolutionConflict | null = null
    for (let i = 0; i < constituents.length; i += 1) {
      for (let j = i + 1; j < constituents.length; j += 1) {
        const candidate = conflict(
          constituents[i] as ConstituentName,
          constituents[j] as ConstituentName,
          availableHours,
        )
        if (tightestPair === null || candidate.requiredHours > tightestPair.requiredHours) {
          tightestPair = candidate
        }
      }
    }
    return { type: 'resolvable', constituents, availableHours, tightestPair }
  }

  const sorted = [...conflicts].sort((x, y) => y.requiredHours - x.requiredHours)
  const statuses: ConstituentResolution[] = constituents.map((name) => {
    const involved = sorted.filter((c) => c.a === name || c.b === name)
    if (involved.length === 0) return { type: 'resolved', name }
    return { type: 'unresolved', name, conflictsWith: involved }
  })

  return {
    type: 'refusal',
    reason: 'rayleigh',
    conflicts: sorted,
    statuses,
    availableHours,
    requiredDays: (sorted[0] as ResolutionConflict).requiredHours / HOURS_PER_DAY,
  }
}

/**
 * The largest subset of `candidates` a record of this length can support,
 * taking candidates in the order given — so the caller states its priorities
 * rather than the algorithm inventing them. Used by the Rayleigh slider to
 * grey out what has stopped being separable.
 */
export function resolvableSubset(
  candidates: readonly ConstituentName[],
  availableHours: number,
): {
  readonly kept: ConstituentName[]
  readonly dropped: Extract<ConstituentResolution, { type: 'unresolved' }>[]
} {
  const kept: ConstituentName[] = []
  const dropped: Extract<ConstituentResolution, { type: 'unresolved' }>[] = []

  for (const name of candidates) {
    const conflictsWith: ResolutionConflict[] = []
    if (requiredHoursAgainstMean(name) > availableHours) {
      const required = requiredHoursAgainstMean(name)
      conflictsWith.push({
        a: name,
        b: name,
        separationDegPerHour: Math.abs(constituentSpeed(name)),
        requiredHours: required,
        requiredDays: required / HOURS_PER_DAY,
        availableHours,
        shortfallDays: (required - availableHours) / HOURS_PER_DAY,
      })
    }
    for (const other of kept) {
      if (requiredHoursFor(name, other) > availableHours) {
        conflictsWith.push(conflict(name, other, availableHours))
      }
    }
    if (conflictsWith.length === 0) {
      kept.push(name)
    } else {
      dropped.push({ type: 'unresolved', name, conflictsWith })
    }
  }

  return { kept, dropped }
}

/** One line of Indonesian explaining why a pair cannot be separated. */
export function describeConflict(c: ResolutionConflict): string {
  if (c.a === c.b) {
    return `${c.a} tidak dapat dipisahkan dari muka air rata-rata: perlu rekaman ${c.requiredDays.toFixed(1)} hari, tersedia ${(c.availableHours / HOURS_PER_DAY).toFixed(1)} hari.`
  }
  return `${c.a} dan ${c.b} berbeda hanya ${c.separationDegPerHour.toFixed(4)}°/jam: perlu rekaman ${c.requiredDays.toFixed(1)} hari untuk memisahkannya, tersedia ${(c.availableHours / HOURS_PER_DAY).toFixed(1)} hari.`
}
