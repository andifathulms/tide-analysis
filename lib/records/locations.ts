/**
 * Where each bundled gauge stands, for the station atlas on the home page.
 *
 * Positions are the IOC Sea Level Monitoring Facility's own station metadata
 * (service.php?query=stationlist, fetched 15 October 2026), in decimal
 * degrees, WGS84. They are display data only — nothing in lib/tide or
 * lib/astro reads them, and no harmonic quantity depends on where a dot sits.
 *
 * `label` places the name beside the dot: hand-set, because Semarang,
 * Surabaya and the Jakarta gauge sit within four degrees of each other and an
 * automatic placement collides them.
 */

export interface GaugeLocation {
  /** The name as it fits beside a dot on the map. */
  readonly mapName: string
  readonly latDeg: number
  readonly lonDeg: number
  readonly label: {
    readonly dx: number
    readonly dy: number
    readonly anchor: 'start' | 'middle' | 'end'
  }
}

export const GAUGE_LOCATIONS: Readonly<Record<string, GaugeLocation>> = {
  'ioc-sabang': {
    mapName: 'Sabang', latDeg: 5.8333, lonDeg: 95.3333, label: { dx: 14, dy: -6, anchor: 'start' } },
  'ioc-padang': {
    mapName: 'Padang', latDeg: -0.95, lonDeg: 100.3667, label: { dx: -14, dy: 4, anchor: 'end' } },
  'ioc-kolinamil': {
    mapName: 'Jakarta (Kolinamil)',
    latDeg: -6.10667,
    lonDeg: 106.89083,
    label: { dx: -20, dy: -24, anchor: 'end' },
  },
  'ioc-semarang': {
    mapName: 'Semarang', latDeg: -6.9479, lonDeg: 110.42012, label: { dx: 0, dy: -20, anchor: 'middle' } },
  'ioc-surabaya': {
    mapName: 'Surabaya',
    latDeg: -7.19996944,
    lonDeg: 112.74058611,
    label: { dx: 14, dy: -14, anchor: 'start' },
  },
  'ioc-benoa': {
    mapName: 'Benoa', latDeg: -8.7666, lonDeg: 115.2166, label: { dx: 14, dy: 18, anchor: 'start' } },
  'ioc-bitung': {
    mapName: 'Bitung', latDeg: 1.438944, lonDeg: 125.190431, label: { dx: 14, dy: 4, anchor: 'start' } },
  'ioc-ambon': {
    mapName: 'Ambon', latDeg: -3.683333, lonDeg: 128.18333, label: { dx: 14, dy: 4, anchor: 'start' } },
}
