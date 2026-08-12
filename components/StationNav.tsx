import Link from 'next/link'
import type { Dictionary, Locale } from '@/lib/i18n/dictionary'
import type { StationSummary } from '@/lib/records/registry'
import { Badge } from '@/components/ui'
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
    <nav
      aria-label={dict.common.station}
      className="-mx-5 overflow-x-auto border-b border-rule px-5"
    >
      <ul className="flex min-w-max gap-1 pb-px">
        {VIEWS.map((view) => {
          const current = view === active
          return (
            <li key={view}>
              <Link
                href={`/${locale}/${view}/${stationId}`}
                aria-current={current ? 'page' : undefined}
                className={`inline-block border-b-2 px-3 py-2.5 text-caption ${
                  current
                    ? 'border-prediction font-medium text-prediction'
                    : 'border-transparent text-inkMuted hover:border-rule hover:text-ink'
                }`}
              >
                {dict.nav[view]}
              </Link>
            </li>
          )
        })}
      </ul>
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
  character,
}: {
  dict: Dictionary
  station: StationSummary
  datumLabel: string
  datumNote?: string
  zone: TimeZoneDisplay
  gapHours: number
  character?: string
}) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h1 className="text-headline sm:text-display">{station.stationName}</h1>
        {character !== undefined && <Badge tone="prediction">{character}</Badge>}
      </div>

      <dl className="grid gap-x-8 gap-y-3 text-caption sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="eyebrow">{dict.common.period}</dt>
          <dd className="numeric mt-0.5 text-body">
            {formatDate(station.startSec, zone)} — {formatDate(station.endSec, zone)}
            <span className="ml-2 text-inkFaint">
              {formatDays(station.lengthDays)} {dict.common.days}
            </span>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">{dict.common.datum}</dt>
          <dd className="mt-0.5 text-body">{datumLabel}</dd>
        </div>
        <div>
          <dt className="eyebrow">{dict.common.gaps}</dt>
          <dd className="numeric mt-0.5 text-body">
            {station.gapCount}
            <span className="ml-2 text-inkFaint">{gapHours.toFixed(0)} jam</span>
          </dd>
        </div>
        <div>
          <dt className="eyebrow">{dict.common.source}</dt>
          <dd className="mt-0.5 text-body">{station.sourceName}</dd>
        </div>
      </dl>

      <details className="text-caption text-inkFaint">
        <summary className="cursor-pointer text-inkMuted hover:text-ink">
          {dict.common.provenance}
        </summary>
        <div className="mt-2 max-w-reading space-y-1.5">
          {datumNote !== undefined && <p>{datumNote}</p>}
          <p>
            {dict.common.licence}: {station.licence}
          </p>
          <p>{station.attribution}</p>
        </div>
      </details>
    </header>
  )
}
