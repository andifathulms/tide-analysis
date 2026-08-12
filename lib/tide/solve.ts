/**
 * Least squares, with the conditioning reported.
 *
 * No linear algebra library: the solver is part of the project. The normal
 * matrix AᵀA is diagonalised by cyclic Jacobi rotations, which gives the
 * solution and the singular values of A in one pass. The condition number
 * κ(A) = σ_max / σ_min is part of the result type and the caller cannot
 * discard it (invariant 5) — a solver that returns numbers without saying
 * whether they mean anything is the failure this project exists to expose.
 *
 * Cyclic Jacobi with a fixed sweep order is deterministic: the same record,
 * window and constituent set produce byte-identical coefficients.
 */

import type { DesignMatrix } from './design'
import { evaluateDesign } from './design'

export interface SolveResult {
  /** [Z0, a_1, b_1, a_2, b_2, …] in the design matrix's column order. */
  readonly coefficients: Float64Array
  /** κ(A) = σ_max / σ_min. Infinity if the normal matrix is singular. */
  readonly conditionNumber: number
  /** Singular values of A, descending. */
  readonly singularValues: readonly number[]
  /** RMS of observation minus model, metres. */
  readonly residualRmsM: number
  /** Standard error of each coefficient, metres. */
  readonly standardErrors: Float64Array
  readonly degreesOfFreedom: number
}

/** AᵀA, symmetric, columns × columns, row-major. */
function normalMatrix(design: DesignMatrix): Float64Array {
  const { rows, columns, values } = design
  const out = new Float64Array(columns * columns)
  for (let row = 0; row < rows; row += 1) {
    const base = row * columns
    for (let i = 0; i < columns; i += 1) {
      const vi = values[base + i] as number
      if (vi === 0) continue
      for (let j = i; j < columns; j += 1) {
        out[i * columns + j] = (out[i * columns + j] as number) + vi * (values[base + j] as number)
      }
    }
  }
  for (let i = 0; i < columns; i += 1) {
    for (let j = 0; j < i; j += 1) {
      out[i * columns + j] = out[j * columns + i] as number
    }
  }
  return out
}

/** Aᵀy. */
function projectObservations(design: DesignMatrix, observations: Float64Array): Float64Array {
  const { rows, columns, values } = design
  const out = new Float64Array(columns)
  for (let row = 0; row < rows; row += 1) {
    const base = row * columns
    const y = observations[row] as number
    for (let col = 0; col < columns; col += 1) {
      out[col] = (out[col] as number) + (values[base + col] as number) * y
    }
  }
  return out
}

interface Eigensystem {
  /** Eigenvalues, same order as the columns of `vectors`. */
  readonly eigenvalues: Float64Array
  /** Eigenvectors as columns, n × n row-major. */
  readonly vectors: Float64Array
}

/**
 * Cyclic Jacobi eigenvalue decomposition of a symmetric matrix.
 * Golub & Van Loan, *Matrix Computations*, algorithm 8.4.3.
 */
function jacobiEigen(matrix: Float64Array, n: number, maxSweeps = 100): Eigensystem {
  const a = Float64Array.from(matrix)
  const v = new Float64Array(n * n)
  for (let i = 0; i < n; i += 1) v[i * n + i] = 1

  const offDiagonalNorm = (): number => {
    let sum = 0
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const x = a[i * n + j] as number
        sum += x * x
      }
    }
    return Math.sqrt(2 * sum)
  }

  let frobenius = 0
  for (let i = 0; i < n * n; i += 1) {
    const x = a[i] as number
    frobenius += x * x
  }
  frobenius = Math.sqrt(frobenius)
  const tolerance = 1e-14 * (frobenius === 0 ? 1 : frobenius)

  for (let sweep = 0; sweep < maxSweeps && offDiagonalNorm() > tolerance; sweep += 1) {
    for (let p = 0; p < n - 1; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = a[p * n + q] as number
        if (Math.abs(apq) < 1e-300) continue
        const app = a[p * n + p] as number
        const aqq = a[q * n + q] as number
        const theta = (aqq - app) / (2 * apq)
        const t =
          Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c

        for (let k = 0; k < n; k += 1) {
          const akp = a[k * n + p] as number
          const akq = a[k * n + q] as number
          a[k * n + p] = c * akp - s * akq
          a[k * n + q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p * n + k] as number
          const aqk = a[q * n + k] as number
          a[p * n + k] = c * apk - s * aqk
          a[q * n + k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = v[k * n + p] as number
          const vkq = v[k * n + q] as number
          v[k * n + p] = c * vkp - s * vkq
          v[k * n + q] = s * vkp + c * vkq
        }
      }
    }
  }

  const eigenvalues = new Float64Array(n)
  for (let i = 0; i < n; i += 1) eigenvalues[i] = a[i * n + i] as number
  return { eigenvalues, vectors: v }
}

/**
 * Solve A x ≈ y in the least-squares sense and report the conditioning.
 * Rayleigh is checked before this is ever called (invariant 6) — but a fit
 * that survives Rayleigh can still be poorly conditioned, and κ says so.
 */
export function solveLeastSquares(
  design: DesignMatrix,
  observations: Float64Array,
): SolveResult {
  if (observations.length !== design.rows) {
    throw new Error('Observation count does not match the design matrix')
  }
  const n = design.columns
  const ata = normalMatrix(design)
  const aty = projectObservations(design, observations)
  const { eigenvalues, vectors } = jacobiEigen(ata, n)

  // Singular values of A are the square roots of the eigenvalues of AᵀA.
  const sorted = Array.from(eigenvalues).sort((x, y) => y - x)
  const largest = sorted[0] as number
  const smallest = sorted[sorted.length - 1] as number
  const singularValues = sorted.map((lambda) => Math.sqrt(Math.max(lambda, 0)))
  const conditionNumber =
    smallest <= 0 || largest <= 0 ? Number.POSITIVE_INFINITY : Math.sqrt(largest / smallest)

  // x = Σ_i (v_iᵀ Aᵀy / λ_i) v_i, skipping directions the data cannot support.
  const cutoff = largest * 1e-15
  const coefficients = new Float64Array(n)
  const varianceScale = new Float64Array(n)
  for (let i = 0; i < n; i += 1) {
    const lambda = eigenvalues[i] as number
    if (lambda <= cutoff) continue
    let projection = 0
    for (let k = 0; k < n; k += 1) projection += (vectors[k * n + i] as number) * (aty[k] as number)
    const scale = projection / lambda
    for (let k = 0; k < n; k += 1) {
      const vk = vectors[k * n + i] as number
      coefficients[k] = (coefficients[k] as number) + scale * vk
      // diagonal of (AᵀA)⁻¹, accumulated in the eigenbasis
      varianceScale[k] = (varianceScale[k] as number) + (vk * vk) / lambda
    }
  }

  const model = evaluateDesign(design, coefficients)
  let sumSquares = 0
  for (let row = 0; row < design.rows; row += 1) {
    const r = (observations[row] as number) - (model[row] as number)
    sumSquares += r * r
  }
  const residualRmsM = Math.sqrt(sumSquares / design.rows)
  const degreesOfFreedom = Math.max(design.rows - n, 1)
  const residualVariance = sumSquares / degreesOfFreedom
  const standardErrors = new Float64Array(n)
  for (let i = 0; i < n; i += 1) {
    standardErrors[i] = Math.sqrt(residualVariance * (varianceScale[i] as number))
  }

  return {
    coefficients,
    conditionNumber,
    singularValues,
    residualRmsM,
    standardErrors,
    degreesOfFreedom,
  }
}
