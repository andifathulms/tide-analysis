import { describe, expect, it } from 'vitest'
import { normalise, totalGapHours, type RawSample } from '@/lib/sources/normalise'
import { assertSourceUsable, validateManifest, LicenceGateError } from '@/lib/sources/manifest'
import { parseIocResponse } from '@/lib/sources/ioc'
import { toTideRecord } from '@/lib/tide/record'
import manifest from '@/data/records/manifest.json'
import type { RecordManifest } from '@/lib/sources/manifest'

const MANIFEST = manifest as RecordManifest
const START = Math.round(Date.parse('2026-01-01T00:00:00Z') / 1000)

const METADATA = {
  stationId: 'test-station',
  stationName: 'Uji',
  source: 'ioc' as const,
  licence: 'test',
  attribution: 'test',
  latitude: 0,
  longitude: 0,
  datum: { code: 'sensor-zero', label: 'Nol sensor' },
  processing: 'uji',
}

/**
 * Five-minute samples, optionally with a span removed. The span is widened by
 * the nearest-sample tolerance at both ends, so a dropped hour really is
 * unrepresented rather than covered by a neighbouring sample.
 */
function minuteSamples(hours: number, skipSpanHours?: readonly [number, number]): RawSample[] {
  const samples: RawSample[] = []
  const skipFrom = skipSpanHours === undefined ? null : START + skipSpanHours[0] * 3600 - 600
  const skipTo = skipSpanHours === undefined ? null : START + skipSpanHours[1] * 3600 + 600
  for (let minute = 0; minute <= hours * 60; minute += 5) {
    const timeSec = START + minute * 60
    if (skipFrom !== null && skipTo !== null && timeSec >= skipFrom && timeSec <= skipTo) continue
    samples.push({ timeSec, heightM: 1 + Math.sin(minute / 100) })
  }
  return samples
}

describe('normalisation to the analysis grid', () => {
  it('puts one sample on each hour', () => {
    const { record } = normalise(minuteSamples(48), { ...{ metadata: METADATA }, targetIntervalSec: 3600 })
    expect(record.sampleIndices.length).toBe(49)
    expect(record.intervalSec).toBe(3600)
    expect(record.startSec).toBe(START)
  })

  it('declares gaps rather than interpolating them', () => {
    const { record } = normalise(minuteSamples(48, [10, 12]), {
      metadata: METADATA,
      targetIntervalSec: 3600,
    })
    expect(record.gaps.length).toBe(1)
    expect(record.gaps[0]?.startSec).toBe(START + 10 * 3600)
    // Exclusive end: the first hour that has an observation again.
    expect(record.gaps[0]?.endSec).toBe(START + 13 * 3600)
    expect(totalGapHours(record.gaps)).toBe(3)

    // The missing hours are absent from the series, not filled in.
    const tide = toTideRecord(record)
    const times = Array.from(tide.timesSec)
    expect(times).not.toContain(START + 10 * 3600)
    expect(times).not.toContain(START + 11 * 3600)
    expect(record.sampleIndices.length).toBe(49 - 3)
  })

  it('drops implausible heights instead of fitting them', () => {
    const samples = [...minuteSamples(24), { timeSec: START + 3600, heightM: 400 }]
    const { record, dropped } = normalise(samples, {
      metadata: METADATA,
      targetIntervalSec: 3600,
    })
    expect(dropped.outOfRange).toBe(1)
    expect(Math.max(...record.heightsM)).toBeLessThan(10)
  })

  it('round-trips through the serialised form', () => {
    const { record } = normalise(minuteSamples(72, [30, 31]), {
      metadata: METADATA,
      targetIntervalSec: 3600,
    })
    const tide = toTideRecord(record)
    expect(tide.timesSec.length).toBe(record.heightsM.length)
    expect(tide.timesSec[0]).toBe(record.startSec)
    for (let i = 1; i < tide.timesSec.length; i += 1) {
      expect(tide.timesSec[i]!).toBeGreaterThan(tide.timesSec[i - 1]!)
    }
  })
})

describe('the IOC parser', () => {
  it('reads the service’s JSON and treats its times as UTC', () => {
    const samples = parseIocResponse([
      { stime: '2026-06-01 00:00:00', slevel: 1.23, sensor: 'prs' },
      { stime: '2026-06-01 00:10:00', slevel: 1.25, sensor: 'prs' },
    ])
    expect(samples).toHaveLength(2)
    expect(samples[0]?.timeSec).toBe(Math.round(Date.parse('2026-06-01T00:00:00Z') / 1000))
    expect(samples[0]?.heightM).toBe(1.23)
  })

  it('keeps only the requested sensor when a station reports several', () => {
    const samples = parseIocResponse(
      [
        { stime: '2026-06-01 00:00:00', slevel: 1.0, sensor: 'prs' },
        { stime: '2026-06-01 00:10:00', slevel: 9.9, sensor: 'rad' },
      ],
      'prs',
    )
    expect(samples).toHaveLength(1)
  })

  it('rejects a response that is not an array rather than coercing it', () => {
    expect(() => parseIocResponse({ error: 'nope' })).toThrow()
  })
})

describe('the licence gate', () => {
  it('the bundled manifest is internally consistent', () => {
    expect(validateManifest(MANIFEST)).toEqual([])
  })

  it('lets IOC through', () => {
    expect(assertSourceUsable(MANIFEST, 'ioc').enabled).toBe(true)
  })

  it('keeps BIG shut until its terms are verified', () => {
    expect(() => assertSourceUsable(MANIFEST, 'big')).toThrow(LicenceGateError)
  })

  it('keeps UHSLC shut for the same reason', () => {
    expect(() => assertSourceUsable(MANIFEST, 'uhslc')).toThrow(LicenceGateError)
  })

  it('rejects a manifest that enables an unverified source', () => {
    const tampered: RecordManifest = {
      ...MANIFEST,
      sources: MANIFEST.sources.map((s) => (s.id === 'big' ? { ...s, enabled: true } : s)),
    }
    expect(validateManifest(tampered).join(' ')).toContain("Source 'big' is enabled")
  })

  it('rejects a record that claims a disabled source', () => {
    const tampered: RecordManifest = {
      ...MANIFEST,
      records: [
        {
          stationId: 'big-somewhere',
          stationName: 'Somewhere',
          source: 'big',
          file: 'big-somewhere.json',
          startSec: START,
          endSec: START + 86400,
          sampleCount: 24,
          intervalSec: 3600,
          datumCode: 'big-swl-zero',
          gapCount: 0,
          fetchedOn: '2026-08-12',
        },
      ],
    }
    expect(validateManifest(tampered).join(' ')).toContain('which is unverified')
  })

  it('every bundled record comes from an enabled, resolved source', () => {
    for (const record of MANIFEST.records) {
      expect(() => assertSourceUsable(MANIFEST, record.source)).not.toThrow()
    }
  })
})
