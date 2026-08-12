import { Badge, Callout, Card, Stat } from '@/components/ui'
import type { Dictionary } from '@/lib/i18n/dictionary'
import type { AsymmetryResult } from '@/lib/tide/asymmetry'

/**
 * Shallow-water asymmetry, shown as two statements rather than one number.
 *
 * The harmonic indicator describes the M2/M4 pair. The measured durations
 * describe the tide a person would actually time on the shore. On a
 * semidiurnal coast they agree; on a diurnal one they need not, and where they
 * differ the panel says which is which instead of quietly picking a winner.
 */
export function AsymmetryPanel({
  dict,
  asymmetry,
}: {
  dict: Dictionary
  asymmetry: AsymmetryResult
}) {
  const tone =
    asymmetry.strength === 'kuat'
      ? 'residual'
      : asymmetry.strength === 'sedang'
        ? 'prediction'
        : 'neutral'

  const bar = (rise: number, fall: number): { risePercent: number; fallPercent: number } => {
    const total = rise + fall || 1
    return { risePercent: (rise / total) * 100, fallPercent: (fall / total) * 100 }
  }
  const actual = bar(asymmetry.actual.meanRiseHours, asymmetry.actual.meanFallHours)

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-title">{asymmetry.label}</h3>
            <p className="mt-1 max-w-reading text-body text-inkMuted">{asymmetry.description}</p>
          </div>
          <Badge tone={tone}>{asymmetry.strength}</Badge>
        </div>

        {/* The two durations, drawn to scale against each other. */}
        <div className="space-y-2">
          <p className="eyebrow">{dict.komponen.asymmetryActual}</p>
          <div className="flex h-8 overflow-hidden rounded-card border border-rule">
            <div
              className="flex items-center justify-center bg-predictionSoft text-micro font-medium text-prediction"
              style={{ width: `${actual.risePercent}%` }}
            >
              {dict.komponen.rise}
            </div>
            {/* A 2px gap so the two blocks never read as one. */}
            <div className="w-[2px] shrink-0 bg-surface" />
            <div
              className="flex items-center justify-center bg-residualSoft text-micro font-medium text-residual"
              style={{ width: `${actual.fallPercent}%` }}
            >
              {dict.komponen.fall}
            </div>
          </div>
          <div className="numeric flex justify-between text-caption text-inkMuted">
            <span>{asymmetry.actual.meanRiseHours.toFixed(2)} jam</span>
            <span>{asymmetry.actual.meanFallHours.toFixed(2)} jam</span>
          </div>
        </div>

        <dl className="grid gap-6 border-t border-rule pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={dict.komponen.asymmetryRatio}
            value={asymmetry.amplitudeRatio.toFixed(4)}
            tone={asymmetry.strength === 'kuat' ? 'residual' : 'ink'}
          />
          <Stat
            label={dict.komponen.asymmetryPhase}
            value={`${asymmetry.relativePhaseDeg.toFixed(0)}°`}
          />
          <Stat
            label={`${dict.komponen.asymmetryShallow} — ${dict.komponen.rise}`}
            value={asymmetry.shallowWater.meanRiseHours.toFixed(2)}
            unit="jam"
          />
          <Stat
            label={`${dict.komponen.asymmetryShallow} — ${dict.komponen.fall}`}
            value={asymmetry.shallowWater.meanFallHours.toFixed(2)}
            unit="jam"
          />
        </dl>
      </Card>

      {!asymmetry.directionsAgree && (
        <Callout tone="warning" title={dict.komponen.asymmetryEyebrow}>
          <p className="max-w-reading">{dict.komponen.asymmetryDisagree}</p>
        </Callout>
      )}
    </div>
  )
}
