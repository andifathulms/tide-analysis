'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { TideChart } from '@/components/chart/TideChart'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { FitDiagnostics, RefusalNotice } from '@/components/Diagnostics'
import { buildChartModel, type ChartModel } from '@/lib/chart/model'
import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import { loadRecord } from '@/lib/records/registry'
import type { ConstituentName } from '@/lib/tide/constituents'
import { analyse, type Analysis } from '@/lib/view/analysis'
import type { TideRecord } from '@/lib/tide/record'
import { readIntParam, withIntParam } from '@/lib/view/queryState'

const PERCENT_PARAM = 'fit'

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
  stationName,
  constituents,
  initialPercent,
  children,
}: {
  dict: Dictionary
  stationId: string
  stationName: string
  constituents: readonly ConstituentName[]
  initialPercent: number
  /** The server-rendered view, shown until the control is touched. */
  children: React.ReactNode
}) {
  const [percent, setPercent] = useState(initialPercent)
  const [record, setRecord] = useState<TideRecord | null>(null)
  const [touched, setTouched] = useState(false)

  /*
   * A reader who reaches this page via `?fit=40` gets that split on load
   * rather than the server-rendered default — the static export has no
   * request to render from, so this can only happen client-side, after the
   * default view has already painted once.
   */
  useEffect(() => {
    const fromUrl = readIntParam(window.location.search, PERCENT_PARAM)
    if (fromUrl === null) return
    setPercent(Math.min(Math.max(fromUrl, 10), 100))
    setTouched(true)
    // Only meant to run once, against the URL the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  /*
   * A tick here measures about 22 ms on a fast laptop — the fit plus the chart
   * model — and a range input fires onChange continuously while dragged.
   * Computing it in the render path made every one of those a blocking task.
   * The thumb and its readout now update at input speed and the chart follows,
   * skipping the intermediate splits nobody was going to read. See the note in
   * RayleighSlider; React 18 is already a dependency.
   */
  const settled = useDeferredValue(percent)
  const recomputed = useMemo((): { analysis: Analysis; model: ChartModel | null } | null => {
    if (record === null) return null
    const analysis = analyse({ record, constituents, fitFraction: settled / 100 })
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
  }, [record, constituents, settled])

  /**
   * The split a reader is looking at, kept in the address bar so it can be
   * linked — tracks `settled` rather than the raw thumb position, so
   * dragging doesn't call `replaceState` on every animation frame.
   */
  useEffect(() => {
    if (!touched) return
    const url = `${window.location.pathname}${withIntParam(window.location.search, PERCENT_PARAM, settled)}${window.location.hash}`
    window.history.replaceState(null, '', url)
  }, [touched, settled])

  const spanDays =
    record === null
      ? null
      : ((record.timesSec[record.timesSec.length - 1] as number) -
          (record.timesSec[0] as number)) /
        86400

  /** The readout tracks the thumb, at input speed. */
  const lengthDays = spanDays === null ? null : spanDays * (percent / 100)
  /** Everything that describes a result tracks the result, one frame behind. */
  const settledLengthDays = spanDays === null ? null : spanDays * (settled / 100)

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <label className="block text-caption font-medium" htmlFor="fit-percent">
          {dict.catatan.splitLabel}
        </label>
        {/*
         * The readout was a fixed 10rem beside a full-width range. At 320px
         * that left the slider about 100px, and at 200% zoom it collapsed
         * toward nothing — a control that cannot be dragged (WCAG 1.4.10).
         * The row wraps now, and the readout claims a minimum rather than a
         * fixed width.
         */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
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
            className="w-full min-w-[10rem] flex-1 accent-prediction"
          />
          <output htmlFor="fit-percent" className="numeric min-w-[9rem] text-title">
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

      {/*
       * What moving the split just did (WCAG 4.1.3). <output> has an implicit
       * role="status", so no ARIA here. It reports κ and the two residual RMS
       * figures — the numbers this control exists to move — not the table.
       */}
      <output className="sr-only">
        {!touched
          ? ''
          : recomputed === null
            ? dict.common.loading
            : recomputed.analysis.outcome.type === 'fit'
              ? fill(dict.catatan.status, {
                  percent: settled,
                  days: settledLengthDays === null ? '—' : settledLengthDays.toFixed(0),
                  kappa: recomputed.analysis.outcome.conditionNumber.toFixed(2),
                  fitRms: recomputed.analysis.fitResidualRmsM?.toFixed(4) ?? '—',
                  heldRms: recomputed.analysis.heldOutResidualRmsM?.toFixed(4) ?? '—',
                })
              : fill(dict.catatan.statusRefused, {
                  percent: settled,
                  days: settledLengthDays === null ? '—' : settledLengthDays.toFixed(0),
                  reason: recomputed.analysis.outcome.message,
                })}
      </output>

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
                titleId="fit-window-chart-title"
                description={
                  fill(dict.common.chartAlt, {
                    station: stationName,
                    days: settledLengthDays === null ? '—' : settledLengthDays.toFixed(0),
                    count: constituents.length,
                  }) +
                  (recomputed.analysis.fitResidualRmsM === null
                    ? ''
                    : fill(dict.common.chartAltRms, {
                        rms: recomputed.analysis.fitResidualRmsM.toFixed(4),
                      }))
                }
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
