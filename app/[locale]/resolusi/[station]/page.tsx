import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { CoveragePanel } from '@/components/CoveragePanel'
import { RayleighResults } from '@/components/RayleighResults'
import { RayleighSlider } from '@/components/RayleighSlider'
import { StationHeader, StationNav } from '@/components/StationNav'
import { Section } from '@/components/ui'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations, stationSummary } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { coverageSweep } from '@/lib/tide/coverage'
import { separationLadder } from '@/lib/tide/rayleigh'
import { pageMetadata } from '@/lib/view/metadata'
import { analyseStation } from '@/lib/view/station'
import { analyseWindow, DEFAULT_WINDOW_DAYS } from '@/lib/view/window'
import { formatDays, zoneOf } from '@/lib/view/format'

export async function generateMetadata({
  params,
}: {
  params: { locale: string; station: string }
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {}
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  const station = stationSummary(params.station)
  if (station === undefined) return {}

  // The station's name and this view's own heading and lead — the same strings
  // the page renders, so the card cannot drift from the page.
  return pageMetadata({
    locale,
    path: `resolusi/${station.stationId}`,
    title: `${station.stationName} — ${dict.resolusi.title}`,
    // Prefixed with the station, which is this page's own h1 — otherwise
    // every station shares one view's lead and sixteen pages describe
    // themselves identically.
    description: `${station.stationName}. ${dict.resolusi.lead}`,
  })
}

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    stations().map((station) => ({ locale, station: station.stationId })),
  )
}

export default async function ResolutionPage({
  params,
}: {
  params: { locale: string; station: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const summary = stationSummary(params.station)
  if (summary === undefined) notFound()
  const analysis = await analyseStation(params.station)
  if (analysis === null) notFound()

  // The six longest rungs of the standard set — the ones that decide whether a
  // record of this length is long enough at all.
  const worstPairs = separationLadder(STANDARD_SET)
    .filter((rung) => rung.b !== null)
    .slice(0, 6)

  const defaultDays = Math.min(DEFAULT_WINDOW_DAYS, Math.round(summary.lengthDays))
  const defaultWindow = analyseWindow(analysis.record, defaultDays)

  // The second axis. Only the constituents this record actually supports go
  // in, so the sweep measures coverage rather than re-measuring the refusal.
  const fit = analysis.primary.outcome.type === 'fit' ? analysis.primary.outcome : null
  const coverage =
    fit === null
      ? []
      : coverageSweep({
          timesSec: analysis.record.timesSec,
          constituents: fit.constants.map((c) => c.name),
          nodalEpochSec: fit.nodalEpochSec,
        })

  return (
    <div className="space-y-section">
      {/*
       * The page's masthead: which station, which view, and the warning that
       * invariant 15 requires wherever a predicted height appears. One cluster
       * at a tight rhythm, so the section rhythm below can be generous without
       * pulling these three apart.
       */}
      <div className="space-y-4">
        <StationNav dict={dict} locale={locale} stationId={summary.stationId} active="resolusi" />
        <StationHeader
          dict={dict}
          station={summary}
          datumLabel={analysis.record.datum.label}
          zone={zoneOf(analysis.record)}
          gapHours={analysis.summary.gapHours}
        />
        <NavigationWarning dict={dict} compact />
      </div>

      <Section eyebrow={dict.resolusi.eyebrow} title={dict.resolusi.title} lead={dict.resolusi.lead} />

      {/*
       * The default window is computed here, so the page states PRD §6.3's
       * argument in the HTML rather than waiting for the record to download.
       */}
      <RayleighSlider
        dict={dict}
        stationId={summary.stationId}
        maxDays={Math.floor(summary.lengthDays)}
        initialDays={defaultDays}
        fullLengthDays={summary.lengthDays}
      >
        <RayleighResults dict={dict} state={defaultWindow} />
      </RayleighSlider>

      {coverage.length > 0 && (
        <Section title={dict.resolusi.coverageTitle} lead={dict.resolusi.coverageLead}>
          <CoveragePanel dict={dict} points={coverage} />
        </Section>
      )}

      {/* The worst rungs of the universal ladder, against this record's own
          length. The full ladder, and the survey lengths that clear it, live
          at /resolusi — it needs no station, so it does not belong here. */}
      <section className="max-w-reading">
        <h2 className="text-headline">{dict.resolusi.ladderStationTitle}</h2>
        <p className="mt-1 text-caption text-inkMuted">{dict.resolusi.ladderLead}</p>
        <table className="mt-3 w-full border-collapse text-caption">
          <thead>
            <tr className="border-b border-rule text-left">
              <th scope="col" className="eyebrow py-2">{dict.resolusi.ladderPair}</th>
              <th scope="col" className="eyebrow py-2 text-right">{dict.resolusi.ladderRequired}</th>
            </tr>
          </thead>
          <tbody className="numeric">
            {worstPairs.map((rung) => (
              <tr key={`${rung.a}-${rung.b}`} className="border-b border-rule/60">
                <td className="py-1.5">
                  {rung.a} / {rung.b}
                </td>
                <td
                  className={`py-1.5 text-right ${
                    rung.requiredDays > summary.lengthDays ? 'text-unresolved' : 'text-inkMuted'
                  }`}
                >
                  {formatDays(rung.requiredDays)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-caption text-inkFaint">
          <Link
            href={`/${locale}/resolusi`}
            className="text-prediction underline underline-offset-4 hover:text-ink"
          >
            {dict.resolusi.ladderTitle}
          </Link>
        </p>
      </section>
    </div>
  )
}
