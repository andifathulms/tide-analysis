import Link from 'next/link'
import type { Dictionary, Locale } from '@/lib/i18n/dictionary'
import type { TideType } from '@/lib/tide/formzahl'

export interface FormzahlRow {
  readonly stationId: string
  readonly stationName: string
  readonly value: number
  readonly label: string
  readonly description: string
  readonly type: TideType
  readonly M2: number
  readonly S2: number
  readonly K1: number
  readonly O1: number
}

/** Where each class sits on the scale, for the ruled strip below. */
const SCALE_MAX = 4
const BOUNDARIES = [0.25, 1.5, 3.0]

/**
 * Four ports, four shapes, one physics (PRD §6.4).
 *
 * Every number here came out of a least-squares fit to that station's own
 * record. The classification is computed, not quoted — which is the whole
 * point: the same equations produce four different characters because four
 * coastlines do four different things to the same forcing.
 */
export function FormzahlComparison({
  dict,
  locale,
  rows,
}: {
  dict: Dictionary
  locale: Locale
  rows: readonly FormzahlRow[]
}) {
  const position = (value: number): number => Math.min((value / SCALE_MAX) * 100, 100)

  return (
    <section className="space-y-4">
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[560px] border-collapse text-caption">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="eyebrow py-2 pr-4">{dict.common.station}</th>
              <th className="eyebrow py-2 pr-4 text-right">F</th>
              <th className="eyebrow py-2 pr-4">Tipe</th>
              <th className="eyebrow py-2 pr-4 text-right">M2</th>
              <th className="eyebrow py-2 pr-4 text-right">S2</th>
              <th className="eyebrow py-2 pr-4 text-right">K1</th>
              <th className="eyebrow py-2 text-right">O1</th>
            </tr>
          </thead>
          <tbody className="numeric">
            {rows.map((row) => (
              <tr key={row.stationId} className="border-b border-rule/60 hover:bg-sunken/50">
                <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                  <Link
                    href={`/${locale}/komponen/${row.stationId}`}
                    className="hover:text-prediction"
                  >
                    {row.stationName}
                  </Link>
                </th>
                <td className="py-1.5 pr-4 text-right text-prediction">{row.value.toFixed(3)}</td>
                <td className="py-1.5 pr-4 text-caption text-inkMuted">
                  {dict.tideType[row.type].label}
                </td>
                <td className="py-1.5 pr-4 text-right">{row.M2.toFixed(3)}</td>
                <td className="py-1.5 pr-4 text-right">{row.S2.toFixed(3)}</td>
                <td className="py-1.5 pr-4 text-right">{row.K1.toFixed(3)}</td>
                <td className="py-1.5 text-right">{row.O1.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The scale itself, ruled like the chart, with each station on it. */}
      <div className="card px-5 pb-9 pt-6">
        <div className="relative h-px w-full bg-rule">
          {BOUNDARIES.map((boundary) => (
            <span
              key={boundary}
              className="absolute -top-2 h-4 w-px bg-grid"
              style={{ left: `${position(boundary)}%` }}
            >
              <span className="numeric absolute -left-3 top-5 text-micro text-inkFaint">
                {boundary}
              </span>
            </span>
          ))}
          {rows.map((row) => (
            <span
              key={row.stationId}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-surface bg-prediction"
              style={{ left: `${position(row.value)}%`, top: -5 }}
              title={`${row.stationName} — F = ${row.value.toFixed(3)}`}
            />
          ))}
        </div>
        <div className="mt-9 flex justify-between text-micro uppercase tracking-wider text-inkFaint">
          <span>harian ganda</span>
          <span>campuran → ganda</span>
          <span>campuran → tunggal</span>
          <span>harian tunggal</span>
        </div>
      </div>
    </section>
  )
}
