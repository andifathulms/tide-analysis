/**
 * How nearly parallel two constituents are, in the record that was actually
 * fitted.
 *
 * The condition number says the solve was hard. The Rayleigh criterion says
 * which pairs are impossible. Between them sits the thing neither reports:
 * *how* hard, and *because of whom*. Both are statements about the same
 * geometry — a constituent occupies the two-dimensional subspace spanned by
 * its cosine and sine columns, and two constituents are hard to tell apart
 * exactly when their subspaces nearly coincide.
 *
 * The measure is the cosine of the smallest principal angle between those two
 * subspaces (Björck & Golub 1973, *Numerical methods for computing angles
 * between linear subspaces*): orthonormalise each subspace, take the largest
 * singular value of the cross product of the two bases. It is 0 when the two
 * are perfectly separable in this record and 1 when they are indistinguishable.
 *
 * Three properties make it the right number rather than a plausible one:
 *
 *   - It is computed from the design matrix that was solved, so it sees the
 *     record's real sample times. A record with gaps scores worse than a
 *     complete record of the same span, which is true and which the Rayleigh
 *     criterion — a function of span alone — cannot express.
 *   - On a complete uniform record it reduces to the Dirichlet kernel of the
 *     speed difference, which is the Rayleigh criterion in its continuous
 *     form. The threshold and the continuum are the same statement.
 *   - The mean level is a column of the design matrix like any other, so a
 *     constituent can be correlated with Z0 too, and that rung is reported
 *     rather than assumed away.
 *
 * Pure: typed arrays in, numbers out (invariant 1).
 */

import type { ConstituentName } from './constituents'
import type { DesignMatrix } from './design'

export interface CorrelationRung {
  readonly a: ConstituentName
  /** The partner, or null when the rung is the constituent against Z0. */
  readonly b: ConstituentName | null
  /** Cosine of the smallest principal angle, 0 (separable) to 1 (identical). */
  readonly correlation: number
}

export interface CorrelationReport {
  readonly names: readonly ConstituentName[]
  /** Every pair and every constituent-against-mean rung. */
  readonly rungs: readonly CorrelationRung[]
  /** Square lookup, `names` order, diagonal 1. */
  readonly matrix: readonly (readonly number[])[]
  /** The most nearly parallel pair, or null when fewer than two constituents. */
  readonly worst: CorrelationRung | null
}

/** Copy a set of design-matrix columns out as dense vectors. */
function columnsOf(design: DesignMatrix, indices: readonly number[]): Float64Array[] {
  return indices.map((column) => {
    const vector = new Float64Array(design.rows)
    for (let row = 0; row < design.rows; row += 1) {
      vector[row] = design.values[row * design.columns + column] as number
    }
    return vector
  })
}

function dot(a: Float64Array, b: Float64Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += (a[i] as number) * (b[i] as number)
  return sum
}

/**
 * Modified Gram-Schmidt. Modified rather than classical because the columns
 * being orthonormalised here are deliberately near-parallel — that is the
 * whole subject — and classical Gram-Schmidt loses orthogonality precisely
 * in that case.
 *
 * A column that collapses into the span of its predecessors is dropped; the
 * subspace is then genuinely lower-dimensional and the principal angle is
 * still well defined over what remains.
 */
function orthonormalise(vectors: readonly Float64Array[]): Float64Array[] {
  const basis: Float64Array[] = []
  for (const vector of vectors) {
    const working = Float64Array.from(vector)
    for (const q of basis) {
      const projection = dot(working, q)
      for (let i = 0; i < working.length; i += 1) {
        working[i] = (working[i] as number) - projection * (q[i] as number)
      }
    }
    const norm = Math.sqrt(dot(working, working))
    if (norm <= 1e-12) continue
    for (let i = 0; i < working.length; i += 1) working[i] = (working[i] as number) / norm
    basis.push(working)
  }
  return basis
}

/**
 * Largest singular value of Qaᵀ·Qb, for orthonormal bases of at most two
 * columns on the `a` side.
 *
 * With |A| ≤ 2 the Gram matrix M·Mᵀ is at most 2×2, so its larger eigenvalue
 * has a closed form and no iterative SVD is needed — which keeps the result
 * exactly reproducible rather than dependent on a convergence tolerance
 * (determinism is asserted on every fit).
 */
function largestSingularValue(a: readonly Float64Array[], b: readonly Float64Array[]): number {
  if (a.length === 0 || b.length === 0) return 0

  // M is |A| × |B|; G = M·Mᵀ is |A| × |A|.
  const m = a.map((qa) => b.map((qb) => dot(qa, qb)))

  if (m.length === 1) {
    const row = m[0] as number[]
    return Math.sqrt(row.reduce((sum, value) => sum + value * value, 0))
  }

  const row0 = m[0] as number[]
  const row1 = m[1] as number[]
  let g00 = 0
  let g01 = 0
  let g11 = 0
  for (let i = 0; i < row0.length; i += 1) {
    g00 += (row0[i] as number) * (row0[i] as number)
    g01 += (row0[i] as number) * (row1[i] as number)
    g11 += (row1[i] as number) * (row1[i] as number)
  }

  const trace = g00 + g11
  const discriminant = Math.sqrt(Math.max(0, (g00 - g11) * (g00 - g11) + 4 * g01 * g01))
  const largest = (trace + discriminant) / 2
  // Rounding can push a perfectly parallel pair a hair above 1; a correlation
  // greater than one is not a number anyone should have to explain.
  return Math.min(1, Math.sqrt(Math.max(0, largest)))
}

/**
 * Every pairwise correlation in a design matrix, plus each constituent
 * against the mean level.
 */
export function constituentCorrelations(design: DesignMatrix): CorrelationReport {
  const names = design.pairs.map((pair) => pair.name)

  const bases = design.pairs.map((pair) =>
    orthonormalise(columnsOf(design, [pair.cosColumn, pair.sinColumn])),
  )
  const levelBasis = orthonormalise(
    columnsOf(
      design,
      design.levels.map((level) => level.column),
    ),
  )

  const rungs: CorrelationRung[] = []
  const matrix: number[][] = names.map(() => names.map(() => 0))

  for (let i = 0; i < names.length; i += 1) {
    matrix[i]![i] = 1
    rungs.push({
      a: names[i] as ConstituentName,
      b: null,
      correlation: largestSingularValue(bases[i] as Float64Array[], levelBasis),
    })
  }

  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const correlation = largestSingularValue(
        bases[i] as Float64Array[],
        bases[j] as Float64Array[],
      )
      matrix[i]![j] = correlation
      matrix[j]![i] = correlation
      rungs.push({
        a: names[i] as ConstituentName,
        b: names[j] as ConstituentName,
        correlation,
      })
    }
  }

  const pairRungs = rungs.filter((rung) => rung.b !== null)
  // Ties broken by name so the reported worst pair is the same on every run.
  const worst =
    pairRungs.length === 0
      ? null
      : pairRungs.reduce((best, rung) =>
          rung.correlation > best.correlation ||
          (rung.correlation === best.correlation && `${rung.a}${rung.b}` < `${best.a}${best.b}`)
            ? rung
            : best,
        )

  return { names, rungs, matrix, worst }
}
