import type { ChartModel } from '@/lib/chart/model'

/**
 * The ruled marégraphe chart: printed grid, one continuous ink line for the
 * observation, prediction teal overlaid so agreement reads as the two lines
 * merging, and the residual band directly beneath on the same time axis.
 *
 * Presentational only — every number here was computed by lib/chart/model.
 */
export function TideChart({
  model,
  observedLabel,
  predictedLabel,
  residualLabel,
  heldOutLabel,
  description,
  titleId = 'chart-title',
  drawIn = false,
}: {
  model: ChartModel
  observedLabel: string
  predictedLabel: string
  residualLabel: string
  heldOutLabel?: string
  /**
   * What this chart shows, in a sentence, for a reader who cannot see it. The
   * caller knows the station, the window and the residual; the chart does not.
   */
  description?: string
  /** Unique when a page draws more than one chart. */
  titleId?: string
  /**
   * Draw the traces in once on load: observation first, the model laid over
   * it, the residual last. Only for a chart that is shown, not recomputed —
   * a fit that changes must redraw, never tween (see globals.css).
   */
  drawIn?: boolean
}) {
  const length = drawIn ? 1 : undefined
  return (
    // A tab stop, because below 36rem this box scrolls sideways and a
    // keyboard has no other way in (WCAG 2.1.1; see Scroller).
    <figure className="w-full overflow-x-auto" tabIndex={0} aria-labelledby={titleId}>
      {/*
       * Height follows the viewBox's aspect ratio. A fixed height with a
       * shrinking width letterboxed the chart on a phone — a thin strip of
       * tide inside a tall empty box. Below 36rem the figure scrolls
       * sideways instead, so axis labels stay legible.
       *
       * <title> is the native accessible name for an SVG and is where the
       * description belongs. role="img" stays on top of it because without a
       * role several screen readers walk into the shapes and read the axis
       * labels one at a time instead of the name.
       */}
      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-labelledby={titleId}
        className={`block h-auto w-full min-w-[36rem] ${drawIn ? 'chart-draw' : ''}`}
      >
        <title id={titleId}>
          {description ?? `${observedLabel} · ${predictedLabel} · ${residualLabel}`}
        </title>
        <rect x={0} y={0} width={model.width} height={model.height} className="fill-surface" />

        {model.heldOutRect !== null && (
          <g>
            <rect
              x={model.heldOutRect.x}
              y={model.plot.y}
              width={model.heldOutRect.width}
              height={model.height - model.plot.y - 24}
              className="fill-sunken"
            />
            {heldOutLabel !== undefined && (
              <text
                x={model.heldOutRect.x + 6}
                y={model.plot.y + 12}
                className="fill-inkFaint text-chartLabel"
              >
                {heldOutLabel}
              </text>
            )}
          </g>
        )}

        {/* The ruling. A tide chart is nothing without it. */}
        <g className="stroke-grid" strokeWidth={0.5}>
          {model.horizontalRules.map((rule) => (
            <line
              key={`h${rule.y}`}
              x1={model.plot.x}
              x2={model.plot.x + model.plot.width}
              y1={rule.y}
              y2={rule.y}
            />
          ))}
          {model.verticalRules.map((rule) => (
            <line
              key={`v${rule.x}`}
              x1={rule.x}
              x2={rule.x}
              y1={model.plot.y}
              y2={model.plot.y + model.plot.height}
            />
          ))}
          {model.residualPlot !== null &&
            model.residualRules.map((rule) => (
              <line
                key={`r${rule.y}`}
                x1={model.residualPlot!.x}
                x2={model.residualPlot!.x + model.residualPlot!.width}
                y1={rule.y}
                y2={rule.y}
              />
            ))}
        </g>

        {/* Where the gauge's zero moved. Everything left of the mark is in a
            different datum from everything right of it. */}
        {model.datumStepMarks.map((mark) => (
          <g key={`step${mark.x}`}>
            <line
              x1={mark.x}
              x2={mark.x}
              y1={model.plot.y}
              y2={model.height - 24}
              className="stroke-unresolved"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={mark.x + 4}
              y={model.plot.y + 24}
              className="fill-unresolved text-chartLabel font-medium"
            >
              datum {mark.label}
            </text>
          </g>
        ))}

        {/* Datums, labelled on the face — a real tide chart carries them. */}
        <g>
          {model.datumLines.map((datum) => (
            <g key={datum.label}>
              <line
                x1={model.plot.x}
                x2={model.plot.x + model.plot.width}
                y1={datum.y}
                y2={datum.y}
                className="stroke-datum"
                strokeWidth={datum.emphasis ? 1 : 0.75}
                strokeDasharray={datum.emphasis ? undefined : '4 3'}
              />
              <text
                x={model.plot.x + model.plot.width + 6}
                y={datum.y + 3}
                className="fill-datum text-chartLabel"
              >
                {datum.label}
              </text>
            </g>
          ))}
        </g>

        <g className="numeric">
          {model.horizontalRules.map((rule) => (
            <text
              key={`hl${rule.y}`}
              x={model.plot.x - 8}
              y={rule.y + 3}
              textAnchor="end"
              className="fill-inkFaint text-chartLabel"
            >
              {rule.label}
            </text>
          ))}
          {model.verticalRules.map((rule) => (
            <text
              key={`vl${rule.x}`}
              x={rule.x}
              y={model.height - 8}
              textAnchor="middle"
              className="fill-inkFaint text-chartLabel"
            >
              {rule.label}
            </text>
          ))}
          {model.residualRules.map((rule) => (
            <text
              key={`rl${rule.y}`}
              x={model.plot.x - 8}
              y={rule.y + 3}
              textAnchor="end"
              className="fill-residualText text-chartLabel"
            >
              {rule.label}
            </text>
          ))}
        </g>

        {model.modelPath !== null && (
          <path
            d={model.modelPath}
            fill="none"
            className="trace trace-model stroke-prediction"
            strokeWidth={2}
            pathLength={length}
          />
        )}
        <path
          d={model.observedPath}
          fill="none"
          className="trace stroke-ink"
          pathLength={length}
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {model.residualPath !== null && model.residualZeroY !== null && (
          <>
            <line
              x1={model.plot.x}
              x2={model.plot.x + model.plot.width}
              y1={model.residualZeroY}
              y2={model.residualZeroY}
              className="stroke-residual/50"
              strokeWidth={0.75}
            />
            <path
              d={model.residualPath}
              fill="none"
              className="trace trace-residual stroke-residual"
              pathLength={length}
              strokeWidth={1.1}
              strokeLinejoin="round"
            />
            <text
              x={model.plot.x + model.plot.width + 6}
              y={model.residualZeroY + 3}
              className="fill-residualText text-chartLabel font-medium"
            >
              {residualLabel}
            </text>
          </>
        )}
      </svg>

      {/* Identity is never colour alone: every trace is named here and the
          chart is described in the table beside it. */}
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-caption">
        <span className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-7 rounded-full bg-ink" />
          {observedLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-7 rounded-full bg-prediction" />
          {predictedLabel}
        </span>
        {model.residualPath !== null && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-[3px] w-7 rounded-full bg-residual" />
            {residualLabel}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
