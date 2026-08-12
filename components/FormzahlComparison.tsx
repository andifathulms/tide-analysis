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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="control border-b border-grid text-left text-xs uppercase tracking-wide">
              <th className="py-2 pr-4">{dict.common.station}</th>
              <th className="py-2 pr-4 text-right">F</th>
              <th className="py-2 pr-4">Tipe</th>
              <th className="py-2 pr-4 text-right">M2</th>
              <th className="py-2 pr-4 text-right">S2</th>
              <th className="py-2 pr-4 text-right">K1</th>
              <th className="py-2 text-right">O1</th>
            </tr>
          </thead>
          <tbody className="numeric">
            {rows.map((row) => (
              <tr key={row.stationId} className="border-b border-grid/50">
                <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                  <Link
                    href={`/${locale}/komponen/${row.stationId}`}
                    className="hover:text-prediction"
                  >
                    {row.stationName}
                  </Link>
                </th>
                <td className="py-1.5 pr-4 text-right text-prediction">{row.value.toFixed(3)}</td>
                <td className="control py-1.5 pr-4 text-xs">{row.label}</td>
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
      <div className="card px-4 pb-8 pt-5">
        <div className="relative h-px w-full bg-grid">
          {BOUNDARIES.map((boundary) => (
            <span
              key={boundary}
              className="absolute -top-2 h-4 w-px bg-grid"
              style={{ left: `${position(boundary)}%` }}
            >
              <span className="numeric absolute -left-3 top-5 text-[10px] text-traceInk/50">
                {boundary}
              </span>
            </span>
          ))}
          {rows.map((row, index) => (
            <span
              key={row.stationId}
              className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-prediction"
              style={{ left: `${position(row.value)}%`, top: index % 2 === 0 ? -4 : -4 }}
              title={`${row.stationName} — F = ${row.value.toFixed(3)}`}
            />
          ))}
        </div>
        <div className="control mt-8 flex justify-between text-[10px] uppercase tracking-wide text-traceInk/60">
          <span>harian ganda</span>
          <span>campuran → ganda</span>
          <span>campuran → tunggal</span>
          <span>harian tunggal</span>
        </div>
      </div>
    </section>
  )
}
