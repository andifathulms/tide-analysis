import Link from 'next/link'
import type { Dictionary, Locale } from '@/lib/i18n/dictionary'
import type { StationSummary } from '@/lib/records/registry'
import { formatDate, formatDays, type TimeZoneDisplay } from '@/lib/view/format'

const VIEWS = ['catatan', 'komponen', 'resolusi', 'banding', 'prediksi'] as const
export type StationView = (typeof VIEWS)[number]

export function StationNav({
  dict,
  locale,
  stationId,
  active,
}: {
  dict: Dictionary
  locale: Locale
  stationId: string
  active: StationView
}) {
  return (
    <nav className="control flex flex-wrap gap-x-5 gap-y-1 border-b border-grid pb-2 text-sm">
      {VIEWS.map((view) => (
        <Link
          key={view}
          href={`/${locale}/${view}/${stationId}`}
          className={
            view === active
              ? 'border-b-2 border-prediction pb-1 font-medium text-prediction'
              : 'pb-1 text-traceInk/70 hover:text-prediction'
          }
        >
          {dict.nav[view]}
        </Link>
      ))}
    </nav>
  )
}

/**
 * Provenance, on the face of every station view: source, licence, period,
 * datum. A record that cannot say where it came from does not belong here.
 */
export function StationHeader({
  dict,
  station,
  datumLabel,
  datumNote,
  zone,
  gapHours,
}: {
  dict: Dictionary
  station: StationSummary
  datumLabel: string
  datumNote?: string
  zone: TimeZoneDisplay
  gapHours: number
}) {
  return (
    <section className="mt-4">
      <h1 className="text-2xl font-medium">{station.stationName}</h1>
      <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
            {dict.common.source}
          </dt>
          <dd>{station.sourceName}</dd>
        </div>
        <div>
          <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
            {dict.common.period}
          </dt>
          <dd className="numeric">
            {formatDate(station.startSec, zone)} — {formatDate(station.endSec, zone)} (
            {formatDays(station.lengthDays)} {dict.common.days})
          </dd>
        </div>
        <div>
          <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
            {dict.common.datum}
          </dt>
          <dd>{datumLabel}</dd>
        </div>
        <div>
          <dt className="control text-xs uppercase tracking-wide text-traceInk/60">
            {dict.common.gaps}
          </dt>
          <dd className="numeric">
            {station.gapCount} ({gapHours.toFixed(0)} jam)
          </dd>
        </div>
      </dl>
      {datumNote !== undefined && (
        <p className="mt-2 max-w-3xl text-xs text-traceInk/70">{datumNote}</p>
      )}
      <p className="mt-1 max-w-3xl text-xs text-traceInk/60">
        {dict.common.licence}: {station.licence} · {station.attribution}
      </p>
    </section>
  )
}
