/**
 * The station atlas as a value: projection, graticule, sea names and gauge
 * marks, computed here so the component only draws (invariant 16).
 *
 * Plate carrée over the archipelago. Indonesia straddles the equator, where
 * an equirectangular projection distorts least, and a reader comparing
 * positions west to east is reading longitude directly.
 */

import type { TideType } from '@/lib/tide/formzahl'

export const ATLAS_EXTENT = { west: 93.5, east: 142.5, north: 8, south: -12 } as const
export const ATLAS_WIDTH = 960
export const ATLAS_HEIGHT = Math.round(
  (ATLAS_WIDTH * (ATLAS_EXTENT.north - ATLAS_EXTENT.south)) / (ATLAS_EXTENT.east - ATLAS_EXTENT.west),
)

export function project(lonDeg: number, latDeg: number): { x: number; y: number } {
  return {
    x: ((lonDeg - ATLAS_EXTENT.west) / (ATLAS_EXTENT.east - ATLAS_EXTENT.west)) * ATLAS_WIDTH,
    y: ((ATLAS_EXTENT.north - latDeg) / (ATLAS_EXTENT.north - ATLAS_EXTENT.south)) * ATLAS_HEIGHT,
  }
}

/**
 * Seas, named in the italic nautical charts letter water in. Positions are
 * chosen to sit in open water at this scale.
 */
const SEAS: ReadonlyArray<{ name: string; lonDeg: number; latDeg: number }> = [
  { name: 'Samudra Hindia', lonDeg: 101, latDeg: -9 },
  { name: 'Laut Jawa', lonDeg: 111, latDeg: -4.6 },
  { name: 'Laut Banda', lonDeg: 127.2, latDeg: -6.3 },
  { name: 'Samudra Pasifik', lonDeg: 135.5, latDeg: 5 },
  { name: 'Laut Cina Selatan', lonDeg: 110, latDeg: 6.2 },
  { name: 'Laut Sulawesi', lonDeg: 121.5, latDeg: 3.4 },
]

export interface AtlasStation {
  readonly stationId: string
  readonly name: string
  readonly lonDeg: number
  readonly latDeg: number
  readonly formzahl: number
  readonly type: TideType
  readonly label: { readonly dx: number; readonly dy: number; readonly anchor: 'start' | 'middle' | 'end' }
}

export interface AtlasModel {
  readonly width: number
  readonly height: number
  readonly meridians: ReadonlyArray<{ readonly x: number; readonly label: string }>
  readonly parallels: ReadonlyArray<{ readonly y: number; readonly label: string }>
  readonly seas: ReadonlyArray<{ readonly x: number; readonly y: number; readonly name: string }>
  readonly stations: ReadonlyArray<
    AtlasStation & { readonly x: number; readonly y: number; readonly r: number }
  >
}

/**
 * Mark size grows with F, capped, so the diurnal Jakarta gauge (F ≈ 3.5)
 * reads as more than the semidiurnal ones without swallowing its neighbours.
 * Colour carries the class; size only reinforces it.
 */
export function markRadius(formzahl: number): number {
  return 6 + Math.min(Math.max(formzahl, 0), 3.5) * 2.4
}

function latLabel(latDeg: number): string {
  if (latDeg === 0) return '0°'
  return `${Math.abs(latDeg)}°${latDeg > 0 ? 'LU' : 'LS'}`
}

export function buildAtlasModel(stations: readonly AtlasStation[]): AtlasModel {
  const meridians = []
  for (let lon = 95; lon <= 140; lon += 5) {
    meridians.push({ x: project(lon, 0).x, label: `${lon}°BT` })
  }
  const parallels = []
  for (let lat = 5; lat >= -10; lat -= 5) {
    parallels.push({ y: project(0, lat).y, label: latLabel(lat) })
  }
  return {
    width: ATLAS_WIDTH,
    height: ATLAS_HEIGHT,
    meridians,
    parallels,
    seas: SEAS.map((sea) => ({ ...project(sea.lonDeg, sea.latDeg), name: sea.name })),
    stations: stations.map((station) => ({
      ...station,
      ...project(station.lonDeg, station.latDeg),
      r: markRadius(station.formzahl),
    })),
  }
}
