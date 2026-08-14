import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import type { BeatFigure as Figure } from '@/lib/chart/beat'
import { formatDays } from '@/lib/view/format'
import { Callout } from '@/components/ui'

/**
 * The mechanism behind T = 360° / |σᵢ − σⱼ|, drawn instead of asserted.
 *
 * Four two-day snapshots taken across one full drift cycle: the pair in step,
 * a quarter turn along, opposed at the half, and back in step at the end. A
 * reader can see that at day zero the two are one wave, and that the criterion
 * is waiting for them to stop being one wave.
 *
 * Presentational only: every path came from lib/chart/beat.
 */
export function BeatFigure({ dict, figure }: { dict: Dictionary; figure: Figure }) {
  const captions = [
    dict.resolusi.beatAtStart,
    dict.resolusi.beatQuarter,
    dict.resolusi.beatHalf,
    dict.resolusi.beatFull,
  ]

  return (
    <div className="space-y-4">
      <p className="max-w-reading text-body text-inkMuted">
        {fill(dict.resolusi.beatLead, {
          separation: figure.separationDegPerHour.toFixed(4),
          required: formatDays(figure.requiredDays),
        })}
      </p>

      <ol className="grid gap-4 sm:grid-cols-2">
        {figure.panels.map((panel, index) => (
          <li key={panel.atDays} className="card p-card">
            <p className="text-caption text-inkMuted">
              {fill(captions[index] ?? '', { days: formatDays(panel.atDays) })}
            </p>
            <svg
              viewBox={`0 0 ${figure.width} ${figure.height}`}
              width="100%"
              height={figure.height}
              role="img"
              aria-labelledby={`beat-${index}`}
              className="mt-2 block"
            >
              <title id={`beat-${index}`}>
                {fill(captions[index] ?? '', { days: formatDays(panel.atDays) })}
              </title>
              {/* Mean level, so a reader can see which wave is high and which low. */}
              <line
                x1={0}
                x2={figure.width}
                y1={figure.height / 2}
                y2={figure.height / 2}
                className="stroke-grid"
                strokeWidth={0.5}
              />
              <path d={panel.pathA} fill="none" className="stroke-ink" strokeWidth={1.4} />
              <path
                d={panel.pathB}
                fill="none"
                className="stroke-prediction"
                strokeWidth={1.4}
                strokeDasharray="4 3"
              />
            </svg>
            <p className="numeric mt-1 text-micro text-inkFaint">
              <span className="text-ink">— {figure.a}</span>{' '}
              <span className="text-prediction">- - {figure.b}</span> · {figure.spanDays}{' '}
              {dict.resolusi.beatDay}
            </p>
          </li>
        ))}
      </ol>

      {/* The question the picture provokes, answered where it is provoked. */}
      <Callout tone="note" size="caption" className="max-w-reading">
        {dict.resolusi.beatWhyFull}
      </Callout>
    </div>
  )
}
