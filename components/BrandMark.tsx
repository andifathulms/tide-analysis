/**
 * The mark, inline so it costs no request and stays crisp at any size.
 *
 * It is the app's own argument drawn small: observed dots, a solid curve
 * fitted through them, and a dashed tail continuing past the last observation.
 * Solid is what the record supports; dashed is extrapolation. The same
 * distinction the chart makes at full size, and the same one the refusal
 * exists to protect.
 *
 * Colours are the kit's, not the site's tokens: this is artwork on its own
 * tile rather than a mark competing in the chart's series palette.
 */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Tide Analysis"
      focusable="false"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#16303D" />
      {/* Fitted: solid, harbour blue. */}
      <path
        d="M8 62 Q 22 30, 36 62 T 64 62"
        fill="none"
        stroke="#1C6E93"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Predicted: dashed, past the last observation. */}
      <path
        d="M64 62 Q 78 30, 92 62"
        fill="none"
        stroke="#EDE9DC"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 7"
      />
      {/* The observations themselves. */}
      <circle cx="8" cy="62" r="4.5" fill="#EDE9DC" />
      <circle cx="20" cy="45" r="4.5" fill="#EDE9DC" />
      <circle cx="36" cy="62" r="4.5" fill="#EDE9DC" />
      <circle cx="50" cy="45" r="4.5" fill="#EDE9DC" />
      <circle cx="64" cy="62" r="4.5" fill="#EDE9DC" />
    </svg>
  )
}
