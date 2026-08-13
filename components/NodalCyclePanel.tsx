import type { Dictionary } from '@/lib/i18n/dictionary'
import type { ConstituentNodalCycle } from '@/lib/tide/nodalcycle'
import { Caption } from '@/components/ui'

/**
 * What f is actually correcting for.
 *
 * The constituent table carries f and u as columns, which satisfies invariant
 * 4 and tells the reader nothing about scale — `f = 1.037` reads as a rounding
 * correction. Across the node cycle K2's f runs 0.748 to 1.317, so the wave in
 * the water is three quarters of its nominal height at one point and four
 * thirds at another, while the reported constant does not move at all.
 *
 * Presentational only: every number came from lib/tide/nodalcycle.
 */

/**
 * A fixed domain for every bar, so the rows are comparable at a glance. It
 * brackets the widest published series (K2, 0.748 to 1.317) with a little
 * room; a per-row domain would make M2's 4% swing look like K2's 57%.
 */
const DOMAIN_MIN = 0.7
const DOMAIN_MAX = 1.35

const position = (f: number): number =>
  Math.min(100, Math.max(0, ((f - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * 100))

export function NodalCyclePanel({
  dict,
  cycles,
}: {
  dict: Dictionary
  cycles: readonly ConstituentNodalCycle[]
}) {
  const modulated = cycles.filter((cycle) => cycle.swing > 0)
  const solar = cycles.filter((cycle) => cycle.swing === 0)
  if (modulated.length === 0) return null

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {modulated.map((cycle) => (
          <li key={cycle.name} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-3">
            <span className="numeric text-caption font-medium">{cycle.name}</span>

            <span className="relative block h-6">
              {/* The span f travels over 18.61 years. */}
              <span
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-predictionSoft"
                style={{
                  left: `${position(cycle.fMin)}%`,
                  width: `${position(cycle.fMax) - position(cycle.fMin)}%`,
                }}
              />
              {/* f = 1: where a fit that ignored the node would sit. */}
              <span
                className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-grid"
                style={{ left: `${position(1)}%` }}
              />
              {/* Where this record's own fit sits on the cycle. */}
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-prediction"
                style={{ left: `${position(cycle.atEpoch.f)}%` }}
                title={`f = ${cycle.atEpoch.f.toFixed(4)}`}
              />
            </span>

            <span className="numeric text-caption text-right text-inkMuted">
              ±{Math.round((cycle.swing / 2) * 100)}%
            </span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-caption text-inkFaint">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-6 rounded-full bg-predictionSoft" />
          <dd>{dict.komponen.nodalRange}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-prediction" />
          <dd>{dict.komponen.nodalHere}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-px bg-grid" />
          <dd>{dict.komponen.nodalUnity}</dd>
        </div>
      </dl>

      {solar.length > 0 && (
        <p className="text-caption text-inkMuted">
          {dict.komponen.nodalSolar}{' '}
          <span className="numeric">{solar.map((cycle) => cycle.name).join(', ')}</span>.
        </p>
      )}

      <Caption>{dict.komponen.nodalNote}</Caption>
    </div>
  )
}
