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
 *
 * Z0 is one column when the record has one datum. Where a gauge's zero moved
 * mid-record, each segment gets its own level column instead: the tide either
 * side of a datum step is the same tide, but the zero it is measured from is
 * not, and pretending otherwise is what invariant 9 forbids. The shifts come
 * back as fitted parameters rather than being absorbed by the residual.
 */

import { astronomicalElements } from '@/lib/astro/elements'
import { equilibriumArgument } from '@/lib/astro/doodson'
import { nodalCorrection, type NodalCorrection } from '@/lib/astro/nodal'
import { DEG_TO_RAD } from '@/lib/astro/time'
import { constituent, constituentSpeed, type ConstituentName } from './constituents'
import type { DatumStep } from './steps'

export interface DesignColumnPair {
  readonly name: ConstituentName
  /** Column index of the cosine term; the sine term is the next column. */
  readonly cosColumn: number
  readonly sinColumn: number
  readonly speedDegPerHour: number
  /** f and u at the centre of the record — reported, never hidden. */
  readonly nodal: NodalCorrection
}

export interface LevelColumn {
  readonly column: number
  /** First instant this level applies to, integer seconds UTC. */
  readonly fromSec: number
  readonly toSec: number
}

export interface DesignMatrix {
  readonly rows: number
  readonly columns: number
  /**
   * Row-major, rows × columns. Column 0 is the mean level of the first
   * segment; one further level column follows per declared datum step.
   */
  readonly values: Float64Array
  readonly pairs: readonly DesignColumnPair[]
  /** One per datum segment. Always at least one. */
  readonly levels: readonly LevelColumn[]
  readonly steps: readonly DatumStep[]
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
  /** Declared datum steps. Each one adds a level column. */
  readonly steps?: readonly DatumStep[]
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
  const steps = (options.steps ?? [])
    .filter((step) => step.atSec > (timesSec[0] ?? 0) && step.atSec <= (timesSec[rows - 1] ?? 0))
    .sort((a, b) => a.atSec - b.atSec)

  const levelCount = steps.length + 1
  const columns = levelCount + 2 * constituents.length
  const values = new Float64Array(rows * columns)

  const levels: LevelColumn[] = []
  for (let i = 0; i < levelCount; i += 1) {
    levels.push({
      column: i,
      fromSec: i === 0 ? (timesSec[0] ?? 0) : (steps[i - 1] as DatumStep).atSec,
      toSec:
        i === levelCount - 1
          ? (timesSec[rows - 1] ?? 0)
          : (steps[i] as DatumStep).atSec - 1,
    })
  }

  /** Which level column a given instant belongs to. */
  const levelIndexAt = (timeSec: number): number => {
    let index = 0
    for (let i = 0; i < steps.length; i += 1) {
      if (timeSec >= (steps[i] as DatumStep).atSec) index = i + 1
    }
    return index
  }

  const epochElements = astronomicalElements(nodalEpochSec)
  const pairs: DesignColumnPair[] = constituents.map((name, index) => ({
    name,
    cosColumn: levelCount + 2 * index,
    sinColumn: levelCount + 2 * index + 1,
    speedDegPerHour: constituentSpeed(name),
    nodal: nodalCorrection(constituent(name).nodal, epochElements.N),
  }))

  for (let row = 0; row < rows; row += 1) {
    const base = row * columns
    const timeSec = timesSec[row] as number
    values[base + levelIndexAt(timeSec)] = 1
    const elements = astronomicalElements(timeSec)
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
    levels,
    steps,
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
