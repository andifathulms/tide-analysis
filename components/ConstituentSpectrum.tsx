import { fill, type Dictionary } from '@/lib/i18n/dictionary'
import { SPECTRUM_PANEL, type SpectrumModel } from '@/lib/chart/spectrum'

/**
 * The constituent table as a picture: a line spectrum, one panel per species,
 * one amplitude scale across all of them. Presentational — every position was
 * computed by lib/chart/spectrum.
 *
 * Unresolved constituents get a dashed mark in the reserved red at their
 * frequency, and the length they need. No bar, because no amplitude exists.
 */
export function ConstituentSpectrum({ dict, model }: { dict: Dictionary; model: SpectrumModel }) {
  const { width, height, base } = SPECTRUM_PANEL
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
      {model.panels.map((panel) => (
        <figure key={panel.species} className="min-w-0 rounded-card border border-rule bg-surface p-3">
          <figcaption className="eyebrow">{dict.komponen.species[panel.species]}</figcaption>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="mt-1 block h-auto w-full"
            role="img"
            aria-label={`${dict.komponen.species[panel.species]}: ${panel.bars
              .map((bar) =>
                bar.type === 'resolved'
                  ? `${bar.name} ${bar.amplitudeM.toFixed(3)} m`
                  : `${bar.name} ${fill(dict.komponen.spectrumUnresolved, {
                      other: bar.conflictsWith,
                      days: bar.requiredDays.toFixed(0),
                    })}`,
              )
              .join(', ')}`}
          >
            {model.gridlines.map((line) => (
              <g key={line.label}>
                <line x1={0} x2={width} y1={line.y} y2={line.y} className="stroke-grid" strokeWidth={0.6} />
                <text x={2} y={line.y - 3} className="numeric fill-inkFaint text-chartLabel">
                  {line.label}
                </text>
              </g>
            ))}
            <line x1={0} x2={width} y1={base} y2={base} className="stroke-grid" strokeWidth={1} />

            {panel.bars.map((bar) => (
              <g key={bar.name}>
                {bar.type === 'resolved' ? (
                  <rect
                    x={bar.x - 6}
                    y={base - bar.height}
                    width={12}
                    height={bar.height}
                    rx={2}
                    className="fill-prediction"
                  />
                ) : (
                  <>
                    <rect
                      x={bar.x - 6}
                      y={base - 34}
                      width={12}
                      height={34}
                      rx={2}
                      fill="none"
                      className="stroke-unresolved"
                      strokeWidth={1.4}
                      strokeDasharray="3 2"
                    />
                    <text
                      x={bar.x}
                      y={base - 40}
                      textAnchor="middle"
                      className="numeric fill-unresolved text-chartLabel font-medium"
                    >
                      {bar.requiredDays.toFixed(0)} {dict.common.days}
                    </text>
                  </>
                )}
                <text
                  x={bar.x}
                  y={base + 15}
                  textAnchor="middle"
                  className={`text-[11px] font-bold ${bar.type === 'resolved' ? 'fill-ink' : 'fill-unresolved'}`}
                >
                  {bar.name}
                </text>
                <text x={bar.x} y={base + 28} textAnchor="middle" className="numeric fill-inkFaint text-chartLabel">
                  {bar.cyclesPerDay.toFixed(3)}
                </text>
              </g>
            ))}
          </svg>
        </figure>
      ))}
    </div>
  )
}
