import { describe, expect, it } from 'vitest'
import { MANIFEST, loadRecord, stations } from '@/lib/records/registry'
import { assertSourceUsable } from '@/lib/sources/manifest'
import { fitHarmonics } from '@/lib/tide/fit'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { resolvableSubset } from '@/lib/tide/rayleigh'
import { recordLengthDays, rootMeanSquare } from '@/lib/tide/record'
import { formzahl } from '@/lib/tide/formzahl'
import { detectSteps } from '@/lib/tide/steps'

/**
 * The whole pipeline over every bundled record. A unit test cannot tell you
 * that the record you shipped is a stuck gauge; this can, and does — a station
 * whose readings do not move, or whose fit explains none of them, fails here.
 */
const list = stations()

describe('the bundled records', () => {
  it('there is at least one', () => {
    expect(list.length).toBeGreaterThan(0)
  })

  it('every one comes from a resolved, enabled source', () => {
    for (const station of list) {
      expect(() => assertSourceUsable(MANIFEST, station.source as 'ioc')).not.toThrow()
    }
  })

  it('no record claims a disabled source', () => {
    for (const record of MANIFEST.records) {
      const source = MANIFEST.sources.find((s) => s.id === record.source)
      expect(source?.enabled).toBe(true)
    }
  })
})

describe.each(list.map((station) => [station.stationName, station.stationId] as const))(
  '%s',
  (_name, stationId) => {
    it('loads, carries a datum, and declares its gaps', async () => {
      const record = await loadRecord(stationId)
      expect(record.datum.code.trim()).not.toBe('')
      expect(record.datum.label.trim()).not.toBe('')
      expect(record.gaps).toBeDefined()
      expect(record.timesSec.length).toBe(record.heightsM.length)
      expect(record.processing).toContain('sensor')
    })

    it('the gauge was moving — this is a tide, not a flat line', async () => {
      const record = await loadRecord(stationId)
      const mean =
        Array.from(record.heightsM).reduce((sum, h) => sum + h, 0) / record.heightsM.length
      const sigma = rootMeanSquare(Array.from(record.heightsM, (h) => h - mean))
      expect(sigma).toBeGreaterThan(0.05)
    })

    it('times are strictly increasing integer seconds', async () => {
      const record = await loadRecord(stationId)
      for (let i = 1; i < record.timesSec.length; i += 1) {
        expect(record.timesSec[i]!).toBeGreaterThan(record.timesSec[i - 1]!)
        expect(Number.isInteger(record.timesSec[i]!)).toBe(true)
      }
    })

    it('fits, reports a finite condition number, and explains most of the record', async () => {
      const record = await loadRecord(stationId)
      const { kept } = resolvableSubset(STANDARD_SET, recordLengthDays(record) * 24)
      const outcome = fitHarmonics({ record, constituents: kept })
      expect(outcome.type).toBe('fit')
      if (outcome.type !== 'fit') return

      expect(Number.isFinite(outcome.conditionNumber)).toBe(true)
      expect(outcome.conditionNumber).toBeLessThan(100)

      // The harmonic model must account for most of the variance. Anything
      // less means the record is not a tide record.
      const mean =
        Array.from(record.heightsM).reduce((sum, h) => sum + h, 0) / record.heightsM.length
      const sigma = rootMeanSquare(Array.from(record.heightsM, (h) => h - mean))
      expect(outcome.residualRmsM).toBeLessThan(sigma * 0.7)

      // The dominant constituent of an Indonesian coastal station is a real
      // tidal amplitude, not a rounding error.
      const largest = outcome.constants[0]
      expect(largest?.amplitudeM).toBeGreaterThan(0.05)
    })

    it('classifies into one of the four tidal characters', async () => {
      const record = await loadRecord(stationId)
      const { kept } = resolvableSubset(STANDARD_SET, recordLengthDays(record) * 24)
      const outcome = fitHarmonics({ record, constituents: kept })
      if (outcome.type !== 'fit') throw new Error('expected a fit')

      const result = formzahl(outcome.constants)
      expect(result.missing).toEqual([])
      expect(Number.isFinite(result.value)).toBe(true)
      expect(result.label.length).toBeGreaterThan(0)
    })

    it('carries no datum step — the gauge zero held for the whole record', async () => {
      const record = await loadRecord(stationId)
      expect(detectSteps(record.timesSec, record.heightsM, record.intervalSec)).toEqual([])
    })

    it('would show a half-metre step if the gauge zero had moved', async () => {
      /**
       * The detector must be shown to work on this record, not merely to stay
       * silent on it. A step is injected at a point with a clean day either
       * side, since detection across a gap is correctly blind.
       */
      const record = await loadRecord(stationId)
      const window = Math.round(86400 / record.intervalSec)
      let at = -1
      for (let i = window; i < record.timesSec.length - window && at < 0; i += 1) {
        let clean = true
        for (let k = -window; k <= window && clean; k += 1) {
          if (record.timesSec[i + k]! !== record.timesSec[i]! + k * record.intervalSec) clean = false
        }
        if (clean && i > record.timesSec.length / 3) at = i
      }
      expect(at).toBeGreaterThan(0)

      const shifted = Float64Array.from(record.heightsM)
      for (let i = at; i < shifted.length; i += 1) shifted[i] = shifted[i]! + 0.5

      const found = detectSteps(record.timesSec, shifted, record.intervalSec)
      expect(found.length).toBeGreaterThanOrEqual(1)
      expect(Math.abs(found[0]!.shiftM)).toBeGreaterThan(0.25)
    })

    it('cannot see a step smaller than the weather, and does not pretend to', async () => {
      // 0.2 m is inside the range these gauges wander on their own. Reporting
      // one would be inventing a datum change out of a storm.
      const record = await loadRecord(stationId)
      const shifted = Float64Array.from(record.heightsM)
      const at = Math.floor(shifted.length / 2)
      for (let i = at; i < shifted.length; i += 1) shifted[i] = shifted[i]! + 0.2
      expect(detectSteps(record.timesSec, shifted, record.intervalSec)).toEqual([])
    })

    it('is deterministic', async () => {
      const record = await loadRecord(stationId)
      const { kept } = resolvableSubset(STANDARD_SET, recordLengthDays(record) * 24)
      const first = fitHarmonics({ record, constituents: kept })
      const second = fitHarmonics({ record, constituents: kept })
      expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    })
  },
)
