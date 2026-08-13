/**
 * What a window of a record supports — the Rayleigh slider's arithmetic,
 * extracted so the server and the browser cannot disagree about it.
 *
 * PRD §2 calls the slider the single best thing in the app, and it rendered
 * the word "Menghitung…" until JavaScript arrived: with scripting off, slow or
 * blocked, the centrepiece was a loading string. The page can now compute the
 * default window itself and hand the markup down, exactly as the record page
 * does with its fit window.
 *
 * Pure, and identical on both sides of the wire.
 */

import { STANDARD_SET } from '@/lib/tide/constituents'
import { fitHarmonics, type FitOutcome } from '@/lib/tide/fit'
import {
  assessResolution,
  resolvableSubset,
  type ConstituentResolution,
  type ResolutionAssessment,
} from '@/lib/tide/rayleigh'
import { sliceRecord, type TideRecord } from '@/lib/tide/record'
import type { ConstituentName } from '@/lib/tide/constituents'

export interface WindowState {
  readonly days: number
  /** What the full standard set would need — a refusal when it cannot be had. */
  readonly requested: ResolutionAssessment
  readonly kept: readonly ConstituentName[]
  readonly dropped: readonly Extract<ConstituentResolution, { type: 'unresolved' }>[]
  /** The fit over the largest supportable subset, or null when none survives. */
  readonly outcome: FitOutcome | null
}

/** The window a station page opens on: long enough to fit, short enough to refuse. */
export const DEFAULT_WINDOW_DAYS = 30

export function analyseWindow(record: TideRecord, days: number): WindowState {
  const startSec = record.timesSec[0] as number
  const window = sliceRecord(record, startSec, startSec + days * 86400)
  const availableHours = days * 24

  const requested = assessResolution(STANDARD_SET, availableHours)
  const { kept, dropped } = resolvableSubset(STANDARD_SET, availableHours)
  const outcome = kept.length > 0 ? fitHarmonics({ record: window, constituents: kept }) : null

  return { days, requested, kept, dropped, outcome }
}
