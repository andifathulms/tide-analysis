/**
 * Design matrix construction.
 *
 * The model is
 *
 *   η(t) = Z0 + Σ_k f_k · H_k · cos( V_k(t) + u_k − g_k )
 *
 * which is linear in the pair (a_k, b_k) = f_k H_k (cos g_k, sin g_k):
 *
 *   η(t) = Z0 + Σ_k [ a_k cos(V_k(t) + u_k) + b_k sin(V_k(t) + u_k) ]
 *
 * V_k(t) is the equilibrium argument, computed per sample from the astronomy —
 * not a fixed frequency times elapsed time. f and u are evaluated once at the
 * centre of the record, which is standard for records shorter than a year, and
 * are returned alongside so the UI can show them (invariant 4).
 */

import { astronomicalElements } from '@/lib/astro/elements'
import { equilibriumArgument } from '@/lib/astro/doodson'
import { nodalCorrection, type NodalCorrection } from '@/lib/astro/nodal'
import { DEG_TO_RAD } from '@/lib/astro/time'
import { constituent, constituentSpeed, type ConstituentName } from './constituents'

export interface DesignColumnPair {
  readonly name: ConstituentName
  /** Column index of the cosine term; the sine term is the next column. */
  readonly cosColumn: number
  readonly sinColumn: number
  readonly speedDegPerHour: number
  /** f and u at the centre of the record — reported, never hidden. */
  readonly nodal: NodalCorrection
}

export interface DesignMatrix {
  readonly rows: number
  readonly columns: number
  /** Row-major, rows × columns. Column 0 is the constant term Z0. */
  readonly values: Float64Array
  readonly pairs: readonly DesignColumnPair[]
  /** Time f and u were evaluated at, integer seconds UTC. */
  readonly nodalEpochSec: number
  /** N at that instant, degrees — the argument of every f and u series. */
  readonly nodeLongitudeDeg: number
}

export interface DesignOptions {
  readonly timesSec: Float64Array
  readonly constituents: readonly ConstituentName[]
  /** Instant f and u are evaluated at. Normally the centre of the record. */
  readonly nodalEpochSec: number
}

export function buildDesignMatrix(options: DesignOptions): DesignMatrix {
  const { timesSec, constituents, nodalEpochSec } = options
  if (constituents.length === 0) {
    throw new Error('A design matrix needs at least one constituent')
  }
  const seen = new Set(constituents)
  if (seen.size !== constituents.length) {
    throw new Error('Duplicate constituent in the requested set')
  }

  const rows = timesSec.length
  const columns = 1 + 2 * constituents.length
  const values = new Float64Array(rows * columns)

  const epochElements = astronomicalElements(nodalEpochSec)
  const pairs: DesignColumnPair[] = constituents.map((name, index) => ({
    name,
    cosColumn: 1 + 2 * index,
    sinColumn: 2 + 2 * index,
    speedDegPerHour: constituentSpeed(name),
    nodal: nodalCorrection(constituent(name).nodal, epochElements.N),
  }))

  for (let row = 0; row < rows; row += 1) {
    const base = row * columns
    values[base] = 1
    const elements = astronomicalElements(timesSec[row] as number)
    for (const pair of pairs) {
      const definition = constituent(pair.name)
      const V = equilibriumArgument(definition.coefficients, definition.offsetDeg, elements)
      const angle = (V + pair.nodal.uDeg) * DEG_TO_RAD
      values[base + pair.cosColumn] = Math.cos(angle)
      values[base + pair.sinColumn] = Math.sin(angle)
    }
  }

  return {
    rows,
    columns,
    values,
    pairs,
    nodalEpochSec,
    nodeLongitudeDeg: epochElements.N,
  }
}

/** Model heights for a coefficient vector — used by both fit and prediction. */
export function evaluateDesign(design: DesignMatrix, coefficients: Float64Array): Float64Array {
  const out = new Float64Array(design.rows)
  for (let row = 0; row < design.rows; row += 1) {
    const base = row * design.columns
    let sum = 0
    for (let col = 0; col < design.columns; col += 1) {
      sum += (design.values[base + col] as number) * (coefficients[col] as number)
    }
    out[row] = sum
  }
  return out
}
