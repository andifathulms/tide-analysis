import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — components never carry raw hex. Palette from PRD §9:
 * the marégraphe chart, its ruling, and the traces drawn on it.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chart: '#F2EFE4',
        grid: '#C7C3B2',
        traceInk: '#1B2A2E',
        prediction: '#2E7A85',
        residual: '#B5822E',
        unresolved: '#B0392B',
        datum: '#8A93A0',
      },
      fontFamily: {
        prose: ['var(--font-prose)', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
}

export default config
