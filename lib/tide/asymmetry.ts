/**
 * Tidal asymmetry: why the rise and the fall are not mirror images.
 *
 * In shallow water the tide stops being a simple sum of astronomical cosines.
 * Friction and the changing depth transfer energy into the harmonics of M2 —
 * M4 above all — and the M2/M4 pair is asymmetric by construction: adding a
 * wave of twice the frequency steepens one half of the cycle and flattens the
 * other. The result is a tide that floods faster than it ebbs, or the reverse.
 *
 * Two independent statements are produced here and they must agree:
 *
 *   1. The harmonic indicator, from the fitted constants alone: the amplitude
 *      ratio H(M4)/H(M2) for how much asymmetry there is, and the relative
 *      phase 2g(M2) − g(M4) for which way it runs. Friedrichs & Aubrey (1988).
 *
 *   2. The measured durations, from the predicted curve: the mean time from
 *      low water to high water against the mean time from high to low.
 *
 * The second is what a person standing on the shore would time with a watch.
 * The first is a claim about the M2/M4 pair alone, and on a semidiurnal coast
 * the two say the same thing — which is what pins the sign convention here,
 * rather than a remembered one.
 *
 * They part company where the tide is diurnal. At Jakarta's port the water
 * takes 12.2 hours to rise and 8.9 to fall, and almost none of that is shallow
 * water: it is K1 and O1, which set the shape of a diurnal day. Reporting one
 * number would force a choice between two true statements, so both are
 * reported — the shallow-water distortion measured on M2 and M4 alone, and the
 * durations of the tide as it actually runs.
 *
 * PRD §3 names Teluk Balikpapan for this, where the asymmetry is documented and
 * grows upstream. No open station covers Kalimantan, so the effect is reported
 * wherever the bundled records show it instead.
 */

import { normaliseDegrees } from '@/lib/astro/time'
import { findExtrema, type PredictableConstant } from './predict'

export type AsymmetryType =
  /** The flood is shorter and steeper: the water rises faster than it falls. */
  | 'pasang-lebih-cepat'
  /** The ebb is shorter and steeper: the water falls faster than it rises. */
  | 'surut-lebih-cepat'
  /** Neither, within the resolution of this record. */
  | 'hampir-simetris'

export interface AsymmetryResult {
  /** H(M4) / H(M2). Zero when there is no shallow-water distortion. */
  readonly amplitudeRatio: number
  /** 2g(M2) − g(M4), degrees in [0, 360). */
  readonly relativePhaseDeg: number
  readonly type: AsymmetryType
  readonly label: string
  readonly description: string
  /**
   * Durations of M2 and M4 alone — the shallow-water distortion isolated from
   * everything else. This is what the relative phase describes.
   */
  readonly shallowWater: Durations
  /**
   * Durations of the tide as it actually runs, all constituents included.
   * On a diurnal coast this is dominated by K1 and O1, not by shallow water.
   */
  readonly actual: Durations
  /** False when the diurnal constituents, not M4, set the rise and fall. */
  readonly directionsAgree: boolean
  /** g(M2) + g(S2) − g(MS4), the same statement for the spring-neap pair. */
  readonly msRelativePhaseDeg: number | null
  /** Whether the distortion is large enough to be worth reading. */
  readonly strength: 'kuat' | 'sedang' | 'lemah'
  /** True when M4 is too small for the direction to mean anything. */
  readonly belowNoise: boolean
}

/**
 * Below this the quarter-diurnal is a rounding error on the semidiurnal and
 * the direction it implies is noise. Above 0.05 the distortion is visible in
 * the curve itself.
 */
export const DETECTABLE_RATIO = 0.01
export const STRONG_RATIO = 0.05

export interface Durations {
  /** Mean low-to-high duration, hours. */
  readonly meanRiseHours: number
  /** Mean high-to-low duration, hours. */
  readonly meanFallHours: number
  /** Rise minus fall. Negative means the water rises faster than it falls. */
  readonly differenceHours: number
}

export interface AsymmetryInput {
  readonly constants: readonly PredictableConstant[]
  readonly meanLevelM: number
  /** Window to measure durations over. A month or more. */
  readonly startSec: number
  readonly endSec: number
}

/** Mean rise and fall durations, measured from the predicted curve. */
export function measureDurations(input: AsymmetryInput): Durations & { cycles: number } {
  const extrema = findExtrema({
    meanLevelM: input.meanLevelM,
    constants: input.constants,
    startSec: input.startSec,
    endSec: input.endSec,
    stepSec: 60,
  })

  const rises: number[] = []
  const falls: number[] = []
  for (let i = 1; i < extrema.length; i += 1) {
    const previous = extrema[i - 1]
    const current = extrema[i]
    if (previous === undefined || current === undefined) continue
    if (previous.kind === current.kind) continue
    const hours = (current.timeSec - previous.timeSec) / 3600
    if (previous.kind === 'surut') rises.push(hours)
    else falls.push(hours)
  }

  const mean = (values: readonly number[]): number =>
    values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length

  const meanRiseHours = mean(rises)
  const meanFallHours = mean(falls)
  return {
    meanRiseHours,
    meanFallHours,
    differenceHours: meanRiseHours - meanFallHours,
    cycles: Math.min(rises.length, falls.length),
  }
}

export function analyseAsymmetry(input: AsymmetryInput): AsymmetryResult | null {
  const amplitudeOf = (name: string): number =>
    input.constants.find((c) => c.name === name)?.amplitudeM ?? 0
  const phaseOf = (name: string): number | null =>
    input.constants.find((c) => c.name === name)?.phaseDeg ?? null

  const M2 = amplitudeOf('M2')
  const M4 = amplitudeOf('M4')
  const gM2 = phaseOf('M2')
  const gM4 = phaseOf('M4')
  // Without M2 there is nothing to be asymmetric about. Without M4 there is
  // no distortion, which is an answer — symmetric — rather than a refusal.
  if (M2 === 0 || gM2 === null) return null

  const amplitudeRatio = M4 / M2
  const relativePhaseDeg = gM4 === null ? 0 : normaliseDegrees(2 * gM2 - gM4)

  const gS2 = phaseOf('S2')
  const gMS4 = phaseOf('MS4')
  const msRelativePhaseDeg =
    gS2 === null || gMS4 === null ? null : normaliseDegrees(gM2 + gS2 - gMS4)

  // The shallow-water distortion on its own, and the tide as it actually runs.
  const shallowWater = measureDurations({
    ...input,
    constants: input.constants.filter((c) => c.name === 'M2' || c.name === 'M4'),
  })
  const actual = measureDurations(input)

  const belowNoise = amplitudeRatio < DETECTABLE_RATIO
  const strength =
    amplitudeRatio >= STRONG_RATIO ? 'kuat' : amplitudeRatio >= DETECTABLE_RATIO ? 'sedang' : 'lemah'

  // The direction comes from the relative phase; the durations confirm it.
  // Which half of the circle means which is fixed by simulation in the tests,
  // not by a remembered convention.
  let type: AsymmetryType
  if (belowNoise) {
    type = 'hampir-simetris'
  } else if (relativePhaseDeg > 0 && relativePhaseDeg < 180) {
    type = 'pasang-lebih-cepat'
  } else if (relativePhaseDeg > 180 && relativePhaseDeg < 360) {
    type = 'surut-lebih-cepat'
  } else {
    type = 'hampir-simetris'
  }

  const LABELS: Record<AsymmetryType, { label: string; description: string }> = {
    'pasang-lebih-cepat': {
      label: 'Pasang naik lebih cepat',
      description:
        'Air naik dalam waktu lebih singkat daripada turunnya. Arus pasang menjadi lebih kencang dan berumur pendek, arus surut lebih lemah dan panjang.',
    },
    'surut-lebih-cepat': {
      label: 'Surut lebih cepat',
      description:
        'Air turun dalam waktu lebih singkat daripada naiknya. Arus surut menjadi lebih kencang, seperti yang tercatat di banyak estuari.',
    },
    'hampir-simetris': {
      label: 'Hampir simetris',
      description:
        'Naik dan turun memakan waktu yang hampir sama. Perairan di sini terlalu dalam untuk menghasilkan distorsi perairan dangkal yang berarti.',
    },
  }

  return {
    amplitudeRatio,
    relativePhaseDeg,
    type,
    ...LABELS[type],
    shallowWater: {
      meanRiseHours: shallowWater.meanRiseHours,
      meanFallHours: shallowWater.meanFallHours,
      differenceHours: shallowWater.differenceHours,
    },
    actual: {
      meanRiseHours: actual.meanRiseHours,
      meanFallHours: actual.meanFallHours,
      differenceHours: actual.differenceHours,
    },
    directionsAgree:
      type === 'hampir-simetris' ||
      Math.sign(shallowWater.differenceHours) === Math.sign(actual.differenceHours),
    msRelativePhaseDeg,
    strength,
    belowNoise,
  }
}
