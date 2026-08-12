'use client'

import { useEffect, useMemo, useState } from 'react'
import { TideChart } from '@/components/chart/TideChart'
import { buildChartModel } from '@/lib/chart/model'
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
 * The arithmetic is lib/tide's; this component holds the selection and renders
 * what those functions return.
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

  const model = useMemo(() => {
    if (record === null) return null
    const constants: PredictableConstant[] = fit.constants
      .filter((c) => enabled.has(c.name))
      .map((c) => ({ name: c.name, amplitudeM: c.amplitudeM, phaseDeg: c.phaseDeg }))

    const predicted =
      constants.length === 0
        ? new Float64Array(record.timesSec.length).fill(fit.meanLevelM)
        : predictHeights({
            meanLevelM: fit.meanLevelM,
            constants,
            timesSec: record.timesSec,
          })

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
  }, [record, enabled, fit])

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
