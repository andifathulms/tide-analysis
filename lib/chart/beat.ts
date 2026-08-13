/**
 * The two waves the Rayleigh criterion is about, drawn.
 *
 * The ladder gives T = 360° / |σᵢ − σⱼ| and glosses it as needing the pair to
 * drift one full cycle apart. A reader who does not already know the result
 * cannot see why a *full* cycle rather than half of one, because the two waves
 * are never shown — the slider reports verdicts, not the thing being
 * separated. PRD §2 calls this the single best thing in the app.
 *
 * So: the same pair sampled at three points across one full T. At the start
 * they rise and fall together and no record could tell them apart. A quarter
 * of the way along they have pulled apart. Halfway they are in antiphase —
 * one at high water while the other is at low — and that is the moment a
 * record can distinguish them, because the two now do visibly different things
 * to the water. Carry on to T and they have come back into step, which is why
 * the criterion is a full cycle and not half: at T/2 the pair is separable,
 * but a record ending anywhere before T leaves a window in which they were
 * never far enough apart for the whole span.
 *
 * Pure geometry: speeds in, path strings out. No record involved — this figure
 * is as true at Sabang as at Bristol (PRD §1).
 */

import { constituentSpeed, type ConstituentName } from '@/lib/tide/constituents'
import { DEG_TO_RAD } from '@/lib/astro/time'

export interface BeatPanel {
  /** Days from the start of the record this window opens at. */
  readonly atDays: number
  /** How far the two have drifted apart by then, degrees, 0 to 360. */
  readonly phaseDifferenceDeg: number
  readonly pathA: string
  readonly pathB: string
}

export interface BeatFigure {
  readonly a: ConstituentName
  readonly b: ConstituentName
  readonly separationDegPerHour: number
  readonly requiredDays: number
  /** Days each panel spans — a couple of cycles, so the shapes are legible. */
  readonly spanDays: number
  readonly panels: readonly BeatPanel[]
  readonly width: number
  readonly height: number
}

const SAMPLES = 160

/** Four snapshots across one full drift cycle: in step, apart, opposed, back. */
const FRACTIONS = [0, 0.25, 0.5, 1] as const

export function beatFigure(
  a: ConstituentName,
  b: ConstituentName,
  options: { readonly width?: number; readonly height?: number; readonly spanDays?: number } = {},
): BeatFigure {
  const width = options.width ?? 260
  const height = options.height ?? 64
  const spanDays = options.spanDays ?? 2

  const speedA = constituentSpeed(a)
  const speedB = constituentSpeed(b)
  const separationDegPerHour = Math.abs(speedA - speedB)
  const requiredDays = separationDegPerHour === 0 ? Infinity : 360 / separationDegPerHour / 24

  const pad = 2
  const mid = height / 2
  const amplitude = mid - pad

  const trace = (speed: number, fromHours: number): string => {
    let path = ''
    for (let i = 0; i <= SAMPLES; i += 1) {
      const hours = fromHours + (i / SAMPLES) * spanDays * 24
      const x = (i / SAMPLES) * width
      const y = mid - amplitude * Math.cos(speed * hours * DEG_TO_RAD)
      path += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    }
    return path
  }

  const panels: BeatPanel[] = FRACTIONS.map((fraction) => {
    const atDays = requiredDays * fraction
    const fromHours = atDays * 24
    return {
      atDays,
      // Modulo 360 so the last panel reads 0 again: back in step, which is the
      // point of showing it.
      phaseDifferenceDeg: (separationDegPerHour * fromHours) % 360,
      pathA: trace(speedA, fromHours),
      pathB: trace(speedB, fromHours),
    }
  })

  return { a, b, separationDegPerHour, requiredDays, spanDays, panels, width, height }
}
