'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TideChart } from '@/components/chart/TideChart'
import { buildChartModel } from '@/lib/chart/model'
import { blendSeries, REBUILD_MS } from '@/lib/chart/motion'
import type { Dictionary } from '@/lib/i18n/dictionary'
import { loadRecord } from '@/lib/records/registry'
import type { ConstituentName } from '@/lib/tide/constituents'
import type { HarmonicFit } from '@/lib/tide/fit'
import { predictHeights, residual, type PredictableConstant } from '@/lib/tide/predict'
import { sliceRecord, type TideRecord } from '@/lib/tide/record'

const WINDOW_DAYS = 30

/**
 * Toggle constituents and watch the prediction rebuild. Start with M2 alone —
 * a clean twice-daily wave — then add S2 and the spring-neap beat appears from
 * two cosines. The one orchestrated moment in the app (PRD §9).
 *
 * The curve tweens into its new shape over 420 ms rather than cutting to it,
 * because the point is to see the beat arrive. Nothing else in the app moves,
 * and this stops entirely under prefers-reduced-motion — the tween is how the
 * curve is drawn, never how it is understood; the numbers are identical either
 * way.
 *
 * The arithmetic is lib/tide's and lib/chart's; this component holds the
 * selection, drives the frames, and renders what those functions return.
 */
export function ConstituentExplorer({
  dict,
  stationId,
  fit,
}: {
  dict: Dictionary
  stationId: string
  fit: HarmonicFit
}) {
  const [record, setRecord] = useState<TideRecord | null>(null)
  const [enabled, setEnabled] = useState<ReadonlySet<ConstituentName>>(new Set(['M2']))
  /** The curve as drawn this frame, which lags the target while it rebuilds. */
  const [drawn, setDrawn] = useState<Float64Array | null>(null)
  const drawnRef = useRef<Float64Array | null>(null)
  const frameRef = useRef<number | null>(null)

  /** Kept in a ref so the tween can read where the curve is without a stale closure. */
  useEffect(() => {
    drawnRef.current = drawn
  }, [drawn])

  useEffect(() => {
    let cancelled = false
    void loadRecord(stationId).then((loaded) => {
      if (cancelled) return
      const startSec = loaded.timesSec[0] as number
      setRecord(sliceRecord(loaded, startSec, startSec + WINDOW_DAYS * 86400))
    })
    return () => {
      cancelled = true
    }
  }, [stationId])

  /** The curve the current selection asks for. */
  const target = useMemo(() => {
    if (record === null) return null
    const constants: PredictableConstant[] = fit.constants
      .filter((c) => enabled.has(c.name))
      .map((c) => ({ name: c.name, amplitudeM: c.amplitudeM, phaseDeg: c.phaseDeg }))

    return constants.length === 0
      ? new Float64Array(record.timesSec.length).fill(fit.meanLevelM)
      : predictHeights({
          meanLevelM: fit.meanLevelM,
          constants,
          timesSec: record.timesSec,
        })
  }, [record, enabled, fit])

  // Grow the new cosine into the curve rather than cutting to it.
  useEffect(() => {
    if (target === null) return undefined

    const from = drawnRef.current
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // First draw, a changed window, or a reader who has asked for less motion:
    // show the answer immediately. The tween is decoration on a value that is
    // already correct.
    if (from === null || from.length !== target.length || reduced) {
      setDrawn(target)
      return undefined
    }

    const started = performance.now()
    const step = (now: number): void => {
      const progress = Math.min((now - started) / REBUILD_MS, 1)
      setDrawn(progress >= 1 ? target : blendSeries(from, target, progress))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [target])

  const model = useMemo(() => {
    if (record === null || drawn === null) return null
    const predicted = drawn

    return buildChartModel({
      timesSec: record.timesSec,
      observedM: record.heightsM,
      modelM: predicted,
      residualM: residual(record.heightsM, predicted),
      intervalSec: record.intervalSec,
      width: 1100,
      chartHeight: 300,
      residualHeight: 130,
      datums: [{ label: 'Z₀', heightM: fit.meanLevelM, emphasis: true }],
    })
  }, [record, drawn, fit])

  function toggle(name: ConstituentName): void {
    setEnabled((previous) => {
      const next = new Set(previous)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="control flex flex-wrap gap-2">
        {fit.constants.map((constant) => {
          const on = enabled.has(constant.name)
          return (
            <button
              key={constant.name}
              type="button"
              onClick={() => toggle(constant.name)}
              aria-pressed={on}
              className={`numeric rounded-sm border px-2.5 py-1 text-sm ${
                on
                  ? 'border-prediction bg-prediction/10 text-prediction'
                  : 'border-grid text-traceInk/60 hover:border-prediction/60'
              }`}
            >
              {constant.name}
              <span className="ml-1.5 text-xs opacity-70">{constant.amplitudeM.toFixed(3)}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setEnabled(new Set(fit.constants.map((c) => c.name)))}
          className="rounded-sm border border-grid px-2.5 py-1 text-sm text-traceInk/70 hover:border-prediction/60"
        >
          + semua
        </button>
        <button
          type="button"
          onClick={() => setEnabled(new Set(['M2']))}
          className="rounded-sm border border-grid px-2.5 py-1 text-sm text-traceInk/70 hover:border-prediction/60"
        >
          M2 saja
        </button>
      </div>

      {model === null ? (
        <p className="control text-sm text-traceInk/60">{dict.common.loading}</p>
      ) : (
        <div className="card p-4">
          <TideChart
            model={model}
            observedLabel={dict.common.observed}
            predictedLabel={`${dict.common.predicted} (${enabled.size} komponen)`}
            residualLabel={dict.common.residual}
          />
        </div>
      )}
    </div>
  )
}
