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
}: {
  model: ChartModel
  observedLabel: string
  predictedLabel: string
  residualLabel: string
  heldOutLabel?: string
}) {
  return (
    <figure className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        width="100%"
        height={model.height}
        role="img"
        aria-label={`${observedLabel} · ${predictedLabel} · ${residualLabel}`}
        className="block"
      >
        <rect x={0} y={0} width={model.width} height={model.height} className="fill-chart" />

        {model.heldOutRect !== null && (
          <g>
            <rect
              x={model.heldOutRect.x}
              y={model.plot.y}
              width={model.heldOutRect.width}
              height={model.height - model.plot.y - 24}
              className="fill-grid/25"
            />
            {heldOutLabel !== undefined && (
              <text
                x={model.heldOutRect.x + 6}
                y={model.plot.y + 12}
                className="fill-traceInk/70 text-[10px] control"
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
              className="fill-unresolved text-[10px] control"
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
                className="fill-datum text-[10px] control"
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
              className="fill-traceInk/70 text-[10px]"
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
              className="fill-traceInk/70 text-[10px]"
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
              className="fill-residual/80 text-[10px]"
            >
              {rule.label}
            </text>
          ))}
        </g>

        {model.modelPath !== null && (
          <path d={model.modelPath} fill="none" className="stroke-prediction" strokeWidth={1.4} />
        )}
        <path
          d={model.observedPath}
          fill="none"
          className="stroke-traceInk"
          strokeWidth={0.9}
          strokeLinejoin="round"
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
            <path d={model.residualPath} fill="none" className="stroke-residual" strokeWidth={0.9} />
            <text
              x={model.plot.x + model.plot.width + 6}
              y={model.residualZeroY + 3}
              className="fill-residual text-[10px] control"
            >
              {residualLabel}
            </text>
          </>
        )}
      </svg>

      <figcaption className="control mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-6 bg-traceInk" />
          {observedLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-6 bg-prediction" />
          {predictedLabel}
        </span>
        {model.residualPath !== null && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-[2px] w-6 bg-residual" />
            {residualLabel}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
