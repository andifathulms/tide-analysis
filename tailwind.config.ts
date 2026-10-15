import type { Config } from 'tailwindcss'

/**
 * Semantic tokens only — components never carry a raw hex, and this file
 * carries none either. Every value lives in `:root` in app/globals.css; this
 * is the mapping from a token name to the variable that holds it.
 *
 * The palette is a hydrographic plotting table — cool paper by day, a night
 * watch in the dark theme, and one night band for hero surfaces. Colour means
 * data: the three series and the reserved red carry meaning, and actions are
 * ink. Both themes are defined in globals.css by redefining the same
 * variables, so no component needs a `dark:` variant. See the contrast notes
 * beside each variable.
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

        /** The hero band. Inside `.night` the series tokens re-scope to it. */
        night: channel('night'),
        nightRaised: channel('night-raised'),
        nightRule: channel('night-rule'),
        nightInk: channel('night-ink'),
        nightMuted: channel('night-muted'),

        /** Formzahl classes, two tides a day (1) to one (4). Fills only. */
        fz1: channel('fz-1'),
        fz2: channel('fz-2'),
        fz3: channel('fz-3'),
        fz4: channel('fz-4'),
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
        title: ['var(--text-title)', { lineHeight: '1.95rem', letterSpacing: '-0.015em' }],
        headline: ['var(--text-headline)', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        display: ['var(--text-display)', { lineHeight: '2.75rem', letterSpacing: '-0.035em' }],
        hero: ['var(--text-hero)', { lineHeight: '1.04', letterSpacing: '-0.045em' }],
        /** Chart-internal labels, in viewBox units. See the note in globals.css. */
        chartLabel: ['var(--text-chart-label)', { lineHeight: '1' }],
      },
      height: {
        /** Matches the scroll-padding reserved for the sticky masthead. */
        header: 'var(--header-height)',
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
        card: '0.75rem',
      },
      boxShadow: {
        /** Variables, not ink-tinted literals: ink turns pale in the dark theme. */
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
      },
      transitionTimingFunction: {
        /** The one easing the site uses, for colour and the chart draw-in. */
        tide: 'cubic-bezier(0.22, 0.7, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
