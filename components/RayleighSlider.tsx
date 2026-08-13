'use client'

import { useEffect, useMemo, useState } from 'react'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { fill, type Dictionary } from '@/lib/i18n/dictionary'
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
      <div className="card p-5">
        <label className="block text-caption font-medium" htmlFor="window-days">
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
            className="w-full accent-prediction"
          />
          <output className="numeric w-28 shrink-0 text-right text-title">
            {days} {dict.common.days}
          </output>
        </div>
      </div>

      {/*
       * What the slider just did, for a reader who cannot see the cards below
       * it change (WCAG 4.1.3). <output> carries an implicit role="status", so
       * this needs no ARIA of its own — and it announces the summary, not the
       * table: reading ten rows on every tick of a slider is worse than
       * silence.
       */}
      <output className="sr-only">
        {state === null
          ? dict.common.loading
          : state.outcome !== null && state.outcome.type === 'fit'
            ? fill(dict.resolusi.status, {
                days,
                kappa: state.outcome.conditionNumber.toFixed(2),
                conditioning: dict.conditioning[state.outcome.conditioning],
                kept: state.kept.length,
                total: STANDARD_SET.length,
              })
            : fill(dict.resolusi.statusNone, { days })}
      </output>

      {state === null ? (
        <p className="text-caption text-inkFaint">{dict.common.loading}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <h3 className="eyebrow">
                {dict.resolusi.conditionTitle}
              </h3>
              <p
                className={`numeric text-display ${
                  state.outcome !== null && state.outcome.type === 'fit'
                    ? conditioningOf(state.outcome.conditionNumber) === 'buruk'
                      ? 'text-unresolved'
                      : conditioningOf(state.outcome.conditionNumber) === 'marginal'
                        ? 'text-residualText'
                        : 'text-prediction'
                    : 'text-unresolved'
                }`}
              >
                {state.outcome !== null && state.outcome.type === 'fit'
                  ? state.outcome.conditionNumber.toFixed(2)
                  : '—'}
              </p>
              {state.outcome !== null && state.outcome.type === 'fit' && (
                <p className="mt-1 text-caption text-inkFaint">
                  {dict.conditioning[state.outcome.conditioning]}
                </p>
              )}
            </div>

            <div className="card p-5">
              <h3 className="eyebrow">
                {dict.resolusi.keptTitle}
              </h3>
              <p className="numeric mt-1 text-caption leading-relaxed text-prediction">
                {state.kept.join(' · ') || '—'}
              </p>
            </div>

            <div className="card p-5">
              <h3 className="eyebrow">
                {dict.resolusi.droppedTitle}
              </h3>
              <p className="numeric mt-1 text-caption leading-relaxed text-unresolved">
                {state.dropped.map((d) => d.name).join(' · ') || '—'}
              </p>
            </div>
          </div>

          {state.requested.type === 'refusal' && (
            <section className="border-l-4 border-unresolved bg-unresolvedSoft/60 px-4 py-3">
              <h3 className="eyebrow text-unresolved">
                {dict.common.refusal}
              </h3>
              <p className="mt-1.5 text-body">
                Himpunan baku diminta pada jendela {days} {dict.common.days}. Pasangan berikut tidak
                dapat dipisahkan:
              </p>
              <ul className="mt-2 space-y-1 text-caption text-inkMuted">
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

          <p className="text-caption text-inkFaint">
            Rekaman penuh: {recordLengthDays(record as TideRecord).toFixed(1)} {dict.common.days}.
            Jendela diambil dari awal rekaman.
          </p>
        </>
      )}
    </div>
  )
}
