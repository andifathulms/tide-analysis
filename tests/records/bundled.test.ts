import { describe, expect, it } from 'vitest'
import { MANIFEST, loadRecord, stations } from '@/lib/records/registry'
import { assertSourceUsable } from '@/lib/sources/manifest'
import { fitHarmonics } from '@/lib/tide/fit'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { resolvableSubset } from '@/lib/tide/rayleigh'
import { recordLengthDays, rootMeanSquare } from '@/lib/tide/record'
import { formzahl } from '@/lib/tide/formzahl'

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

    it('is deterministic', async () => {
      const record = await loadRecord(stationId)
      const { kept } = resolvableSubset(STANDARD_SET, recordLengthDays(record) * 24)
      const first = fitHarmonics({ record, constituents: kept })
      const second = fitHarmonics({ record, constituents: kept })
      expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    })
  },
)
