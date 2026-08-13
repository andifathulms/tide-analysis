import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — components never carry a raw hex, and this file
 * carries none either. Every value lives in `:root` in app/globals.css; this
 * is the mapping from a token name to the variable that holds it.
 *
 * The palette keeps the marégraphe chart of PRD §9 as its subject: warm paper,
 * printed ruling, one continuous ink line. Prediction was #2E7A85, a teal whose
 * chroma sits below the floor at which a colourblind reader can hold it apart
 * from the ochre residual; it is now a deeper sea blue that passes. See the
 * contrast notes beside each variable.
 *
 * Colours resolve through `<alpha-value>` so the opacity modifiers the
 * components rely on (`bg-paper/90`, `border-prediction/30`) keep working.
 */
const channel = (name: string) => `rgb(var(--colour-${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: channel('paper'),
        surface: channel('surface'),
        sunken: channel('sunken'),

        ink: channel('ink'),
        inkMuted: channel('ink-muted'),
        inkFaint: channel('ink-faint'),

        grid: channel('grid'),
        rule: channel('rule'),

        prediction: channel('prediction'),
        /** The chart stroke. For type, reach for `residualText`. */
        residual: channel('residual'),
        residualText: channel('residual-text'),
        unresolved: channel('unresolved'),

        datum: channel('datum'),

        predictionSoft: channel('prediction-soft'),
        residualSoft: channel('residual-soft'),
        unresolvedSoft: channel('unresolved-soft'),
      },
      fontFamily: {
        prose: ['var(--font-prose)', 'Georgia', 'serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro: ['var(--text-micro)', { lineHeight: '1.0625rem', letterSpacing: '0.06em' }],
        caption: ['var(--text-caption)', { lineHeight: '1.25rem' }],
        body: ['var(--text-body)', { lineHeight: '1.65rem' }],
        lead: ['var(--text-lead)', { lineHeight: '1.85rem' }],
        title: ['var(--text-title)', { lineHeight: '1.95rem', letterSpacing: '-0.01em' }],
        headline: ['var(--text-headline)', { lineHeight: '2.25rem', letterSpacing: '-0.015em' }],
        display: ['var(--text-display)', { lineHeight: '2.9rem', letterSpacing: '-0.02em' }],
        hero: ['var(--text-hero)', { lineHeight: '3.25rem', letterSpacing: '-0.03em' }],
      },
      spacing: {
        /** Named by role, so the page rhythm changes in one place. */
        card: 'var(--space-card)',
        gutter: 'var(--space-gutter)',
        block: 'var(--space-block)',
        section: 'var(--space-section)',
      },
      maxWidth: {
        reading: '38rem',
        page: '76rem',
      },
      borderRadius: {
        card: '0.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--colour-ink) / 0.05), 0 1px 8px rgb(var(--colour-ink) / 0.04)',
        raised: '0 2px 4px rgb(var(--colour-ink) / 0.06), 0 8px 24px rgb(var(--colour-ink) / 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
