import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, Callout, Card, Scroller, Section } from '@/components/ui'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { resolvableSubset, separationLadder } from '@/lib/tide/rayleigh'
import { formatDays } from '@/lib/view/format'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * Deployment lengths someone actually chooses, not a smooth sweep. A month is
 * the common Indonesian survey; fifteen days is what gets proposed when the
 * budget is tight; half a year is the one that finally separates K1 from P1
 * and S2 from K2, which is the whole argument.
 */
const SURVEY_DAYS = [1, 7, 15, 29, 90, 183, 365] as const

export default function LadderPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const dict = dictionary(locale)

  const ladder = separationLadder(STANDARD_SET)
  const surveys = SURVEY_DAYS.map((days) => ({
    days,
    ...resolvableSubset(STANDARD_SET, days * 24),
  }))
  const list = stations()

  return (
    <div className="space-y-section">
      {/* Section always emits an h2, so a page built only from Sections has no
          h1 at all. Every other page type carries one — the home page, the
          method page, and the station pages through StationHeader. */}
      <header className="max-w-reading space-y-3">
        <p className="eyebrow">{dict.resolusi.eyebrow}</p>
        <h1 className="text-display">{dict.resolusi.ladderTitle}</h1>
        <p className="text-lead text-inkMuted">{dict.resolusi.ladderLead}</p>
      </header>

      {/* The one page on the site that needs no station, and says so — the
          universal half of PRD §1 made into an object rather than asserted. */}
      <Callout tone="note">
        <p className="max-w-reading">{dict.resolusi.ladderUniversal}</p>
      </Callout>

      <Section title={dict.resolusi.surveyTitle} lead={dict.resolusi.surveyLead}>
        <Scroller>
          <table className="w-full min-w-[520px] border-collapse text-caption">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="eyebrow py-2 pr-4">{dict.resolusi.surveyLength}</th>
                <th className="eyebrow py-2 pr-4">{dict.resolusi.surveyKept}</th>
                <th className="eyebrow py-2">{dict.resolusi.surveyLost}</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.days} className="border-b border-rule/60 align-baseline">
                  <td className="numeric py-2 pr-4 whitespace-nowrap">
                    {survey.days} {dict.common.days}
                  </td>
                  <td className="numeric py-2 pr-4">
                    {survey.kept.length > 0 ? (
                      <>
                        <span className="text-prediction">{survey.kept.join(' ')}</span>{' '}
                        <span className="text-inkFaint">({survey.kept.length}/10)</span>
                      </>
                    ) : (
                      <span className="text-inkFaint">{dict.resolusi.surveyNone}</span>
                    )}
                  </td>
                  <td className="numeric py-2 text-unresolved">
                    {survey.dropped.map((d) => d.name).join(' ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroller>
      </Section>

      <Section title={dict.resolusi.ladderFullTitle}>
        <Scroller>
          <table className="w-full min-w-[520px] border-collapse text-caption">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="eyebrow py-2 pr-4">{dict.resolusi.ladderPair}</th>
                <th className="eyebrow py-2 pr-4 text-right">
                  {dict.resolusi.ladderSeparation}
                </th>
                <th className="eyebrow py-2 text-right">{dict.resolusi.ladderRequired}</th>
              </tr>
            </thead>
            <tbody className="numeric">
              {ladder.map((rung) => (
                <tr
                  key={`${rung.a}-${rung.b ?? 'Z0'}`}
                  className="border-b border-rule/60 hover:bg-sunken/50"
                >
                  <td className="py-1.5 pr-4">
                    {rung.b === null ? (
                      <>
                        {rung.a}{' '}
                        <span className="text-caption text-inkFaint">
                          {dict.resolusi.ladderAgainstMean}
                        </span>
                      </>
                    ) : (
                      `${rung.a} / ${rung.b}`
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-right text-inkMuted">
                    {rung.separationDegPerHour.toFixed(4)}
                  </td>
                  <td className="py-1.5 text-right">{formatDays(rung.requiredDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroller>
      </Section>

      {list.length > 0 && (
        <Section title={dict.resolusi.perStationTitle} lead={dict.resolusi.perStationLead}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((station) => (
              <Card as="li" key={station.stationId}>
                <Link
                  href={`/${locale}/resolusi/${station.stationId}`}
                  className="prose-serif text-title text-ink hover:text-prediction"
                >
                  {station.stationName}
                </Link>
                <p className="mt-2">
                  <Badge>
                    {formatDays(station.lengthDays)} {dict.common.days}
                  </Badge>
                </p>
              </Card>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
