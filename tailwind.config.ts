import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — components never carry a raw hex.
 *
 * The palette keeps the marégraphe chart of PRD §9 as its subject: warm paper,
 * printed ruling, one continuous ink line. The values have moved, because the
 * originals did not survive being measured. Prediction was #2E7A85, a teal
 * whose chroma sits below the floor at which a colourblind reader can hold it
 * apart from the ochre residual; it is now a deeper sea blue that passes.
 *
 * The three chart series were validated together, on this surface, against
 * lightness band, chroma floor, CVD separation across all pairs, the
 * normal-vision floor, and contrast:
 *
 *   #00719E prediction · #C07A16 residual · #B0392B unresolved   all PASS
 *
 * Observation ink is not in that set on purpose: it is the page's ink, checked
 * as text (12.5:1 on paper), not as a category competing for a hue.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** The chart roll itself — every page sits on it. */
        paper: '#F7F3E9',
        /** Raised surfaces: cards, tables, controls. */
        surface: '#FFFDF7',
        /** A recessed band, for asides and secondary panels. */
        sunken: '#F0EBDD',

        /** Primary ink — text, and the observed trace. */
        ink: '#14303A',
        inkMuted: '#4A5B62',
        inkFaint: '#5D6B71',

        /** The printed ruling, and the hairlines that echo it. */
        grid: '#D8D2C2',
        rule: '#E6E0D0',

        /** The three series. Validated together; see the note above. */
        prediction: '#00719E',
        residual: '#C07A16',
        unresolved: '#B0392B',

        /** Datum lines on the chart face. */
        datum: '#64707A',

        /** Tints, for fills that must stay behind the marks. */
        predictionSoft: '#E4F0F6',
        residualSoft: '#F8EEDC',
        unresolvedSoft: '#F7E7E4',
      },
      fontFamily: {
        prose: ['var(--font-prose)', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // A scale with a real ratio, so headings relate rather than drift.
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
        caption: ['0.8125rem', { lineHeight: '1.25rem' }],
        body: ['0.9375rem', { lineHeight: '1.6rem' }],
        lead: ['1.125rem', { lineHeight: '1.8rem' }],
        title: ['1.375rem', { lineHeight: '1.9rem', letterSpacing: '-0.01em' }],
        headline: ['1.75rem', { lineHeight: '2.2rem', letterSpacing: '-0.015em' }],
        display: ['2.5rem', { lineHeight: '2.9rem', letterSpacing: '-0.02em' }],
        hero: ['3.25rem', { lineHeight: '3.5rem', letterSpacing: '-0.03em' }],
      },
      maxWidth: {
        reading: '38rem',
        page: '76rem',
      },
      borderRadius: {
        card: '0.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(20 48 58 / 0.05), 0 1px 8px rgb(20 48 58 / 0.04)',
        raised: '0 2px 4px rgb(20 48 58 / 0.06), 0 8px 24px rgb(20 48 58 / 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
