import { notFound } from 'next/navigation'
import { ConstituentExplorer } from '@/components/ConstituentExplorer'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { FitDiagnostics, RefusalNotice } from '@/components/Diagnostics'
import { NavigationWarning } from '@/components/NavigationWarning'
import { StationHeader, StationNav } from '@/components/StationNav'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { PUBLISHED_INDONESIAN_FORMZAHL } from '@/lib/tide/formzahl'
import { analyseStation } from '@/lib/view/station'
import { zoneOf } from '@/lib/view/format'

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    stations().map((station) => ({ locale, station: station.stationId })),
  )
}

export default async function ConstituentsPage({
  params,
}: {
  params: { locale: string; station: string }
}) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const analysis = await analyseStation(params.station)
  if (analysis === null) notFound()
  const { station, record, primary, fallback, summary } = analysis
  const shown = primary.outcome.type === 'fit' ? primary : (fallback?.analysis ?? primary)

  return (
    <div className="space-y-6">
      <StationNav dict={dict} locale={locale} stationId={station.stationId} active="komponen" />
      <StationHeader
        dict={dict}
        station={station}
        datumLabel={record.datum.label}
        datumNote={record.datum.note}
        zone={zoneOf(record)}
        gapHours={summary.gapHours}
      />
      <NavigationWarning dict={dict} />

      <h1 className="text-2xl">{dict.komponen.title}</h1>
      <p className="max-w-3xl">{dict.komponen.lead}</p>

      {primary.outcome.type === 'refusal' && <RefusalNotice dict={dict} refusal={primary.outcome} />}

      {shown.outcome.type === 'fit' && (
        <>
          <FitDiagnostics dict={dict} fit={shown.outcome} />
          <ConstituentTable
            dict={dict}
            constants={shown.outcome.constants}
            unresolved={fallback?.dropped ?? []}
          />

          {shown.formzahl !== null && (
            <section className="space-y-3">
              <h2 className="text-xl">{dict.komponen.formzahlTitle}</h2>
              <div className="card flex flex-wrap items-baseline gap-x-8 gap-y-2 p-4">
                <p className="numeric text-4xl text-prediction">
                  {shown.formzahl.value.toFixed(3)}
                </p>
                <div>
                  <p className="text-lg">{shown.formzahl.label}</p>
                  <p className="text-sm text-traceInk/70">{shown.formzahl.description}</p>
                </div>
                <p className="numeric text-xs text-traceInk/60">
                  F = (K1 + O1) / (M2 + S2) = ({shown.formzahl.amplitudes.K1.toFixed(3)} +{' '}
                  {shown.formzahl.amplitudes.O1.toFixed(3)}) / (
                  {shown.formzahl.amplitudes.M2.toFixed(3)} +{' '}
                  {shown.formzahl.amplitudes.S2.toFixed(3)})
                </p>
              </div>

              <h3 className="control text-sm uppercase tracking-wide text-traceInk/60">
                {dict.komponen.publishedTitle}
              </h3>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {PUBLISHED_INDONESIAN_FORMZAHL.map((published) => (
                  <li key={published.place} className="card p-3">
                    <span className="font-medium">{published.place}</span>{' '}
                    <span className="numeric">
                      {published.value === null ? '—' : published.value.toFixed(3)}
                    </span>
                    <span className="block text-xs text-traceInk/70">
                      {published.stated} · {published.citation}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="max-w-3xl text-xs text-traceInk/60">
                Nilai terbit di atas hanya untuk pembanding. Tidak satu pun dipakai sebagai masukan
                bagi angka yang dihitung di halaman ini.
              </p>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xl">{dict.komponen.explorerTitle}</h2>
            <p className="max-w-3xl">{dict.komponen.explorerLead}</p>
            <ConstituentExplorer dict={dict} stationId={station.stationId} fit={shown.outcome} />
          </section>
        </>
      )}
    </div>
  )
}
