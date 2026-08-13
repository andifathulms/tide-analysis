import { describe, expect, it } from 'vitest'
import { nodalCycles, NODE_CYCLE_DAYS } from '@/lib/tide/nodalcycle'
import { nodalCorrection } from '@/lib/astro/nodal'
import { astronomicalElements } from '@/lib/astro/elements'
import type { ConstituentName } from '@/lib/tide/constituents'

const EPOCH = Math.round(Date.parse('2026-04-01T00:00:00Z') / 1000)

function cycle(name: ConstituentName) {
  const [only] = nodalCycles({ names: [name], epochSec: EPOCH, steps: 360 })
  if (only === undefined) throw new Error('no cycle')
  return only
}

/**
 * The extremes are Schureman's series read at N = 0 and N = 180°, so these are
 * published values rather than a snapshot of whatever the code returned.
 * Schureman 1958, SP 98, table 14.
 */
describe('the node cycle, swept', () => {
  it('reproduces the published range of f for M2', () => {
    // 1.0004 − 0.0373 cos N + 0.0002 cos 2N
    const m2 = cycle('M2')
    expect(m2.fMin).toBeCloseTo(0.9633, 3)
    expect(m2.fMax).toBeCloseTo(1.0379, 3)
  })

  it('reproduces the published range of f for K2 — the big one', () => {
    // 1.0241 + 0.2863 cos N + 0.0083 cos 2N − 0.0015 cos 3N.
    // A 57% peak-to-peak swing: the reason this is worth a panel and not a
    // footnote.
    const k2 = cycle('K2')
    expect(k2.fMin).toBeCloseTo(0.7476, 3)
    expect(k2.fMax).toBeCloseTo(1.3172, 3)
    expect(k2.swing).toBeGreaterThan(0.5)
  })

  it('leaves solar constituents alone across the whole cycle', () => {
    // S2 has no lunar node to follow. f is exactly 1 and u exactly 0, for all
    // time — not approximately, and the panel must not imply otherwise.
    const s2 = cycle('S2')
    expect(s2.scheme).toBe('none')
    expect(s2.fMin).toBe(1)
    expect(s2.fMax).toBe(1)
    expect(s2.uMinDeg).toBe(0)
    expect(s2.uMaxDeg).toBe(0)
    expect(s2.swing).toBe(0)
  })

  it('orders the diurnals as published: K1 swings more than O1, less than K2', () => {
    expect(cycle('K1').swing).toBeGreaterThan(cycle('M2').swing)
    expect(cycle('K1').swing).toBeLessThan(cycle('K2').swing)
    expect(cycle('O1').swing).toBeGreaterThan(cycle('K1').swing)
  })

  it('agrees with the nodal primitive at the epoch it was handed', () => {
    const m2 = cycle('M2')
    const direct = nodalCorrection('M2', astronomicalElements(EPOCH).N)
    expect(m2.atEpoch.f).toBeCloseTo(direct.f, 12)
    expect(m2.atEpoch.uDeg).toBeCloseTo(direct.uDeg, 12)
    expect(m2.atEpoch.atSec).toBe(EPOCH)
  })

  it('returns to where it started after one cycle', () => {
    const m2 = cycle('M2')
    const first = m2.samples[0]!
    const last = m2.samples[m2.samples.length - 1]!
    expect(last.atSec - first.atSec).toBeCloseTo(NODE_CYCLE_DAYS * 86400, -2)
    expect(last.f).toBeCloseTo(first.f, 3)
  })

  it('brackets the epoch rather than starting from it', () => {
    // The record's own position should sit inside the swept span, so a reader
    // sees where they are on the cycle rather than at its edge.
    const m2 = cycle('M2')
    expect(m2.samples[0]!.atSec).toBeLessThan(EPOCH)
    expect(m2.samples[m2.samples.length - 1]!.atSec).toBeGreaterThan(EPOCH)
  })

  it('is deterministic', () => {
    const names: ConstituentName[] = ['M2', 'S2', 'K1', 'O1', 'K2']
    const a = nodalCycles({ names, epochSec: EPOCH })
    const b = nodalCycles({ names, epochSec: EPOCH })
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })
})
