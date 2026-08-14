'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { RayleighResults } from '@/components/RayleighResults'
import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import { loadRecord } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import type { TideRecord } from '@/lib/tide/record'
import { analyseWindow } from '@/lib/view/window'

/**
 * The reason the project exists (PRD §6.3): record length against resolvable
 * constituents, with the condition number displayed rising.
 *
 * It redraws rather than transitions. The fit is discontinuous — a constituent
 * either resolves or it does not — and animating the change would imply a
 * continuity that is not there.
 *
 * The default window is computed by the server and handed down as `children`,
 * so the page makes its argument before any JavaScript runs and this component
 * only takes over once someone moves the slider. It previously showed the word
 * "Computing…" until the record downloaded, which left the app's centrepiece
 * as a loading string for anyone with scripting off, slow or blocked.
 */
export function RayleighSlider({
  dict,
  stationId,
  maxDays,
  initialDays,
  fullLengthDays,
  children,
}: {
  dict: Dictionary
  stationId: string
  maxDays: number
  initialDays: number
  fullLengthDays: number
  /** The server-rendered default window, shown until the slider is touched. */
  children: React.ReactNode
}) {
  const [record, setRecord] = useState<TideRecord | null>(null)
  const [days, setDays] = useState<number>(initialDays)
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

  /*
   * A full-record tick measures about 29 ms on a fast laptop and roughly four
   * times that on a mid-range phone, and a range input fires onChange
   * continuously while it is dragged. Computing it in the render path made
   * every one of those a blocking task, so the thumb stuttered against its own
   * results.
   *
   * useDeferredValue lets the thumb and its readout update at input speed
   * while the fit follows at whatever speed it can manage, dropping the
   * intermediate windows nobody was going to read. React 18 is already here;
   * no dependency is added for this.
   */
  const settled = useDeferredValue(days)
  const state = useMemo(
    () => (record === null ? null : analyseWindow(record, settled)),
    [record, settled],
  )

  return (
    <div className="space-y-5">
      <div className="card p-card">
        <label className="block text-caption font-medium" htmlFor="window-days">
          {dict.resolusi.sliderLabel}
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <input
            id="window-days"
            type="range"
            min={3}
            max={Math.max(Math.floor(maxDays), 4)}
            step={1}
            value={days}
            onChange={(event) => {
              setTouched(true)
              setDays(Number(event.target.value))
            }}
            className="w-full min-w-[10rem] flex-1 accent-prediction"
          />
          <output htmlFor="window-days" className="numeric min-w-[6rem] text-title">
            {days} {dict.common.days}
          </output>
        </div>
        <p className="mt-2 text-caption text-inkFaint">
          {fill(dict.resolusi.windowNote, { total: fullLengthDays.toFixed(1) })}
        </p>
      </div>

      {/*
       * What the slider just did (WCAG 4.1.3). <output> carries an implicit
       * role="status", so this needs no ARIA of its own — and it announces the
       * summary, not the table: reading ten rows on every tick of a slider is
       * worse than silence.
       */}
      <output className="sr-only">
        {!touched
          ? ''
          : state === null
            ? dict.common.loading
            : state.outcome !== null && state.outcome.type === 'fit'
              ? fill(dict.resolusi.status, {
                  days: state.days,
                  kappa: state.outcome.conditionNumber.toFixed(2),
                  conditioning: dict.conditioning[state.outcome.conditioning],
                  kept: state.kept.length,
                  total: STANDARD_SET.length,
                })
              : fill(dict.resolusi.statusNone, { days: state.days })}
      </output>

      {!touched ? (
        children
      ) : state === null ? (
        <p className="text-caption text-inkFaint">{dict.common.loading}</p>
      ) : (
        <RayleighResults dict={dict} state={state} />
      )}
    </div>
  )
}
