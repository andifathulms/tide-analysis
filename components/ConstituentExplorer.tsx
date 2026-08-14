'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TideChart } from '@/components/chart/TideChart'
import { buildChartModel } from '@/lib/chart/model'
import { blendSeries, REBUILD_MS } from '@/lib/chart/motion'
import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import { loadRecord } from '@/lib/records/registry'
import { constituent, type ConstituentName, type Species } from '@/lib/tide/constituents'
import type { HarmonicFit } from '@/lib/tide/fit'
import { predictHeights, residual, type PredictableConstant } from '@/lib/tide/predict'
import { sliceRecord, type TideRecord } from '@/lib/tide/record'
import { Callout } from '@/components/ui'

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
  stationName,
  fit,
}: {
  dict: Dictionary
  stationId: string
  stationName: string
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

  /** Semidiurnal first: the explorer's own narrative starts there (M2, then S2). */
  const SPECIES_ORDER: readonly Species[] = ['semidiurnal', 'diurnal', 'shallow-water', 'long-period']

  const grouped = SPECIES_ORDER.map((species) => ({
    species,
    constants: fit.constants.filter((c) => constituent(c.name).species === species),
  })).filter((group) => group.constants.length > 0)

  function speciesLabel(species: Species): string {
    switch (species) {
      case 'semidiurnal':
        return dict.komponen.explorerGroupSemidiurnal
      case 'diurnal':
        return dict.komponen.explorerGroupDiurnal
      case 'shallow-water':
        return dict.komponen.explorerGroupShallow
      case 'long-period':
        return species
    }
  }

  return (
    <div className="space-y-4">
      {/*
       * The honest label. This control is the most engaging thing on the site
       * and it demonstrates synthesis — PRD §6.6's spring-neap beat emerging
       * from two cosines, which is a real lesson. Unlabelled, though, it reads
       * as analysis: press a button, watch the fit change. It does not. Saying
       * so is the difference between teaching the distinction the project is
       * built on and quietly undermining it.
       */}
      <Callout tone="note" size="caption" className="max-w-reading">
        {dict.komponen.explorerNotRefit}
      </Callout>

      <div className="space-y-3">
        {grouped.map(({ species, constants }) => (
          <div key={species}>
            <p className="eyebrow mb-1.5">{speciesLabel(species)}</p>
            <div className="flex flex-wrap gap-2">
              {constants.map((constant) => {
                const on = enabled.has(constant.name)
                return (
                  <button
                    key={constant.name}
                    type="button"
                    onClick={() => toggle(constant.name)}
                    aria-pressed={on}
                    className={`numeric rounded-full border px-3 py-1.5 text-caption ${
                      on
                        ? 'border-prediction bg-predictionSoft text-prediction'
                        : 'border-rule text-inkFaint hover:border-prediction/60'
                    }`}
                  >
                    {constant.name}
                    <span className="ml-1.5 text-micro opacity-70">
                      {constant.amplitudeM.toFixed(3)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
          <button
            type="button"
            onClick={() => setEnabled(new Set(fit.constants.map((c) => c.name)))}
            className="rounded-sm border border-rule px-2.5 py-1 text-caption text-inkMuted hover:border-prediction/60"
          >
            {dict.komponen.explorerAll}
          </button>
          <button
            type="button"
            onClick={() => setEnabled(new Set(['M2']))}
            className="rounded-sm border border-rule px-2.5 py-1 text-caption text-inkMuted hover:border-prediction/60"
          >
            {dict.komponen.explorerOnly}
          </button>
        </div>
      </div>

      {/* Which constituents are on now — the chart change is invisible to a
          screen reader, and aria-label on the SVG does not announce (4.1.3). */}
      <output className="sr-only">
        {fill(dict.komponen.status, {
          count: enabled.size,
          names: fit.constants
            .filter((c) => enabled.has(c.name))
            .map((c) => c.name)
            .join(', '),
        })}
      </output>

      {model === null ? (
        <p className="text-caption text-inkFaint">{dict.common.loading}</p>
      ) : (
        <div className="card p-card">
          <TideChart
            model={model}
            observedLabel={dict.common.observed}
            predictedLabel={dict.common.predicted}
            residualLabel={dict.common.residual}
            titleId="explorer-chart-title"
            description={fill(dict.common.chartAlt, {
              station: stationName,
              days: WINDOW_DAYS,
              count: enabled.size,
            })}
          />
        </div>
      )}
    </div>
  )
}
