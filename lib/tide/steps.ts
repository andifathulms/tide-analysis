/**
 * Datum steps: the moment a gauge's zero moves.
 *
 * A gauge gets reset, re-levelled or swapped, and every reading after that
 * instant is in a different datum from every reading before it. Nothing about
 * the record announces this. It is not a spike — the shift persists — so spike
 * rejection cannot see it, and it is not a gap. It simply makes the record
 * two records that happen to be stored in one array.
 *
 * Merging across one without acknowledgement is exactly what invariant 9
 * forbids, and the cost is not subtle: an unmodelled step is absorbed by the
 * residual, inflating it and biasing the long-period constituents.
 *
 * Detection compares the median of a whole day either side of each candidate
 * instant. A day of medians averages the tide away — M2, S2, K1 and O1 all
 * complete at least one cycle — so what remains is the level itself.
 *
 * What remains is not only the datum, though: it is also the weather. On the
 * bundled Indonesian records the daily level wanders by 0.04 to 0.07 m, and
 * over two hundred days it wanders by up to 0.3 m without anything having
 * happened to the gauge. That sets the sensitivity, and it is a floor no
 * threshold can argue with: steps of 0.5 m are found in every bundled record,
 * 0.3 m in most of them, and 0.2 m in none — a step that small is
 * indistinguishable from a storm. A step falling inside a gap cannot be seen
 * at all, which is correct: nothing was observed there.
 *
 * Nothing here alters an observation. A detected step is declared, and the fit
 * gives each segment its own mean level (see design.ts), which keeps the whole
 * record usable and puts the shift in the reported result where it can be read.
 */

/** A declared change in the gauge's zero. */
export interface DatumStep {
  /**
   * The instant the level changes: the first sample of the new segment.
   *
   * Localised to within about half the median window — half a day by default.
   * As the window slides across a step the measured shift plateaus rather than
   * peaking sharply, so the instant is approximate by construction. The
   * magnitude is not: it is the difference between two day-long medians.
   */
  readonly atSec: number
  /**
   * Estimated shift, metres. Positive means the level jumped up.
   *
   * Provisional, and good to roughly 20%: it comes from two medians either
   * side, with the record's own weather still in them. The authoritative
   * number is the difference between the fitted levels of the two segments,
   * which the solver estimates as a parameter and reports on the fit.
   */
  readonly shiftM: number
  /** How many robust deviations the shift stands out by. */
  readonly significance: number
}

export interface StepDetectionOptions {
  /** Samples either side to take the median of. One day by default. */
  readonly windowSamples?: number
  /** A shift smaller than this is not worth declaring, metres. */
  readonly minimumShiftM?: number
  /** How far above the record's own day-to-day variation a shift must stand. */
  readonly thresholdSigmas?: number
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number)
}

function robustScale(values: readonly number[]): number {
  if (values.length === 0) return 0
  const centre = median(values)
  return 1.4826 * median(values.map((v) => Math.abs(v - centre)))
}

/**
 * Find datum steps in a record.
 *
 * Only candidates whose neighbourhood is continuous are tested: across a gap
 * the level may legitimately differ, and calling that a step would be inventing
 * a fact about hours nobody observed.
 */
export function detectSteps(
  timesSec: ArrayLike<number>,
  heightsM: ArrayLike<number>,
  intervalSec: number,
  options: StepDetectionOptions = {},
): DatumStep[] {
  const windowSamples = options.windowSamples ?? Math.round(86400 / intervalSec)
  const minimumShiftM = options.minimumShiftM ?? 0.1
  const thresholdSigmas = options.thresholdSigmas ?? 6

  const n = heightsM.length
  if (n < windowSamples * 2 + 2) return []

  // Level differences across every candidate instant, and how much the record
  // moves from one day to the next when nothing has happened.
  const differences: Array<{ index: number; shift: number }> = []
  for (let i = windowSamples; i <= n - windowSamples; i += 1) {
    const before: number[] = []
    const after: number[] = []
    // The candidate instant itself must be continuous with the sample before
    // it. Without this a gap reads as a step: the two windows are each
    // internally continuous while straddling hours nobody observed.
    let continuous = (timesSec[i] as number) - (timesSec[i - 1] as number) === intervalSec
    if (!continuous) continue

    for (let k = 0; k < windowSamples; k += 1) {
      const beforeIndex = i - 1 - k
      const afterIndex = i + k
      const expectedBefore = (timesSec[i - 1] as number) - k * intervalSec
      const expectedAfter = (timesSec[i] as number) + k * intervalSec
      if (
        (timesSec[beforeIndex] as number) !== expectedBefore ||
        (timesSec[afterIndex] as number) !== expectedAfter
      ) {
        continuous = false
        break
      }
      before.push(heightsM[beforeIndex] as number)
      after.push(heightsM[afterIndex] as number)
    }
    if (!continuous) continue

    differences.push({ index: i, shift: median(after) - median(before) })
  }

  if (differences.length === 0) return []

  const scale = robustScale(differences.map((d) => d.shift))
  const threshold = Math.max(thresholdSigmas * scale, minimumShiftM)

  // A step shows up as a run of candidates as the window slides across it, and
  // that run has a shape: the measured shift ramps up while the two windows
  // still straddle the step, sits on a plateau at the true value while they do
  // not, then ramps down. Averaging the whole run mixes the plateau with the
  // ramps and halves the answer, so the plateau is isolated first — the
  // candidates within 15% of the largest shift — and the instant and size come
  // from its middle. The fit then refines the size as a fitted parameter.
  const steps: DatumStep[] = []
  let run: Array<{ index: number; shift: number }> = []

  const closeRun = (): void => {
    if (run.length === 0) return
    const peak = Math.max(...run.map((candidate) => Math.abs(candidate.shift)))
    const plateau = run.filter((candidate) => Math.abs(candidate.shift) >= 0.85 * peak)
    const middle = plateau[Math.floor(plateau.length / 2)] as { index: number; shift: number }
    const shiftM = median(plateau.map((candidate) => candidate.shift))
    steps.push({
      atSec: timesSec[middle.index] as number,
      shiftM,
      significance: scale === 0 ? Number.POSITIVE_INFINITY : Math.abs(shiftM) / scale,
    })
    run = []
  }

  for (const candidate of differences) {
    if (Math.abs(candidate.shift) > threshold) {
      const previous = run[run.length - 1]
      if (previous !== undefined && candidate.index - previous.index > 1) closeRun()
      run.push(candidate)
    } else {
      closeRun()
    }
  }
  closeRun()

  return steps
}

/** Segment boundaries implied by a set of steps, as sample indices. */
export function segmentsFor(
  timesSec: ArrayLike<number>,
  steps: readonly DatumStep[],
): Array<{ startIndex: number; endIndex: number }> {
  if (steps.length === 0) return [{ startIndex: 0, endIndex: timesSec.length - 1 }]

  const boundaries = steps
    .map((step) => {
      for (let i = 0; i < timesSec.length; i += 1) {
        if ((timesSec[i] as number) >= step.atSec) return i
      }
      return timesSec.length
    })
    .filter((index) => index > 0 && index < timesSec.length)
    .sort((a, b) => a - b)

  const segments: Array<{ startIndex: number; endIndex: number }> = []
  let start = 0
  for (const boundary of boundaries) {
    segments.push({ startIndex: start, endIndex: boundary - 1 })
    start = boundary
  }
  segments.push({ startIndex: start, endIndex: timesSec.length - 1 })
  return segments
}
