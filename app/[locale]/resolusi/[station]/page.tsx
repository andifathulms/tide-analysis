import { notFound } from 'next/navigation'
import { NavigationWarning } from '@/components/NavigationWarning'
import { RayleighSlider } from '@/components/RayleighSlider'
import { StationHeader, StationNav } from '@/components/StationNav'
import { Section } from '@/components/ui'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations, stationSummary } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { requiredHoursFor } from '@/lib/tide/rayleigh'
import { analyseStation } from '@/lib/view/station'
import { zoneOf } from '@/lib/view/format'

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    stations().map((station) => ({ locale, station: station.stationId })),
  )
}

/** The pairs that decide how long a record has to be, worst first. */
function tightestPairs(limit: number) {
  const pairs: Array<{ a: string; b: string; days: number }> = []
  for (let i = 0; i < STANDARD_SET.length; i += 1) {
    for (let j = i + 1; j < STANDARD_SET.length; j += 1) {
      const a = STANDARD_SET[i]!
      const b = STANDARD_SET[j]!
      pairs.push({ a, b, days: requiredHoursFor(a, b) / 24 })
    }
  }
  return pairs.sort((x, y) => y.days - x.days).slice(0, limit)
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

      <Section eyebrow="Batas" title={dict.resolusi.title} lead={dict.resolusi.lead} />

      <RayleighSlider
        dict={dict}
        stationId={summary.stationId}
        maxDays={Math.floor(summary.lengthDays)}
      />

      <section className="max-w-reading">
        <h2 className="text-headline">Pasangan yang menentukan panjang rekaman</h2>
        <p className="mt-1 text-caption text-inkMuted">
          T = 360° / |σᵢ − σⱼ|. Semakin dekat dua kecepatan, semakin panjang rekaman yang
          dibutuhkan untuk memisahkannya.
        </p>
        <table className="mt-3 w-full border-collapse text-caption">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="py-2">Pasangan</th>
              <th className="py-2 text-right">Panjang minimum (hari)</th>
            </tr>
          </thead>
          <tbody className="numeric">
            {tightestPairs(6).map((pair) => (
              <tr key={`${pair.a}-${pair.b}`} className="border-b border-rule/60">
                <td className="py-1.5">
                  {pair.a} / {pair.b}
                </td>
                <td className="py-1.5 text-right">{pair.days.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
