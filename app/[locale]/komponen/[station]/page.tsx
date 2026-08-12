import { notFound } from 'next/navigation'
import { AsymmetryPanel } from '@/components/AsymmetryPanel'
import { ConstituentExplorer } from '@/components/ConstituentExplorer'
import { ConstituentTable } from '@/components/table/ConstituentTable'
import { FitDiagnostics, RefusalNotice } from '@/components/Diagnostics'
import { NavigationWarning } from '@/components/NavigationWarning'
import { StationHeader, StationNav } from '@/components/StationNav'
import { Caption, Card, Section, Stat } from '@/components/ui'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { analyseAsymmetry } from '@/lib/tide/asymmetry'
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

  const asymmetry =
    shown.outcome.type === 'fit'
      ? analyseAsymmetry({
          constants: shown.outcome.constants.map((c) => ({
            name: c.name,
            amplitudeM: c.amplitudeM,
            phaseDeg: c.phaseDeg,
          })),
          meanLevelM: shown.outcome.meanLevelM,
          startSec: shown.outcome.windowStartSec,
          endSec: shown.outcome.windowStartSec + 60 * 86400,
        })
      : null

  return (
    <div className="space-y-8">
      <StationNav dict={dict} locale={locale} stationId={station.stationId} active="komponen" />
      <StationHeader
        dict={dict}
        station={station}
        datumLabel={record.datum.label}
        datumNote={record.datum.note}
        zone={zoneOf(record)}
        gapHours={summary.gapHours}
        character={analysis.character?.label}
      />
      <NavigationWarning dict={dict} compact />

      {primary.outcome.type === 'refusal' && <RefusalNotice dict={dict} refusal={primary.outcome} />}

      {shown.outcome.type === 'fit' && (
        <>
          <Section
            eyebrow={dict.komponen.eyebrow}
            title={dict.komponen.title}
            lead={dict.komponen.lead}
          >
            <FitDiagnostics dict={dict} fit={shown.outcome} />
            <ConstituentTable
              dict={dict}
              constants={shown.outcome.constants}
              unresolved={fallback?.dropped ?? []}
            />
            <Caption>{dict.komponen.tableCaption}</Caption>
          </Section>

          {analysis.character !== null && (
            <Section
              eyebrow={dict.home.characterEyebrow}
              title={dict.komponen.formzahlTitle}
              lead={analysis.character.description}
            >
              <Card className="flex flex-wrap items-end gap-x-10 gap-y-5">
                <Stat
                  label="Formzahl F"
                  value={analysis.character.value.toFixed(3)}
                  tone="prediction"
                  size="large"
                  note={analysis.character.label}
                />
                <p className="numeric text-caption text-inkFaint">
                  F = (K1 + O1) / (M2 + S2) = ({analysis.character.amplitudes.K1.toFixed(3)} +{' '}
                  {analysis.character.amplitudes.O1.toFixed(3)}) / (
                  {analysis.character.amplitudes.M2.toFixed(3)} +{' '}
                  {analysis.character.amplitudes.S2.toFixed(3)})
                </p>
              </Card>

              <div>
                <p className="eyebrow mb-2">{dict.komponen.publishedTitle}</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {PUBLISHED_INDONESIAN_FORMZAHL.map((published) => (
                    <li
                      key={published.place}
                      className="flex items-baseline justify-between gap-4 border-b border-rule pb-2 text-caption"
                    >
                      <span className="font-medium text-ink">{published.place}</span>
                      <span className="numeric text-inkMuted">
                        {published.value === null ? '—' : published.value.toFixed(3)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Caption>
                  Nilai terbit di atas hanya pembanding. Tidak satu pun dipakai sebagai masukan bagi
                  angka yang dihitung di halaman ini.
                </Caption>
              </div>
            </Section>
          )}

          {asymmetry !== null && (
            <Section
              eyebrow={dict.komponen.asymmetryEyebrow}
              title={dict.komponen.asymmetryTitle}
              lead={dict.komponen.asymmetryLead}
            >
              <AsymmetryPanel dict={dict} asymmetry={asymmetry} />
            </Section>
          )}

          <Section
            eyebrow="Interaktif"
            title={dict.komponen.explorerTitle}
            lead={dict.komponen.explorerLead}
          >
            <ConstituentExplorer dict={dict} stationId={station.stationId} fit={shown.outcome} />
          </Section>
        </>
      )}
    </div>
  )
}
