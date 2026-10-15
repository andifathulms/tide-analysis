import Link from 'next/link'
import type { Dictionary, Locale } from '@/lib/i18n/dictionary'
import { stations, type StationSummary } from '@/lib/records/registry'
import type { TideType } from '@/lib/tide/formzahl'
import { FormzahlPill } from '@/components/ui'
import { formatDate, formatDays, type TimeZoneDisplay } from '@/lib/view/format'
import { STAGES, stageOf, viewsOf, type StationView } from '@/lib/view/stages'

export type { StationView }

/**
 * The four stages of the station workspace: Rekam → Urai → Uji → Ramal.
 *
 * It replaced five equal tabs, which gave a newcomer no sign that the views
 * are a sequence, or that Resolusi and Banding are both checks. The routes are
 * unchanged; a stage links to its first view, and Uji's two views get a
 * second row of their own.
 *
 * One element, two placements: a row of four on wider screens, and a bar
 * fixed to the bottom on a phone, where five tabs used to scroll sideways
 * under the header with the last one usually off-screen. `data-stage-bar`
 * lets globals.css reserve the space it covers at the foot of the page.
 */
export function StageNav({
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
  const activeStage = stageOf(active)

  return (
    <div className="space-y-3">
      <nav
        aria-label={dict.shell.stages}
        data-stage-bar=""
        className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:z-auto sm:border-t-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none"
      >
        <ol className="grid grid-cols-4 sm:overflow-hidden sm:rounded-card sm:border sm:border-rule sm:bg-surface sm:shadow-card">
          {STAGES.map((stage, index) => {
            const current = stage === activeStage
            const view = viewsOf(stage)[0] ?? 'catatan'
            return (
              <li key={stage} className="min-w-0 sm:border-r sm:border-rule sm:last:border-r-0">
                <Link
                  href={`/${locale}/${view}/${stationId}`}
                  aria-current={current ? 'page' : undefined}
                  className={`relative flex min-w-0 flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 transition-colors duration-150 ease-tide sm:items-start sm:px-4 sm:py-3 ${
                    current ? 'text-ink sm:bg-sunken/70' : 'text-inkFaint hover:bg-sunken/60 hover:text-ink'
                  }`}
                >
                  <span
                    className={`numeric flex h-6 w-6 items-center justify-center rounded-lg border text-micro sm:h-auto sm:w-auto sm:rounded-none sm:border-0 ${
                      current
                        ? 'border-ink bg-ink text-surface sm:bg-transparent sm:text-ink'
                        : 'border-rule'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-micro font-semibold sm:text-body sm:font-bold">
                    {dict.stages[stage].title}
                  </span>
                  <span className="hidden w-full truncate text-caption text-inkFaint md:block">
                    {dict.stages[stage].detail}
                  </span>
                  {current && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 hidden h-[3px] bg-ink sm:block"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>

      {activeStage === 'uji' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="eyebrow">{dict.shell.checks}</span>
          <ul className="inline-flex rounded-full border border-rule bg-surface p-0.5">
            {viewsOf('uji').map((view) => {
              const current = view === active
              return (
                <li key={view}>
                  <Link
                    href={`/${locale}/${view}/${stationId}`}
                    aria-current={current ? 'page' : undefined}
                    className={`inline-block rounded-full px-3.5 py-1 text-caption transition-colors duration-150 ease-tide ${
                      current ? 'bg-ink font-semibold text-surface' : 'text-inkMuted hover:text-ink'
                    }`}
                  >
                    {dict.nav[view]}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Change port without leaving the stage: Benoa · Urai to Ambon · Urai in one
 * click. A native <details>, so it opens and closes with no script and is
 * keyboard-operable as it stands.
 */
function StationSwitcher({
  dict,
  locale,
  view,
  stationId,
}: {
  dict: Dictionary
  locale: Locale
  view: StationView
  stationId: string
}) {
  const list = [...stations()].sort((a, b) => a.stationName.localeCompare(b.stationName))
  return (
    <details className="group relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1 text-caption font-semibold text-inkMuted transition-colors duration-150 ease-tide hover:border-ink hover:text-ink [&::-webkit-details-marker]:hidden">
        {dict.shell.switchStation}
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 transition-transform duration-150 ease-tide group-open:rotate-180"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <ul className="absolute left-0 z-30 mt-2 w-72 max-w-[calc(100vw-2*var(--space-gutter))] overflow-hidden rounded-card border border-rule bg-surface py-1 shadow-raised">
        {list.map((station) => {
          const current = station.stationId === stationId
          return (
            <li key={station.stationId}>
              <Link
                href={`/${locale}/${view}/${station.stationId}`}
                aria-current={current ? 'page' : undefined}
                className={`flex items-center justify-between gap-3 px-3.5 py-2 text-caption hover:bg-sunken ${
                  current ? 'font-semibold text-ink' : 'text-inkMuted hover:text-ink'
                }`}
              >
                {station.stationName}
                {current && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

/**
 * Provenance, on the face of every station view: source, licence, period,
 * datum. A record that cannot say where it came from does not belong here.
 */
export function StationHeader({
  dict,
  locale,
  view,
  station,
  datumLabel,
  datumNote,
  zone,
  gapHours,
  character,
}: {
  dict: Dictionary
  locale: Locale
  view: StationView
  station: StationSummary
  datumLabel: string
  datumNote?: string
  zone: TimeZoneDisplay
  gapHours: number
  character?: { readonly type: TideType; readonly label: string; readonly value: number }
}) {
  return (
    <header className="space-y-4">
      <p className="text-caption text-inkFaint">
        <Link href={`/${locale}#stasiun`} className="hover:text-ink hover:underline">
          {dict.shell.stations}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{dict.nav[view]}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="text-headline sm:text-display">{station.stationName}</h1>
        <StationSwitcher dict={dict} locale={locale} view={view} stationId={station.stationId} />
      </div>

      {character !== undefined && (
        <FormzahlPill type={character.type} label={character.label} value={character.value} />
      )}

      {/* Four facts, ruled apart: the gap-px grid draws the rules from its
          own background, so no cell needs to know where it sits. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-rule bg-rule text-caption lg:grid-cols-4">
        <div className="col-span-2 bg-surface px-4 py-3 lg:col-span-1">
          <dt className="eyebrow">{dict.common.period}</dt>
          <dd className="numeric mt-0.5 text-body">
            {formatDate(station.startSec, zone)} — {formatDate(station.endSec, zone)}
            <span className="ml-2 text-inkFaint">
              {formatDays(station.lengthDays)} {dict.common.days}
            </span>
          </dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="eyebrow">{dict.common.datum}</dt>
          <dd className="mt-0.5 text-body">{datumLabel}</dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="eyebrow">{dict.common.gaps}</dt>
          <dd className="numeric mt-0.5 text-body">
            {station.gapCount}
            <span className="ml-2 text-inkFaint">{gapHours.toFixed(0)} jam</span>
          </dd>
        </div>
        <div className="col-span-2 bg-surface px-4 py-3 lg:col-span-1">
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
