/**
 * The fitted constituents as a line spectrum: one bar per constituent at its
 * frequency, height its amplitude H, grouped by species. Computed here so the
 * component only draws (invariant 16).
 *
 * A constituent the record cannot resolve gets a mark at its frequency and no
 * height — its status and the length it needs, never a number (invariant 7).
 * Panels share one amplitude scale, so a diurnal bar and a semidiurnal bar
 * can be compared by eye.
 */

import { speedDegPerHour } from '@/lib/astro/doodson'
import { CONSTITUENTS, type Species } from '@/lib/tide/constituents'
import type { ConstituentConstant } from '@/lib/tide/fit'
import type { ConstituentName } from '@/lib/tide/constituents'
import type { ConstituentResolution } from '@/lib/tide/rayleigh'

export const SPECTRUM_PANEL = { width: 300, height: 170, top: 18, base: 128 } as const

const SPECIES_ORDER: readonly Species[] = ['long-period', 'diurnal', 'semidiurnal', 'shallow-water']

export type SpectrumBar =
  | {
      readonly type: 'resolved'
      readonly name: ConstituentName
      readonly x: number
      readonly cyclesPerDay: number
      readonly amplitudeM: number
      readonly height: number
    }
  | {
      readonly type: 'unresolved'
      readonly name: ConstituentName
      readonly x: number
      readonly cyclesPerDay: number
      readonly conflictsWith: ConstituentName
      readonly requiredDays: number
    }

export interface SpectrumPanel {
  readonly species: Species
  readonly bars: readonly SpectrumBar[]
}

export interface SpectrumModel {
  readonly panels: readonly SpectrumPanel[]
  /** Amplitude at the top gridline, metres, and the gridlines below it. */
  readonly scaleTopM: number
  readonly gridlines: ReadonlyArray<{ readonly y: number; readonly label: string }>
}

/** Degrees per hour → cycles per day, the unit a reader can picture. */
export function cyclesPerDay(speedDegPerHourValue: number): number {
  return (speedDegPerHourValue * 24) / 360
}

/**
 * Gridlines at a round step — 0.2, 0.4, 0.6 m rather than quarters of the
 * maximum — with at most four of them.
 */
function niceStep(maxM: number): number {
  const steps = [0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5]
  return steps.find((step) => step * 4 >= maxM) ?? Math.ceil(maxM / 4)
}

/**
 * Closest two bar centres may sit, in panel units. K1 and P1 differ by
 * 0.0055 cycles per day — a few units on a linear axis — and drawn there
 * they print over each other as "PK1". Bars keep their frequency order and
 * neighbours are pushed apart to this distance — wide enough for a 0.000
 * frequency figure in the chart label face; the exact frequency is
 * printed under every bar, so nothing is lost but the strict linearity.
 */
const MIN_SEPARATION = 40

function dodge(xs: readonly number[], lo: number, hi: number): number[] {
  const out = [...xs]
  for (let i = 1; i < out.length; i += 1) {
    const previous = out[i - 1] as number
    if ((out[i] as number) - previous < MIN_SEPARATION) out[i] = previous + MIN_SEPARATION
  }
  const first = out[0]
  const last = out[out.length - 1]
  if (first === undefined || last === undefined || last <= hi) return out
  // Overflowed the panel: refit the whole row into it, order preserved.
  const left = Math.min(first, lo)
  return out.map((x) => lo + ((x - left) / (last - left)) * (hi - lo))
}

export function buildSpectrumModel(
  constants: readonly ConstituentConstant[],
  unresolved: readonly ConstituentResolution[] = [],
): SpectrumModel {
  const { width, top, base } = SPECTRUM_PANEL
  const maxM = Math.max(0.01, ...constants.map((c) => c.amplitudeM))
  const step = niceStep(maxM)
  const scaleTopM = Math.ceil(maxM / step - 1e-9) * step
  const heightOf = (m: number) => Math.max(2, (m / scaleTopM) * (base - top))

  /** x is placed once the panel's frequency range is known. */
  type Entry = { name: ConstituentName; species: Species; cpd: number; bar: SpectrumBar }
  const entries: Entry[] = []

  for (const c of constants) {
    const cpd = cyclesPerDay(c.speedDegPerHour)
    entries.push({
      name: c.name,
      species: c.species as Species,
      cpd,
      bar: {
        type: 'resolved',
        name: c.name,
        x: 0,
        cyclesPerDay: cpd,
        amplitudeM: c.amplitudeM,
        height: heightOf(c.amplitudeM),
      },
    })
  }
  for (const r of unresolved) {
    if (r.type !== 'unresolved') continue
    const definition = CONSTITUENTS.find((c) => c.name === r.name)
    const worst = r.conflictsWith[0]
    if (definition === undefined || worst === undefined) continue
    const cpd = cyclesPerDay(speedDegPerHour(definition.coefficients))
    entries.push({
      name: r.name,
      species: definition.species,
      cpd,
      bar: {
        type: 'unresolved',
        name: r.name,
        x: 0,
        cyclesPerDay: cpd,
        conflictsWith: worst.a === r.name ? worst.b : worst.a,
        requiredDays: worst.requiredDays,
      },
    })
  }

  const panels: SpectrumPanel[] = []
  for (const species of SPECIES_ORDER) {
    const group = entries.filter((e) => e.species === species).sort((a, b) => a.cpd - b.cpd)
    if (group.length === 0) continue
    const lo = group[0]?.cpd ?? 0
    const hi = group[group.length - 1]?.cpd ?? lo
    const pad = Math.max((hi - lo) * 0.12, 0.02)
    const x = (cpd: number) => 22 + ((cpd - (lo - pad)) / (hi - lo + 2 * pad)) * (width - 44)
    const xs = dodge(
      group.map((e) => x(e.cpd)),
      22,
      width - 22,
    )
    panels.push({
      species,
      bars: group.map((e, i): SpectrumBar => ({ ...e.bar, x: xs[i] ?? 0 })),
    })
  }

  const gridlines: Array<{ y: number; label: string }> = []
  const decimals = step < 0.1 ? 3 : step < 1 ? 1 : 0
  for (let value = step; value <= scaleTopM + 1e-9; value += step) {
    gridlines.push({
      y: base - (value / scaleTopM) * (base - top),
      label: value.toFixed(step % 0.1 > 1e-9 && step < 1 ? 2 : decimals),
    })
  }

  return { panels, scaleTopM, gridlines }
}
