/**
 * Build-time analysis for a station page.
 *
 * Everything here runs in Node during the static export, so a page renders a
 * value rather than computing one, and the shipped JavaScript carries only what
 * genuinely needs to be interactive — the Rayleigh slider and the explorer.
 */

import { STANDARD_SET, type ConstituentName } from '@/lib/tide/constituents'
import { resolvableSubset, type ConstituentResolution } from '@/lib/tide/rayleigh'
import { recordLengthHours, type TideRecord } from '@/lib/tide/record'
import { loadRecord, stationSummary, type StationSummary } from '@/lib/records/registry'
import { analyse, describeRecord, type Analysis } from './analysis'
import type { FormzahlResult } from '@/lib/tide/formzahl'

export interface StationAnalysis {
  readonly station: StationSummary
  readonly record: TideRecord
  readonly requested: readonly ConstituentName[]
  /** The result of asking for the full standard set. May be a refusal. */
  readonly primary: Analysis
  /**
   * When the standard set is refused, the largest subset this record does
   * support — offered alongside the refusal, never instead of it.
   */
  readonly fallback: {
    readonly analysis: Analysis
    readonly constituents: readonly ConstituentName[]
    readonly dropped: readonly ConstituentResolution[]
  } | null
  readonly summary: ReturnType<typeof describeRecord>
  /**
   * The station's tidal character, always from the whole record.
   *
   * It is a property of the place, not of whichever window a page happens to
   * fit, so every view must report the same one. Deriving it from the page's
   * own window made the record page and the constituent page disagree about
   * Jakarta — mixed on one tab, diurnal on the next.
   */
  readonly character: FormzahlResult | null
}

export interface StationAnalysisOptions {
  readonly constituents?: readonly ConstituentName[]
  readonly fitFraction?: number
}

export async function analyseStation(
  stationId: string,
  options: StationAnalysisOptions = {},
): Promise<StationAnalysis | null> {
  const station = stationSummary(stationId)
  if (station === undefined) return null

  const record = await loadRecord(stationId)
  const requested = options.constituents ?? STANDARD_SET
  const primary = analyse({ record, constituents: requested, fitFraction: options.fitFraction })

  let fallback: StationAnalysis['fallback'] = null
  if (primary.outcome.type === 'refusal') {
    // The subset has to be resolvable on the window that will actually be
    // fitted, not on the whole record: with two thirds fitted and one third
    // held out, those are different lengths and the difference is months.
    const fittedHours = recordLengthHours(record) * (options.fitFraction ?? 1)
    const { kept, dropped } = resolvableSubset(requested, fittedHours)
    if (kept.length > 0) {
      fallback = {
        analysis: analyse({ record, constituents: kept, fitFraction: options.fitFraction }),
        constituents: kept,
        dropped,
      }
    }
  }

  const wholeRecord = analyse({
    record,
    constituents: resolvableSubset(requested, recordLengthHours(record)).kept,
  })

  return {
    station,
    record,
    requested,
    primary,
    fallback,
    summary: describeRecord(record),
    character: wholeRecord.formzahl,
  }
}
