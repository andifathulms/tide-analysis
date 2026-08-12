import { describe, expect, it } from 'vitest'
import {
  CONSTITUENTS,
  constituentDoodsonNumber,
  constituentPeriodHours,
  constituentSpeed,
  type ConstituentName,
} from '@/lib/tide/constituents'

/**
 * Published constituent speeds, degrees per hour.
 * Schureman 1958, SP 98, table 2; reproduced in Pugh (1987) table 4:1 and in
 * the IHO tidal constituent list. These are the numbers our element rates must
 * reproduce — they are the check on the astronomy, not an input to it.
 */
const PUBLISHED_SPEED_DEG_PER_HOUR: Record<ConstituentName, number> = {
  Sa: 0.0410686,
  Ssa: 0.0821373,
  Mm: 0.5443747,
  Mf: 1.098033,
  Q1: 13.3986609,
  O1: 13.9430356,
  P1: 14.9589314,
  K1: 15.0410686,
  '2N2': 27.8953548,
  MU2: 27.9682084,
  N2: 28.4397295,
  NU2: 28.5125831,
  M2: 28.9841042,
  S2: 30.0,
  K2: 30.0821373,
  MN4: 57.4238337,
  M4: 57.9682084,
  MS4: 58.9841042,
  M6: 86.9523127,
}

describe('constituent speeds derived from the astronomical element rates', () => {
  for (const c of CONSTITUENTS) {
    it(`${c.name} matches the published speed`, () => {
      const published = PUBLISHED_SPEED_DEG_PER_HOUR[c.name]
      // 1e-6 °/h is 0.0088° of drift per year — far below anything a fit sees.
      expect(constituentSpeed(c.name)).toBeCloseTo(published, 6)
    })
  }

  it('S2 is exactly two cycles per mean solar day', () => {
    expect(constituentSpeed('S2')).toBeCloseTo(30, 9)
  })

  it('M2 has the 12.42-hour period the Moon gives it everywhere on Earth', () => {
    expect(constituentPeriodHours('M2')).toBeCloseTo(12.4206, 4)
  })

  it('shallow-water constituents are exact sums of their parents', () => {
    expect(constituentSpeed('M4')).toBeCloseTo(2 * constituentSpeed('M2'), 9)
    expect(constituentSpeed('M6')).toBeCloseTo(3 * constituentSpeed('M2'), 9)
    expect(constituentSpeed('MS4')).toBeCloseTo(
      constituentSpeed('M2') + constituentSpeed('S2'),
      9,
    )
    expect(constituentSpeed('MN4')).toBeCloseTo(
      constituentSpeed('M2') + constituentSpeed('N2'),
      9,
    )
  })

  it('every speed is distinct — no two constituents share a frequency', () => {
    const speeds = CONSTITUENTS.map((c) => constituentSpeed(c.name))
    expect(new Set(speeds.map((s) => s.toFixed(7))).size).toBe(speeds.length)
  })
})

describe('Doodson numbers in the classical printed form', () => {
  const published: Partial<Record<ConstituentName, string>> = {
    M2: '255.555',
    S2: '273.555',
    N2: '245.655',
    K2: '275.555',
    K1: '165.555',
    O1: '145.555',
    P1: '163.555',
    Q1: '135.655',
    M4: '455.555',
    Mf: '075.555',
    Mm: '065.455',
  }

  for (const [name, expected] of Object.entries(published)) {
    it(`${name} = ${expected}`, () => {
      expect(constituentDoodsonNumber(name as ConstituentName)).toBe(expected)
    })
  }
})
