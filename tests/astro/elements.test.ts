import { describe, expect, it } from 'vitest'
import { astronomicalElements, ELEMENT_RATES } from '@/lib/astro/elements'
import { equilibriumArgument, speedDegPerHour } from '@/lib/astro/doodson'
import { signedDegrees } from '@/lib/astro/time'
import { constituent, CONSTITUENTS } from '@/lib/tide/constituents'

/** Date is allowed in tests; it is forbidden inside lib/astro and lib/tide. */
function utc(iso: string): number {
  return Math.round(Date.parse(iso) / 1000)
}

const HOURS_PER_DAY = 24

describe('element rates reproduce the published mean periods', () => {
  const daysFor = (degPerHour: number): number => 360 / Math.abs(degPerHour) / HOURS_PER_DAY
  const r = ELEMENT_RATES

  it('tropical month — 27.321582 days', () => {
    expect(daysFor(r.sDegPerHour)).toBeCloseTo(27.321582, 5)
  })

  it('tropical year — 365.242190 days', () => {
    expect(daysFor(r.hDegPerHour)).toBeCloseTo(365.24219, 3)
  })

  it('synodic month — 29.530589 days', () => {
    expect(daysFor(r.sDegPerHour - r.hDegPerHour)).toBeCloseTo(29.530589, 5)
  })

  it('anomalistic month — 27.554550 days', () => {
    expect(daysFor(r.sDegPerHour - r.pDegPerHour)).toBeCloseTo(27.55455, 5)
  })

  it('draconic month — 27.212221 days', () => {
    expect(daysFor(r.sDegPerHour - r.NDegPerHour)).toBeCloseTo(27.212221, 5)
  })

  it('nodal cycle — 6798.38 days, the 18.61 years that make f and u necessary', () => {
    expect(daysFor(r.NDegPerHour)).toBeCloseTo(6798.38, 1)
    expect(daysFor(r.NDegPerHour) / 365.2422).toBeCloseTo(18.613, 2)
  })

  it('lunar perigee revolves in 8.847 years', () => {
    expect(daysFor(r.pDegPerHour) / 365.2422).toBeCloseTo(8.847, 2)
  })

  it('the node regresses — N decreases with time', () => {
    expect(r.NDegPerHour).toBeLessThan(0)
  })
})

describe('elements at published astronomical events', () => {
  // Mean elongation s − h is zero at new moon. Mean differs from true by the
  // lunar equation of centre and evection, up to about 8°.
  const newMoons = ['2024-01-11T11:57:00Z', '2024-06-06T12:38:00Z', '2025-03-29T10:58:00Z']

  for (const iso of newMoons) {
    it(`mean elongation is near zero at the new moon of ${iso.slice(0, 10)}`, () => {
      const e = astronomicalElements(utc(iso))
      expect(Math.abs(signedDegrees(e.s - e.h))).toBeLessThan(12)
    })
  }

  it('mean elongation is near 180° at the full moon of 2024-01-25', () => {
    const e = astronomicalElements(utc('2024-01-25T17:54:00Z'))
    expect(Math.abs(signedDegrees(e.s - e.h - 180))).toBeLessThan(12)
  })

  it("the Sun's mean anomaly is near zero at perihelion, 2024-01-03", () => {
    const e = astronomicalElements(utc('2024-01-03T00:39:00Z'))
    expect(Math.abs(signedDegrees(e.h - e.p1))).toBeLessThan(4)
  })

  it("the Sun's mean anomaly is near 180° at aphelion, 2024-07-05", () => {
    const e = astronomicalElements(utc('2024-07-05T05:06:00Z'))
    expect(Math.abs(signedDegrees(e.h - e.p1 - 180))).toBeLessThan(4)
  })

  it("the Moon's mean anomaly averages zero over a year of perigee passages", () => {
    // True perigee runs up to ~25° of mean anomaly ahead of or behind the mean,
    // driven by evection, so a single passage says little. Over a full year of
    // passages the excursion cancels — which is what the mean element must do.
    const perigees2024 = [
      '2024-01-13T10:35:00Z',
      '2024-02-10T18:52:00Z',
      '2024-03-10T07:04:00Z',
      '2024-04-07T17:51:00Z',
      '2024-05-05T22:04:00Z',
      '2024-06-02T07:16:00Z',
      '2024-07-24T05:42:00Z',
      '2024-08-21T05:02:00Z',
      '2024-09-18T13:23:00Z',
      '2024-10-17T00:39:00Z',
      '2024-11-14T11:14:00Z',
      '2024-12-12T13:19:00Z',
    ]
    const deviations = perigees2024.map((iso) => {
      const e = astronomicalElements(utc(iso))
      return signedDegrees(e.s - e.p)
    })
    const mean = deviations.reduce((a, b) => a + b, 0) / deviations.length
    expect(Math.abs(mean)).toBeLessThan(5)
    expect(Math.max(...deviations.map(Math.abs))).toBeLessThan(30)
  })

  it('the Sun advances 360° in a tropical year', () => {
    const t0 = utc('2020-01-01T00:00:00Z')
    const t1 = t0 + Math.round(365.24219 * 86400)
    const before = astronomicalElements(t0)
    const after = astronomicalElements(t1)
    expect(Math.abs(signedDegrees(after.h - before.h))).toBeLessThan(0.01)
  })
})

describe('equilibrium arguments advance at the constituent speed', () => {
  const t0 = utc('2026-01-01T00:00:00Z')

  for (const c of CONSTITUENTS) {
    it(`${c.name}`, () => {
      const hours = 137
      const before = equilibriumArgument(c.coefficients, c.offsetDeg, astronomicalElements(t0))
      const after = equilibriumArgument(
        c.coefficients,
        c.offsetDeg,
        astronomicalElements(t0 + hours * 3600),
      )
      const advanced = signedDegrees(after - before)
      const expected = signedDegrees(speedDegPerHour(c.coefficients) * hours)
      expect(Math.abs(signedDegrees(advanced - expected))).toBeLessThan(1e-3)
    })
  }

  it('M2 returns to the same argument after one M2 period', () => {
    const m2 = constituent('M2')
    const periodSec = (360 / speedDegPerHour(m2.coefficients)) * 3600
    const a = equilibriumArgument(m2.coefficients, m2.offsetDeg, astronomicalElements(t0))
    const b = equilibriumArgument(
      m2.coefficients,
      m2.offsetDeg,
      astronomicalElements(t0 + Math.round(periodSec)),
    )
    expect(Math.abs(signedDegrees(b - a))).toBeLessThan(0.01)
  })
})
