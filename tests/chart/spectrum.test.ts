import { describe, expect, it } from 'vitest'
import { buildSpectrumModel, cyclesPerDay, SPECTRUM_PANEL } from '@/lib/chart/spectrum'
import type { ConstituentConstant } from '@/lib/tide/fit'

function constant(name: string, species: string, speed: number, amplitudeM: number): ConstituentConstant {
  return {
    name: name as ConstituentConstant['name'],
    species,
    doodsonNumber: '',
    speedDegPerHour: speed,
    amplitudeM,
    phaseDeg: 0,
    amplitudeErrorM: 0,
    phaseErrorDeg: 0,
    nodalF: 1,
    nodalUDeg: 0,
  }
}

const FIT = [
  constant('M2', 'semidiurnal', 28.9841042, 0.64),
  constant('S2', 'semidiurnal', 30, 0.37),
  constant('K1', 'diurnal', 15.0410686, 0.25),
  constant('O1', 'diurnal', 13.9430356, 0.16),
]

describe('constituent spectrum', () => {
  it('puts M2 at 1.932 cycles per day', () => {
    expect(cyclesPerDay(28.9841042)).toBeCloseTo(1.9323, 4)
  })

  it('orders panels by species and bars by frequency', () => {
    const model = buildSpectrumModel(FIT)
    expect(model.panels.map((p) => p.species)).toEqual(['diurnal', 'semidiurnal'])
    const semidiurnal = model.panels[1]?.bars.map((b) => b.name)
    expect(semidiurnal).toEqual(['M2', 'S2'])
  })

  it('shares one amplitude scale, so heights compare across panels', () => {
    const model = buildSpectrumModel(FIT)
    const bars = model.panels.flatMap((p) => p.bars)
    const m2 = bars.find((b) => b.name === 'M2')
    const k1 = bars.find((b) => b.name === 'K1')
    if (m2?.type !== 'resolved' || k1?.type !== 'resolved') throw new Error('expected resolved')
    expect(m2.height / k1.height).toBeCloseTo(0.64 / 0.25, 5)
    expect(m2.height).toBeLessThanOrEqual(SPECTRUM_PANEL.base - SPECTRUM_PANEL.top)
  })

  it('marks an unresolved constituent with what it needs, and no amplitude', () => {
    const model = buildSpectrumModel(FIT, [
      {
        type: 'unresolved',
        name: 'P1',
        conflictsWith: [
          {
            a: 'K1',
            b: 'P1',
            separationDegPerHour: 0.0821,
            requiredHours: 4383,
            requiredDays: 182.6,
            availableHours: 3391,
            shortfallDays: 41.3,
          },
        ],
      },
    ])
    const p1 = model.panels.flatMap((p) => p.bars).find((b) => b.name === 'P1')
    expect(p1?.type).toBe('unresolved')
    if (p1?.type !== 'unresolved') return
    expect(p1.conflictsWith).toBe('K1')
    expect(p1.requiredDays).toBeCloseTo(182.6, 1)
    expect('amplitudeM' in p1).toBe(false)
  })
})

describe('constituent spectrum layout', () => {
  const close = [
    ...FIT,
    constant('P1', 'diurnal', 14.9589314, 0.08),
    constant('K2', 'semidiurnal', 30.0821373, 0.1),
  ]

  it('keeps frequency order but never lets two bars collide', () => {
    for (const panel of buildSpectrumModel(close).panels) {
      for (let i = 1; i < panel.bars.length; i++) {
        const gap = (panel.bars[i]?.x ?? 0) - (panel.bars[i - 1]?.x ?? 0)
        expect(gap).toBeGreaterThanOrEqual(24)
        expect(panel.bars[i]?.cyclesPerDay).toBeGreaterThan(panel.bars[i - 1]?.cyclesPerDay ?? 0)
      }
      for (const bar of panel.bars) {
        expect(bar.x).toBeGreaterThanOrEqual(0)
        expect(bar.x).toBeLessThanOrEqual(SPECTRUM_PANEL.width)
      }
    }
  })

  it('rules the scale at round values', () => {
    const labels = buildSpectrumModel(FIT).gridlines.map((g) => g.label)
    // M2 is 0.64 m, so the scale must reach past it.
    expect(labels).toEqual(['0.2', '0.4', '0.6', '0.8'])
  })
})
