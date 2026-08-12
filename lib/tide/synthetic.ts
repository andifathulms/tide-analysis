/**
 * Synthetic records: the backbone of the test suite.
 *
 * Generate a record from constants you chose, add noise you chose, then fit
 * it — you control the answer, so correctness is provable rather than
 * plausible. Deterministic throughout: the noise comes from a seeded
 * generator, so a failing case is reproducible from its seed alone.
 */

import { predictHeights, timeGrid, type PredictableConstant } from './predict'
import type { TideRecord } from './record'

/** mulberry32 — small, fast, deterministic, adequate for test noise. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller, drawing from a seeded uniform generator. */
export function gaussianNoise(random: () => number): () => number {
  let spare: number | null = null
  return () => {
    if (spare !== null) {
      const value = spare
      spare = null
      return value
    }
    const u = Math.max(random(), Number.MIN_VALUE)
    const v = random()
    const magnitude = Math.sqrt(-2 * Math.log(u))
    spare = magnitude * Math.sin(2 * Math.PI * v)
    return magnitude * Math.cos(2 * Math.PI * v)
  }
}

export interface SyntheticOptions {
  readonly startSec: number
  readonly lengthDays: number
  readonly intervalSec?: number
  readonly meanLevelM?: number
  readonly constants: readonly PredictableConstant[]
  /** Standard deviation of the white noise added, metres. */
  readonly noiseSigmaM?: number
  readonly seed?: number
  readonly stationId?: string
  /**
   * Hold f and u at this instant, matching what a fit over the same window
   * assumes. Set it to isolate the solver; leave it out to include the nodal
   * drift a real record carries.
   */
  readonly nodalEpochSec?: number
}

/**
 * A record whose true constants are known. Its datum is explicit and its
 * source is 'synthetic' — it is never presented as an observation.
 */
export function syntheticRecord(options: SyntheticOptions): TideRecord {
  const intervalSec = options.intervalSec ?? 3600
  const meanLevelM = options.meanLevelM ?? 0
  const noiseSigmaM = options.noiseSigmaM ?? 0
  const seed = options.seed ?? 1

  const endSec = options.startSec + Math.round(options.lengthDays * 86400)
  const timesSec = timeGrid(options.startSec, endSec, intervalSec)
  const heightsM = predictHeights({
    meanLevelM,
    constants: options.constants,
    timesSec,
    nodalEpochSec: options.nodalEpochSec,
  })

  if (noiseSigmaM > 0) {
    const normal = gaussianNoise(seededRandom(seed))
    for (let i = 0; i < heightsM.length; i += 1) {
      heightsM[i] = (heightsM[i] as number) + noiseSigmaM * normal()
    }
  }

  return {
    stationId: options.stationId ?? 'synthetic-ground-truth',
    stationName: 'Rekaman sintetik',
    source: 'synthetic',
    licence: 'CC0-1.0',
    attribution: 'Dibangkitkan dari konstanta yang diketahui untuk pengujian',
    latitude: 0,
    longitude: 0,
    datum: {
      code: 'synthetic-zero',
      label: 'Nol sintetik',
      note: 'Bukan datum sebenarnya — rekaman ini dibangkitkan, bukan diamati.',
    },
    intervalSec,
    units: 'm',
    gaps: [],
    processing: `Dibangkitkan dari ${options.constants.length} komponen, derau σ = ${noiseSigmaM} m, seed ${seed}`,
    timesSec,
    heightsM,
  }
}
