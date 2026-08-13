/**
 * The chart the landing page opens with.
 *
 * The site's subject is an instrument, and the instrument was two clicks and
 * two screens away: a reader arriving at the front door met four paragraphs of
 * prose about tidal harmonics before seeing a single tide. One fitted chart
 * says all of it at once — the black line is the sea, the blue line lying on
 * top of it is what the constituents predicted, the ochre band beneath is what
 * they could not explain.
 *
 * It is the same analysis, the same solver and the same chart model the record
 * page uses. Nothing here is a mock-up or a decorative curve; it is computed at
 * build time from a bundled record, so the front page cannot drift away from
 * what the station pages report.
 */

import { buildChartModel, type ChartModel } from '@/lib/chart/model'
import { stations } from '@/lib/records/registry'
import { largestConstituent } from './derivation'
import { analyseStation } from './station'

/** Two thirds fitted, matching the record page, so the two agree. */
const FIT_FRACTION = 2 / 3

/**
 * Long enough to hold most of a spring–neap cycle — the beat between M2 and S2
 * is the most legible thing a tide does, and it needs about a fortnight to
 * show. Short enough that individual tides stay separate rather than smearing
 * into a band at this width.
 */
const WINDOW_DAYS = 24

/**
 * Sabang first: a near-textbook semidiurnal record (F = 0.204), which is the
 * clearest thing to meet first. Any bundled station will do if it is absent —
 * the front page must not depend on one record being present.
 */
const PREFERRED = 'ioc-sabang'

export interface HeroChart {
  readonly model: ChartModel
  readonly stationId: string
  readonly stationName: string
  readonly startSec: number
  readonly endSec: number
  /** RMS over the window shown, in metres — the fit's own report on itself. */
  readonly residualRmsM: number | null
  /** How many constituents the shown prediction was built from. */
  readonly constituentCount: number
  /**
   * The largest constituent at this station, so the front page can make its
   * claim with a number instead of a description.
   */
  readonly largest: {
    readonly name: string
    readonly amplitudeM: number
    readonly phaseDeg: number
    /** g ÷ speed: how far behind the Moon or Sun it actually arrives. */
    readonly lagHours: number
  } | null
}

/** Index of the first sample at or after `atSec`. */
function indexAt(timesSec: Float64Array, atSec: number): number {
  for (let i = 0; i < timesSec.length; i += 1) {
    if ((timesSec[i] as number) >= atSec) return i
  }
  return timesSec.length
}

export async function heroChart(): Promise<HeroChart | null> {
  const list = stations()
  const chosen = list.find((s) => s.stationId === PREFERRED) ?? list[0]
  if (chosen === undefined) return null

  const analysis = await analyseStation(chosen.stationId, { fitFraction: FIT_FRACTION })
  if (analysis === null) return null

  const shown =
    analysis.primary.outcome.type === 'fit' ? analysis.primary : analysis.fallback?.analysis
  if (shown === undefined || shown.series === null) return null

  // A window inside the fitted part. The held-out third is the record page's
  // argument, and it needs its shading and its caption to be read correctly;
  // here the claim is only that the model tracks the sea.
  const { fitWindow } = shown
  const spanSec = WINDOW_DAYS * 86400
  const startSec = Math.max(fitWindow.startSec, fitWindow.endSec - spanSec)
  const from = indexAt(shown.series.timesSec, startSec)
  const to = indexAt(shown.series.timesSec, fitWindow.endSec)
  if (to - from < 2) return null

  const timesSec = shown.series.timesSec.slice(from, to)
  const residualM = shown.series.residualM.slice(from, to)

  const largest =
    shown.outcome.type === 'fit' ? largestConstituent(shown.outcome.constants) : null

  const model = buildChartModel({
    timesSec,
    observedM: shown.series.observedM.slice(from, to),
    modelM: shown.series.modelM.slice(from, to),
    residualM,
    intervalSec: analysis.record.intervalSec,
    width: 900,
    chartHeight: 260,
    residualHeight: 96,
    datums: [],
    fitWindow: { startSec: timesSec[0] as number, endSec: timesSec[timesSec.length - 1] as number },
    heldOutWindow: null,
    datumSteps: [],
  })

  return {
    model,
    stationId: chosen.stationId,
    stationName: chosen.stationName,
    startSec: timesSec[0] as number,
    endSec: timesSec[timesSec.length - 1] as number,
    residualRmsM: shown.fitResidualRmsM,
    constituentCount:
      shown.outcome.type === 'fit' ? shown.outcome.constants.length : 0,
    largest:
      largest === null
        ? null
        : {
            name: largest.name,
            amplitudeM: largest.amplitudeM,
            phaseDeg: largest.phaseDeg,
            lagHours: largest.phaseDeg / largest.speedDegPerHour,
          },
  }
}
