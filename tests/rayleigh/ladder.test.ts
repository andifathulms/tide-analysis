import { describe, expect, it } from 'vitest'
import { separationLadder, requiredHoursFor } from '@/lib/tide/rayleigh'
import { STANDARD_SET, type ConstituentName } from '@/lib/tide/constituents'

/**
 * The ladder is the universal half of the project: speeds come from the
 * astronomy, so every number asserted here is the same at every station on
 * Earth and can be checked against a textbook rather than against a record.
 */
describe('the separation ladder', () => {
  const ladder = separationLadder(STANDARD_SET)

  it('carries every pair and every constituent against the mean', () => {
    const n = STANDARD_SET.length
    expect(ladder).toHaveLength((n * (n - 1)) / 2 + n)
    expect(ladder.filter((rung) => rung.b === null)).toHaveLength(n)
  })

  it('is ordered longest first', () => {
    for (let i = 1; i < ladder.length; i += 1) {
      const previous = ladder[i - 1]!
      const current = ladder[i]!
      expect(previous.requiredHours).toBeGreaterThanOrEqual(current.requiredHours)
    }
  })

  it('puts the two half-year pairs at the top, and they are the same length', () => {
    const pairs = ladder.filter((rung) => rung.b !== null)
    const worst = pairs.slice(0, 2).map((rung) => [rung.a, rung.b].sort().join('/'))
    expect(worst).toContain('K1/P1')
    expect(worst).toContain('K2/S2')

    // Both separations reduce to the solar year: S2 − K2 and K1 − P1 differ by
    // the same 2h per Doodson number, so a record that resolves one resolves
    // the other. Anything that breaks this broke the astronomy.
    expect(requiredHoursFor('K1', 'P1')).toBeCloseTo(requiredHoursFor('S2', 'K2'), 6)
  })

  it('agrees with requiredHoursFor on every rung it reports', () => {
    for (const rung of ladder) {
      if (rung.b === null) continue
      expect(rung.requiredHours).toBeCloseTo(requiredHoursFor(rung.a, rung.b), 9)
      expect(rung.requiredDays).toBeCloseTo(rung.requiredHours / 24, 9)
    }
  })

  it('reports the long-period constituents against the mean, not just in pairs', () => {
    // Sa needs a year to separate from Z0 — the constituent most often fitted
    // by people who have not checked whether their record can hold it.
    const sa = separationLadder(['Sa', 'M2']).find((rung) => rung.a === 'Sa' && rung.b === null)
    expect(sa?.requiredDays).toBeGreaterThan(364)
    expect(sa?.requiredDays).toBeLessThan(367)
  })

  it('is deterministic, including where two rungs demand the same length', () => {
    const a = separationLadder(STANDARD_SET)
    const b = separationLadder([...STANDARD_SET].reverse() as ConstituentName[])
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })

  it('handles a single constituent and an empty set without inventing rungs', () => {
    expect(separationLadder([])).toEqual([])
    expect(separationLadder(['M2'])).toHaveLength(1)
  })
})
