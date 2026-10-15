import { describe, expect, it } from 'vitest'
import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  buildAtlasModel,
  markRadius,
  project,
} from '@/lib/chart/atlas'
import { COASTLINE_PATH } from '@/lib/chart/coastline'
import { GAUGE_LOCATIONS } from '@/lib/records/locations'
import { stations } from '@/lib/records/registry'

describe('station atlas', () => {
  it('locates every bundled station, inside the frame', () => {
    for (const station of stations()) {
      const where = GAUGE_LOCATIONS[station.stationId]
      expect(where, station.stationId).toBeDefined()
      if (where === undefined) continue
      const { x, y } = project(where.lonDeg, where.latDeg)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(ATLAS_WIDTH)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(ATLAS_HEIGHT)
    }
  })

  it('projects west to the left and north to the top', () => {
    expect(project(95, 0).x).toBeLessThan(project(140, 0).x)
    expect(project(110, 5).y).toBeLessThan(project(110, -5).y)
  })

  it('grows marks with F but caps them', () => {
    expect(markRadius(0.2)).toBeLessThan(markRadius(1.6))
    expect(markRadius(3.5)).toBe(markRadius(12))
  })

  it('is deterministic', () => {
    const input = [
      {
        stationId: 'ioc-benoa',
        name: 'Benoa',
        lonDeg: 115.2166,
        latDeg: -8.7666,
        formzahl: 0.413,
        type: 'campuran-condong-ganda' as const,
        label: { dx: 0, dy: 0, anchor: 'start' as const },
      },
    ]
    expect(buildAtlasModel(input)).toEqual(buildAtlasModel(input))
  })

  it('keeps the generated coastline within its margin box', () => {
    expect(COASTLINE_PATH.length).toBeGreaterThan(1000)
    const numbers = COASTLINE_PATH.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
    expect(numbers.length % 2).toBe(0)
    for (let i = 0; i < numbers.length; i += 2) {
      expect(numbers[i]).toBeGreaterThanOrEqual(-24)
      expect(numbers[i]).toBeLessThanOrEqual(ATLAS_WIDTH + 24)
      expect(numbers[i + 1]).toBeGreaterThanOrEqual(-24)
      expect(numbers[i + 1]).toBeLessThanOrEqual(ATLAS_HEIGHT + 24)
    }
  })
})
