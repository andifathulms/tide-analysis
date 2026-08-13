import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BeatFigure } from '@/components/BeatFigure'
import { Badge, Callout, Card, Scroller, Section } from '@/components/ui'
import { RecoveryPanel } from '@/components/RecoveryPanel'
import { beatFigure } from '@/lib/chart/beat'
import { recoverySweep, RECOVERY_LENGTH_DAYS } from '@/lib/tide/recovery'
import { pageMetadata } from '@/lib/view/metadata'
import { dictionary, isLocale, LOCALES, type Locale } from '@/lib/i18n/dictionary'
import { stations } from '@/lib/records/registry'
import { STANDARD_SET } from '@/lib/tide/constituents'
import { resolvableSubset, separationLadder } from '@/lib/tide/rayleigh'
import { formatDays } from '@/lib/view/format'

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {}
  const locale = params.locale as Locale
  const dict = dictionary(locale)
  return pageMetadata({
    locale,
    path: 'resolusi',
    title: dict.resolusi.ladderTitle,
    description: dict.resolusi.ladderLead,
  })
}

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

  /*
   * The ladder is complete, but it is not uniformly interesting. Of its
   * fifty-five rungs, forty-two ask for under two days — and a record too
   * short to clear those cannot support a harmonic fit at all, since a single
   * constituent needs a full period just to separate from the mean level. As
   * one table they buried the thirteen rungs that decide how long a survey has
   * to run. Split, not truncated: nothing is hidden from the reader.
   */
  const DECIDING_DAYS = 2
  const ladder = separationLadder(STANDARD_SET)
  const deciding = ladder.filter((rung) => rung.requiredDays >= DECIDING_DAYS)
  const trivial = ladder.filter((rung) => rung.requiredDays < DECIDING_DAYS)
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

      {/*
       * The mechanism, before any of the tables that depend on it. The formula
       * is in the lead above; this is the thing the formula is about.
       */}
      {/*
       * The only demonstration on the site with an answer key. It goes first,
       * before the ladder and the survey table, because everything after it
       * asks the reader to trust a solve they cannot check.
       */}
      <Section
        eyebrow={dict.resolusi.recoveryEyebrow}
        title={dict.resolusi.recoveryTitle}
      >
        <RecoveryPanel
          dict={dict}
          rows={recoverySweep()}
          lengthDays={RECOVERY_LENGTH_DAYS}
        />
      </Section>

      <Section title={dict.resolusi.beatTitle}>
        <BeatFigure dict={dict} figure={beatFigure('K1', 'P1')} />
      </Section>

      <Section title={dict.resolusi.surveyTitle} lead={dict.resolusi.surveyLead}>
        <Scroller labelledBy="survey-caption">
          <table className="w-full min-w-[520px] border-collapse text-caption">
            <caption id="survey-caption" className="sr-only">
              {dict.tableName.survey}
            </caption>
            <thead>
              <tr className="border-b border-rule text-left">
                <th scope="col" className="eyebrow py-2 pr-4">{dict.resolusi.surveyLength}</th>
                <th scope="col" className="eyebrow py-2 pr-4">{dict.resolusi.surveyKept}</th>
                <th scope="col" className="eyebrow py-2">{dict.resolusi.surveyLost}</th>
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

      <Section title={dict.resolusi.ladderFullTitle} lead={dict.resolusi.ladderDeciding}>
        <Scroller labelledBy="ladder-caption">
          <table className="w-full min-w-[520px] border-collapse text-caption">
            <caption id="ladder-caption" className="sr-only">
              {dict.tableName.ladder}
            </caption>
            <thead>
              <tr className="border-b border-rule text-left">
                <th scope="col" className="eyebrow py-2 pr-4">{dict.resolusi.ladderPair}</th>
                <th scope="col" className="eyebrow py-2 pr-4 text-right">
                  {dict.resolusi.ladderSeparation}
                </th>
                <th scope="col" className="eyebrow py-2 text-right">{dict.resolusi.ladderRequired}</th>
              </tr>
            </thead>
            <tbody className="numeric">
              {deciding.map((rung) => (
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

        {/*
         * The remaining rungs, demoted rather than dropped. As a table they
         * were forty-two rows of identical-looking noise that buried the
         * thirteen above; as a dense run of pairs they read as what they are —
         * a completeness check a reader scans once and never returns to.
         */}
        {trivial.length > 0 && (
          <div className="mt-6 border-t border-rule pt-4">
            <p className="max-w-reading text-caption text-inkMuted">
              {dict.resolusi.ladderTrivial}
            </p>
            <p className="numeric mt-3 text-caption leading-7 text-inkMuted">
              {trivial.map((rung, index) => (
                <span key={`${rung.a}-${rung.b ?? 'Z0'}`} className="whitespace-nowrap">
                  {index > 0 && <span className="px-2 text-inkFaint">·</span>}
                  {rung.b === null ? `${rung.a}/Z₀` : `${rung.a}/${rung.b}`}{' '}
                  <span className="text-inkFaint">{formatDays(rung.requiredDays)}</span>
                </span>
              ))}
            </p>
          </div>
        )}
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
