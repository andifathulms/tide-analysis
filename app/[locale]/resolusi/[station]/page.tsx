import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { CoveragePanel } from '@/components/CoveragePanel'
import { RayleighSlider } from '@/components/RayleighSlider'
import { StationHeader, StationNav } from '@/components/StationNav'
import { Section } from '@/components/ui'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations, stationSummary } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { coverageSweep } from '@/lib/tide/coverage'
import { separationLadder } from '@/lib/tide/rayleigh'
import { analyseStation } from '@/lib/view/station'
import { formatDays, zoneOf } from '@/lib/view/format'

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
    <div className="space-y-8">
      <StationNav dict={dict} locale={locale} stationId={summary.stationId} active="resolusi" />
      <StationHeader
        dict={dict}
        station={summary}
        datumLabel={analysis.record.datum.label}
        zone={zoneOf(analysis.record)}
        gapHours={analysis.summary.gapHours}
      />
      <NavigationWarning dict={dict} compact />

      <Section eyebrow={dict.resolusi.eyebrow} title={dict.resolusi.title} lead={dict.resolusi.lead} />

      <RayleighSlider
        dict={dict}
        stationId={summary.stationId}
        maxDays={Math.floor(summary.lengthDays)}
      />

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
              <th className="eyebrow py-2">{dict.resolusi.ladderPair}</th>
              <th className="eyebrow py-2 text-right">{dict.resolusi.ladderRequired}</th>
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
