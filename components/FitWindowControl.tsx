'use client'

import { useEffect, useMemo, useState } from 'react'
import { TideChart } from '@/components/chart/TideChart'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { FitDiagnostics, RefusalNotice } from '@/components/Diagnostics'
import { buildChartModel, type ChartModel } from '@/lib/chart/model'
import type { Dictionary } from '@/lib/i18n/dictionary'
import { loadRecord } from '@/lib/records/registry'
import type { ConstituentName } from '@/lib/tide/constituents'
import { analyse, type Analysis } from '@/lib/view/analysis'
import type { TideRecord } from '@/lib/tide/record'

/**
 * How much of the record to fit, as a control.
 *
 * The split is the axis the refusal on this page actually turns on: at two
 * thirds of a 212-day record the window is 141 days, which cannot separate K1
 * from P1. Pull the split right and the refusal disappears; pull it left and
 * more constituents fall out. It is the Rayleigh lesson from the other
 * direction — the same criterion, moved by the window rather than the record.
 *
 * The server rendered the default already, so this only recomputes once
 * someone moves it, and the page reads without JavaScript.
 */
export function FitWindowControl({
  dict,
  stationId,
  constituents,
  initialPercent,
  children,
}: {
  dict: Dictionary
  stationId: string
  constituents: readonly ConstituentName[]
  initialPercent: number
  /** The server-rendered view, shown until the control is touched. */
  children: React.ReactNode
}) {
  const [percent, setPercent] = useState(initialPercent)
  const [record, setRecord] = useState<TideRecord | null>(null)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!touched || record !== null) return
    let cancelled = false
    void loadRecord(stationId).then((loaded) => {
      if (!cancelled) setRecord(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [touched, record, stationId])

  const recomputed = useMemo((): { analysis: Analysis; model: ChartModel | null } | null => {
    if (record === null) return null
    const analysis = analyse({ record, constituents, fitFraction: percent / 100 })
    if (analysis.series === null) return { analysis, model: null }

    return {
      analysis,
      model: buildChartModel({
        timesSec: analysis.series.timesSec,
        observedM: analysis.series.observedM,
        modelM: analysis.series.modelM,
        residualM: analysis.series.residualM,
        intervalSec: record.intervalSec,
        width: 1100,
        chartHeight: 340,
        residualHeight: 150,
        datums:
          analysis.outcome.type === 'fit'
            ? [{ label: 'Z₀', heightM: analysis.outcome.meanLevelM, emphasis: true }]
            : [],
        fitWindow: analysis.fitWindow,
        heldOutWindow: analysis.heldOutWindow,
        datumSteps: analysis.outcome.type === 'fit' ? analysis.outcome.steps : [],
      }),
    }
  }, [record, constituents, percent])

  const lengthDays =
    record === null
      ? null
      : (((record.timesSec[record.timesSec.length - 1] as number) -
          (record.timesSec[0] as number)) /
          86400) *
        (percent / 100)

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <label className="block text-caption font-medium" htmlFor="fit-percent">
          {dict.catatan.splitLabel}
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="fit-percent"
            type="range"
            min={10}
            max={100}
            step={1}
            value={percent}
            onChange={(event) => {
              setTouched(true)
              setPercent(Number(event.target.value))
            }}
            className="h-1 w-full accent-prediction"
          />
          <output className="numeric w-40 text-right text-title">
            {percent}%
            {lengthDays !== null && (
              <span className="ml-2 text-caption text-inkFaint">
                {lengthDays.toFixed(0)} {dict.common.days}
              </span>
            )}
          </output>
        </div>
        <p className="mt-2 text-caption text-inkFaint">{dict.catatan.splitHint}</p>
      </div>

      {!touched ? (
        children
      ) : recomputed === null ? (
        <p className="text-caption text-inkFaint">{dict.common.loading}</p>
      ) : (
        <div className="space-y-5">
          {recomputed.analysis.outcome.type === 'refusal' && (
            <RefusalNotice dict={dict} refusal={recomputed.analysis.outcome} />
          )}

          {recomputed.model !== null && (
            <div className="card p-4">
              <TideChart
                model={recomputed.model}
                observedLabel={dict.common.observed}
                predictedLabel={dict.common.predicted}
                residualLabel={dict.common.residual}
                heldOutLabel={dict.catatan.heldOut}
              />
            </div>
          )}

          {recomputed.analysis.outcome.type === 'fit' && (
            <>
              <FitDiagnostics dict={dict} fit={recomputed.analysis.outcome} />
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="card p-4">
                  <h3 className="eyebrow">
                    {dict.catatan.fitRms}
                  </h3>
                  <p className="numeric text-headline text-residualText">
                    {recomputed.analysis.fitResidualRmsM?.toFixed(4)} m
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className="eyebrow">
                    {dict.catatan.heldOutRms}
                  </h3>
                  <p className="numeric text-headline text-residualText">
                    {recomputed.analysis.heldOutResidualRmsM === null
                      ? '—'
                      : `${recomputed.analysis.heldOutResidualRmsM.toFixed(4)} m`}
                  </p>
                </div>
              </section>
              <ConstituentTable dict={dict} constants={recomputed.analysis.outcome.constants} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
