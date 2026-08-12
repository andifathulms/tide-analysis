'use client'

import { useEffect, useMemo, useState } from 'react'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import type { Dictionary } from '@/lib/i18n/dictionary'
import { loadRecord } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { conditioningOf, fitHarmonics } from '@/lib/tide/fit'
import { assessResolution, describeConflict, resolvableSubset } from '@/lib/tide/rayleigh'
import { recordLengthDays, sliceRecord, type TideRecord } from '@/lib/tide/record'

/**
 * The reason the project exists (PRD §6.3): record length against resolvable
 * constituents, with the condition number displayed rising.
 *
 * It redraws rather than transitions. The fit is discontinuous — a constituent
 * either resolves or it does not — and animating the change would imply a
 * continuity that is not there.
 */
export function RayleighSlider({
  dict,
  stationId,
  maxDays,
}: {
  dict: Dictionary
  stationId: string
  maxDays: number
}) {
  const [record, setRecord] = useState<TideRecord | null>(null)
  const [days, setDays] = useState<number>(Math.min(30, Math.round(maxDays)))

  useEffect(() => {
    let cancelled = false
    void loadRecord(stationId).then((loaded) => {
      if (!cancelled) setRecord(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [stationId])

  const state = useMemo(() => {
    if (record === null) return null
    const startSec = record.timesSec[0] as number
    const window = sliceRecord(record, startSec, startSec + days * 86400)
    const availableHours = days * 24

    const requested = assessResolution(STANDARD_SET, availableHours)
    const { kept, dropped } = resolvableSubset(STANDARD_SET, availableHours)
    const outcome = kept.length > 0 ? fitHarmonics({ record: window, constituents: kept }) : null

    return { window, requested, kept, dropped, outcome }
  }, [record, days])

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <label className="control block text-sm" htmlFor="window-days">
          {dict.resolusi.sliderLabel}
        </label>
        <div className="mt-2 flex items-center gap-4">
          <input
            id="window-days"
            type="range"
            min={3}
            max={Math.max(Math.floor(maxDays), 4)}
            step={1}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-1 w-full accent-[#2E7A85]"
          />
          <output className="numeric w-24 text-right text-lg">
            {days} {dict.common.days}
          </output>
        </div>
      </div>

      {state === null ? (
        <p className="control text-sm text-traceInk/60">{dict.common.loading}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <h3 className="control text-xs uppercase tracking-wide text-traceInk/60">
                {dict.resolusi.conditionTitle}
              </h3>
              <p
                className={`numeric text-3xl ${
                  state.outcome !== null && state.outcome.type === 'fit'
                    ? conditioningOf(state.outcome.conditionNumber) === 'buruk'
                      ? 'text-unresolved'
                      : conditioningOf(state.outcome.conditionNumber) === 'marginal'
                        ? 'text-residual'
                        : 'text-prediction'
                    : 'text-unresolved'
                }`}
              >
                {state.outcome !== null && state.outcome.type === 'fit'
                  ? state.outcome.conditionNumber.toFixed(2)
                  : '—'}
              </p>
              {state.outcome !== null && state.outcome.type === 'fit' && (
                <p className="control mt-1 text-xs">
                  {dict.conditioning[state.outcome.conditioning]}
                </p>
              )}
            </div>

            <div className="card p-4">
              <h3 className="control text-xs uppercase tracking-wide text-traceInk/60">
                {dict.resolusi.keptTitle}
              </h3>
              <p className="numeric mt-1 text-sm leading-relaxed text-prediction">
                {state.kept.join(' · ') || '—'}
              </p>
            </div>

            <div className="card p-4">
              <h3 className="control text-xs uppercase tracking-wide text-traceInk/60">
                {dict.resolusi.droppedTitle}
              </h3>
              <p className="numeric mt-1 text-sm leading-relaxed text-unresolved">
                {state.dropped.map((d) => d.name).join(' · ') || '—'}
              </p>
            </div>
          </div>

          {state.requested.type === 'refusal' && (
            <section className="border-l-4 border-unresolved bg-unresolved/5 px-4 py-3">
              <h3 className="control text-sm font-semibold uppercase tracking-wide text-unresolved">
                {dict.common.refusal}
              </h3>
              <p className="mt-1 text-sm">
                Himpunan baku diminta pada jendela {days} {dict.common.days}. Pasangan berikut tidak
                dapat dipisahkan:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-traceInk/80">
                {state.requested.conflicts.slice(0, 5).map((conflict) => (
                  <li key={`${conflict.a}-${conflict.b}-${conflict.requiredHours}`}>
                    {describeConflict(conflict)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.outcome !== null && state.outcome.type === 'fit' && (
            <ConstituentTable
              dict={dict}
              constants={state.outcome.constants}
              unresolved={state.dropped}
            />
          )}

          <p className="control text-xs text-traceInk/60">
            Rekaman penuh: {recordLengthDays(record as TideRecord).toFixed(1)} {dict.common.days}.
            Jendela diambil dari awal rekaman.
          </p>
        </>
      )}
    </div>
  )
}
