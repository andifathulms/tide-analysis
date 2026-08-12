/**
 * View-level orchestration: record in, everything a page needs out.
 *
 * All of it is pure and runs in Node, so a page renders a value it was handed
 * rather than computing one (invariant 16).
 */

import { buildDesignMatrix, evaluateDesign } from '@/lib/tide/design'
import { coefficientsFrom, fitHarmonics, type FitOutcome, type HarmonicFit } from '@/lib/tide/fit'
import { formzahl, type FormzahlResult } from '@/lib/tide/formzahl'
import { predictHeights, residual, type PredictableConstant } from '@/lib/tide/predict'
import { rootMeanSquare, sliceRecord, recordLengthDays, type TideRecord } from '@/lib/tide/record'
import type { ConstituentName } from '@/lib/tide/constituents'

export interface AnalysisOptions {
  readonly record: TideRecord
  readonly constituents: readonly ConstituentName[]
  /**
   * Fraction of the record used for fitting; the remainder is held out and
   * predicted, so the model is visibly tested on data it never saw.
   */
  readonly fitFraction?: number
}

export interface AnalysisSeries {
  readonly timesSec: Float64Array
  readonly observedM: Float64Array
  readonly modelM: Float64Array
  readonly residualM: Float64Array
}

export interface Analysis {
  readonly outcome: FitOutcome
  readonly series: AnalysisSeries | null
  readonly formzahl: FormzahlResult | null
  /** RMS over the window that was fitted. */
  readonly fitResidualRmsM: number | null
  /** RMS over the held-out window — the honest number. */
  readonly heldOutResidualRmsM: number | null
  readonly fitWindow: { readonly startSec: number; readonly endSec: number }
  readonly heldOutWindow: { readonly startSec: number; readonly endSec: number } | null
}

/** Model heights at arbitrary times from a completed fit. */
export function modelSeries(fit: HarmonicFit, timesSec: Float64Array): Float64Array {
  const design = buildDesignMatrix({
    timesSec,
    constituents: fit.constants.map((c) => c.name),
    nodalEpochSec: fit.nodalEpochSec,
  })
  return evaluateDesign(design, coefficientsFrom(fit, design))
}

export function analyse(options: AnalysisOptions): Analysis {
  const { record, constituents } = options
  const fitFraction = options.fitFraction ?? 1

  const startSec = record.timesSec[0] as number
  const endSec = record.timesSec[record.timesSec.length - 1] as number
  const splitSec = Math.round(startSec + (endSec - startSec) * fitFraction)

  const fitRecord = fitFraction >= 1 ? record : sliceRecord(record, startSec, splitSec)
  const outcome = fitHarmonics({ record: fitRecord, constituents })

  const fitWindow = { startSec, endSec: splitSec }
  const heldOutWindow = fitFraction >= 1 ? null : { startSec: splitSec, endSec }

  if (outcome.type === 'refusal') {
    return {
      outcome,
      series: null,
      formzahl: null,
      fitResidualRmsM: null,
      heldOutResidualRmsM: null,
      fitWindow,
      heldOutWindow,
    }
  }

  // The model runs across the whole record, including the held-out part.
  const modelM = modelSeries(outcome, record.timesSec)
  const residualM = residual(record.heightsM, modelM)

  const fitResiduals: number[] = []
  const heldOutResiduals: number[] = []
  for (let i = 0; i < record.timesSec.length; i += 1) {
    const t = record.timesSec[i] as number
    const r = residualM[i] as number
    if (t <= splitSec) fitResiduals.push(r)
    else heldOutResiduals.push(r)
  }

  return {
    outcome,
    series: {
      timesSec: record.timesSec,
      observedM: record.heightsM,
      modelM,
      residualM,
    },
    formzahl: formzahl(outcome.constants),
    fitResidualRmsM: rootMeanSquare(fitResiduals),
    heldOutResidualRmsM: heldOutResiduals.length > 0 ? rootMeanSquare(heldOutResiduals) : null,
    fitWindow,
    heldOutWindow,
  }
}

/** Rebuild a prediction from a subset of constituents — the explorer. */
export function predictSubset(
  fit: HarmonicFit,
  enabled: ReadonlySet<ConstituentName>,
  timesSec: Float64Array,
): Float64Array {
  const constants: PredictableConstant[] = fit.constants
    .filter((c) => enabled.has(c.name))
    .map((c) => ({ name: c.name, amplitudeM: c.amplitudeM, phaseDeg: c.phaseDeg }))
  if (constants.length === 0) {
    return new Float64Array(timesSec.length).fill(fit.meanLevelM)
  }
  return predictHeights({ meanLevelM: fit.meanLevelM, constants, timesSec })
}

export function describeRecord(record: TideRecord): {
  readonly lengthDays: number
  readonly sampleCount: number
  readonly gapCount: number
  readonly gapHours: number
} {
  return {
    lengthDays: recordLengthDays(record),
    sampleCount: record.timesSec.length,
    gapCount: record.gaps.length,
    gapHours: record.gaps.reduce((sum, g) => sum + (g.endSec - g.startSec) / 3600, 0),
  }
}
