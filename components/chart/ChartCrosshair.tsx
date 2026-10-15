'use client'

import { useRef, useState } from 'react'
import { pointAt, type CrosshairPoint, type Readout, type ReadoutFrame } from '@/lib/chart/readout'
import { formatDateTime, type TimeZoneDisplay } from '@/lib/view/format'

/**
 * Read a value off the chart: a vertical rule at the pointer, a mark on each
 * trace, and the three heights at that hour beside it. Touch works the same
 * way — press and drag.
 *
 * An overlay with the chart's own viewBox, so it scales with the drawing
 * exactly. It follows the pointer instantly, with no easing: it reports a
 * sample, and a sample does not glide. Over a gap in the record it shows
 * nothing, because there is nothing there to read.
 *
 * Supplementary, and hidden from assistive technology: every number it shows
 * is also in the chart's description, the tables, or the derivation below.
 */
export function ChartCrosshair({
  frame,
  readout,
  zone,
  observedLabel,
  predictedLabel,
  residualLabel,
}: {
  frame: ReadoutFrame
  readout: Readout
  zone?: TimeZoneDisplay
  observedLabel: string
  predictedLabel: string
  residualLabel: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [point, setPoint] = useState<CrosshairPoint | null>(null)

  function track(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (svg === null || matrix === null || matrix === undefined) return
    const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    setPoint(pointAt(frame, readout, cursor.x))
  }

  const percent = point === null ? 0 : (point.x / frame.width) * 100
  const bottom = frame.height - 24

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        className="absolute inset-0 h-full w-full touch-pan-y"
        aria-hidden="true"
        focusable="false"
        onPointerMove={track}
        onPointerDown={track}
        onPointerLeave={() => setPoint(null)}
      >
        {point !== null && (
          <g>
            <line
              x1={point.x}
              x2={point.x}
              y1={frame.plot.y}
              y2={bottom}
              className="stroke-ink/50"
              strokeWidth={0.8}
            />
            {point.model !== null && (
              <circle cx={point.x} cy={point.model.y} r={4} className="fill-prediction stroke-surface" strokeWidth={1.5} />
            )}
            {point.observed !== null && (
              <circle cx={point.x} cy={point.observed.y} r={3.2} className="fill-ink stroke-surface" strokeWidth={1.5} />
            )}
            {point.residual !== null && (
              <circle cx={point.x} cy={point.residual.y} r={3.2} className="fill-residual stroke-surface" strokeWidth={1.5} />
            )}
          </g>
        )}
        {/* The hit area: the whole face, transparent. */}
        <rect x={0} y={0} width={frame.width} height={frame.height} fill="transparent" />
      </svg>

      {point !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 z-10 min-w-[11rem] -translate-x-1/2 rounded-card border border-rule bg-surface px-3 py-2 text-caption shadow-raised"
          style={{ left: `clamp(6rem, ${percent}%, calc(100% - 6rem))` }}
        >
          <p className="numeric mb-1 text-micro text-inkFaint">{formatDateTime(point.timeSec, zone)}</p>
          <Row swatch="bg-ink" label={observedLabel} value={point.observed?.m} />
          <Row swatch="bg-prediction" label={predictedLabel} value={point.model?.m} />
          <Row swatch="bg-residual" label={residualLabel} value={point.residual?.m} signed tone="text-residualText" />
        </div>
      )}
    </>
  )
}

function Row({
  swatch,
  label,
  value,
  signed = false,
  tone = 'text-ink',
}: {
  swatch: string
  label: string
  value: number | undefined
  signed?: boolean
  tone?: string
}) {
  if (value === undefined) return null
  const text = `${signed && value >= 0 ? '+' : ''}${value.toFixed(3)} m`
  return (
    <p className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-inkMuted">
        <span className={`inline-block h-[3px] w-3 rounded-full ${swatch}`} />
        {label}
      </span>
      <span className={`numeric ${tone}`}>{text.replace('-', '−')}</span>
    </p>
  )
}
