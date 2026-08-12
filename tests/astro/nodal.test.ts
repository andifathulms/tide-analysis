import { describe, expect, it } from 'vitest'
import { nodalCorrection, type NodalScheme } from '@/lib/astro/nodal'

/**
 * Published extremes of f over the 18.61-year node cycle.
 * Schureman 1958, SP 98, table 14; Pugh (1987) table 4:2.
 * f is largest for the lunar declinational constituents at N = 0° and
 * smallest at N = 180° — except M2 and Mm, whose series has the opposite sign.
 */
const PUBLISHED_F_EXTREMES: ReadonlyArray<{
  scheme: NodalScheme
  atNodeZero: number
  atNodeOneEighty: number
}> = [
  { scheme: 'M2', atNodeZero: 0.963, atNodeOneEighty: 1.038 },
  { scheme: 'O1', atNodeZero: 1.183, atNodeOneEighty: 0.806 },
  { scheme: 'K1', atNodeZero: 1.113, atNodeOneEighty: 0.882 },
  { scheme: 'K2', atNodeZero: 1.317, atNodeOneEighty: 0.748 },
  { scheme: 'Mf', atNodeZero: 1.452, atNodeOneEighty: 0.629 },
  { scheme: 'Mm', atNodeZero: 0.871, atNodeOneEighty: 1.131 },
]

describe('nodal amplitude factors against published extremes', () => {
  for (const { scheme, atNodeZero, atNodeOneEighty } of PUBLISHED_F_EXTREMES) {
    it(`${scheme} at N = 0° and N = 180°`, () => {
      expect(nodalCorrection(scheme, 0).f).toBeCloseTo(atNodeZero, 2)
      expect(nodalCorrection(scheme, 180).f).toBeCloseTo(atNodeOneEighty, 2)
    })
  }

  it('K2 is the most strongly modulated of the major constituents', () => {
    const spread = (scheme: NodalScheme): number =>
      Math.abs(nodalCorrection(scheme, 0).f - nodalCorrection(scheme, 180).f)
    expect(spread('K2')).toBeGreaterThan(spread('K1'))
    expect(spread('K1')).toBeGreaterThan(spread('M2'))
  })
})

describe('nodal phase corrections', () => {
  it('u vanishes when the node is at 0° or 180°', () => {
    for (const scheme of ['M2', 'O1', 'K1', 'K2', 'Mf'] as const) {
      expect(nodalCorrection(scheme, 0).uDeg).toBeCloseTo(0, 6)
      expect(nodalCorrection(scheme, 180).uDeg).toBeCloseTo(0, 6)
    }
  })

  it('u reaches its published extreme over the cycle', () => {
    // Schureman table 14 gives the extremes of u, not their location: the
    // higher harmonics of the series move the peak a few degrees off N = 90°.
    const peak = (scheme: NodalScheme): number => {
      let max = 0
      for (let N = 0; N < 360; N += 0.1) {
        max = Math.max(max, Math.abs(nodalCorrection(scheme, N).uDeg))
      }
      return max
    }
    // Published extremes of u, with the 0.3° accuracy the compact series
    // carries against Schureman's exact I, ν, ξ formulation.
    const published: ReadonlyArray<[NodalScheme, number]> = [
      ['M2', 2.1],
      ['K1', 8.9],
      ['O1', 10.8],
      ['K2', 17.7],
    ]
    for (const [scheme, expected] of published) {
      expect(Math.abs(peak(scheme) - expected)).toBeLessThan(0.3)
    }
  })

  it('K1 and O1 shift in opposite directions', () => {
    expect(Math.sign(nodalCorrection('K1', 90).uDeg)).toBe(
      -Math.sign(nodalCorrection('O1', 90).uDeg),
    )
  })
})

describe('solar and compound constituents', () => {
  it('solar constituents carry no nodal correction at any N', () => {
    for (const N of [0, 45, 123, 200, 359]) {
      expect(nodalCorrection('none', N)).toEqual({ f: 1, uDeg: 0 })
    }
  })

  it('M4 is M2 squared and M6 is M2 cubed', () => {
    for (const N of [0, 60, 137, 250]) {
      const m2 = nodalCorrection('M2', N)
      const m4 = nodalCorrection('M2^2', N)
      const m6 = nodalCorrection('M2^3', N)
      expect(m4.f).toBeCloseTo(m2.f ** 2, 9)
      expect(m4.uDeg).toBeCloseTo(2 * m2.uDeg, 9)
      expect(m6.f).toBeCloseTo(m2.f ** 3, 9)
      expect(m6.uDeg).toBeCloseTo(3 * m2.uDeg, 9)
    }
  })

  it('MS4 takes M2 alone, since S2 contributes f = 1 and u = 0', () => {
    for (const N of [0, 90, 217]) {
      expect(nodalCorrection('MS4', N)).toEqual(nodalCorrection('M2', N))
    }
  })

  it('f stays positive across the whole cycle', () => {
    const schemes: NodalScheme[] = ['Mm', 'Mf', 'O1', 'K1', 'M2', 'K2', 'M2^2', 'M2^3', 'MS4']
    for (const scheme of schemes) {
      for (let N = 0; N < 360; N += 5) {
        expect(nodalCorrection(scheme, N).f).toBeGreaterThan(0.5)
      }
    }
  })
})
