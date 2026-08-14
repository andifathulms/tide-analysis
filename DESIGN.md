---
name: Pasut — Tide Analysis
description: A tidal harmonic analysis instrument styled as a mechanical tide gauge's paper chart — computed constants, honest refusals, warm ruled paper.
colors:
  paper: "#F7F3E9"
  surface: "#FFFDF7"
  sunken: "#F0EBDD"
  ink: "#14303A"
  ink-muted: "#4A5B62"
  ink-faint: "#556269"
  grid: "#D8D2C2"
  rule: "#E6E0D0"
  prediction: "#00719E"
  residual: "#BC7715"
  residual-text: "#8F5711"
  unresolved: "#B0392B"
  datum: "#5A6670"
  prediction-soft: "#E4F0F6"
  residual-soft: "#F8EEDC"
  unresolved-soft: "#F7E7E4"
typography:
  hero:
    fontFamily: "Newsreader, Georgia, Times New Roman, serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: "3.25rem"
    letterSpacing: "-0.03em"
  display:
    fontFamily: "Newsreader, Georgia, Times New Roman, serif"
    fontSize: "2.5rem"
    fontWeight: 500
    lineHeight: "2.9rem"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, Georgia, Times New Roman, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: "2.25rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader, Georgia, Times New Roman, serif"
    fontSize: "1.4375rem"
    fontWeight: 500
    lineHeight: "1.95rem"
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Inter Tight, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: "1.85rem"
  body:
    fontFamily: "Inter Tight, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.65rem"
  caption:
    fontFamily: "Inter Tight, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  micro:
    fontFamily: "Inter Tight, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1.0625rem"
    letterSpacing: "0.06em"
  numeric:
    fontFamily: "Roboto Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  card: "0.5rem"
  full: "9999px"
  sm: "0.25rem"
spacing:
  card: "1.25rem"
  gutter: "1.25rem"
  block: "1.5rem"
  section: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.prediction}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0.625rem 1.25rem"
  button-secondary-hover:
    textColor: "{colors.prediction}"
  badge:
    backgroundColor: "{colors.prediction-soft}"
    textColor: "{colors.prediction}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  callout-unresolved:
    backgroundColor: "{colors.unresolved-soft}"
    textColor: "{colors.unresolved}"
    rounded: "{rounded.card}"
    padding: "1.25rem 1.25rem 1.25rem 1.25rem"
  nav-tab-active:
    textColor: "{colors.prediction}"
    typography: "{typography.caption}"
  nav-tab-inactive:
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
---

# Design System: Pasut — Tide Analysis

## Overview

**Creative North Star: "The Marégraphe"**

The subject is the paper drum of a mechanical tide gauge — a pen tracing sea level onto a ruled roll for weeks at a time, the instrument's own visual language. Every surface in the app sits on that warm paper; the chart alone carries its ruling, because a grid the reader takes measurements off has no business repeating as wallpaper behind prose (a mistake the codebase made once and corrected — see `globals.css`). The site is a restrained instrument, not a decorated app: color and shape are reserved for meaning, never for polish. Prediction blue means "the model agrees here." Residual ochre means "this is what the model doesn't explain." Reserved red means "this cannot be trusted" — a refusal, an ill-conditioned fit, a gauge fault — and it never decorates anything else. There is no ambient motion; the one animated moment (a constituent toggling in and rebuilding the predicted curve) exists because that rebuild is real information, and everywhere else stillness is the honest choice, because the Rayleigh slider's fit is genuinely discontinuous and animating it would imply a continuity that isn't there.

Two audiences read this system at once — a lay Indonesian reader drawn in by curiosity, and a technical peer auditing the engineering — and the design doesn't split into two registers for them. The same ruled, quiet, high-contrast surface serves both: legible prose typography for the first, exact tabular-numeral readouts and a visible condition number for the second.

**Key Characteristics:**
- Warm ruled paper as the base surface everywhere; the grid itself belongs only to the chart.
- A fixed three-trace chart vocabulary — ink for observation, blue for prediction (heavier stroke, drawn to visually merge with agreement), ochre for residual — validated together for colorblind separation and never reassigned.
- Reserved red exists in exactly one register: things the record cannot support. It is never used for hover states, active states, or emphasis.
- Flat by default; the two shadow tokens are earned, not decorative, and appear on a handful of surfaces only.
- No transition or easing utilities anywhere in the codebase. Stillness is a deliberate visual argument, not an oversight.
- Newsreader serif for anything read as prose or judgment (headings, body); Inter Tight sans for anything operated (nav, labels, controls); Roboto Mono tabular figures for anything counted (amplitudes, phases, condition numbers).

## Colors

Chart-paper warmth throughout, three validated data traces, and one reserved alarm color that never leaks into decoration.

### Primary
- **Harbour Blue** (`#00719E`, token `prediction`): the fitted/predicted trace, the one primary action per view, active nav state, focus rings, text selection tint. Chosen (over an earlier teal) because its chroma clears the floor at which a colorblind reader can hold it apart from the ochre residual trace — do not retune without re-validating that separation.

### Secondary
- **Marigold Ochre** (`#BC7715` stroke / `#8F5711` as text, tokens `residual` / `residual-text`): the residual trace beneath the chart, and the honest measure of what the harmonic model doesn't explain. The stroke value is tuned for separation on the chart face and sits under the text-contrast floor, which is why it has a darker text sibling — always reach for `residual-text` when the color carries type, `residual` only for the stroke itself.

### Tertiary
- **Reserved Alarm Red** (`#B0392B`, token `unresolved`): constituents the record cannot resolve, ill-conditioned fits, gauge datum steps, the navigation-safety warning, and a number that disagrees with itself beyond a stated tolerance — least squares vs. Admiralty on the same constituent (`FormzahlComparison`, >0.03 m or >10°), or a constant's spread across independently-fitted windows (`StabilityPanel`, above `NOTABLE_SWING`). This color is load-bearing precisely because it appears nowhere else — never a hover state, never a delete button, never generic emphasis.

### Neutral
- **Chart Paper** (`#F7F3E9`, token `paper`): the base surface of every page — the instrument's own paper stock.
- **Card Surface** (`#FFFDF7`, token `surface`): raised surfaces — cards, tables, controls, header bar — a shade lighter than the paper it sits on.
- **Sunken Band** (`#F0EBDD`, token `sunken`): recessed secondary panels, row hover states, the held-out extrapolation window on the chart.
- **Instrument Ink** (`#14303A`, token `ink`): primary text and the observed trace — near-black with a marine cast, 12.5:1 on paper.
- **Muted Ink** (`#4A5B62`, token `ink-muted`): secondary prose, inactive nav labels, 6.4:1 on paper.
- **Faint Ink** (`#556269`, token `ink-faint`): eyebrows, captions, labels — the smallest text on the site, held to 5.7:1 on paper deliberately (a prior value measured only 4.63:1 on the sunken surface, under the bar).
- **Printed Grid** (`#D8D2C2`, token `grid`): ruling for anything measured — the chart's own grid, and the small inline scales that share its vocabulary (Formzahl ticks, the nodal f-range, the beat figure's mean line). Never used for text, never used where nothing is being measured.
- **Paper Rule** (`#E6E0D0`, token `rule`): hairlines — card borders, table rules, nav underlines — the page-level echo of the chart's grid.
- **Datum Slate** (`#5A6670`, token `datum`): datum reference lines on the chart face and their labels.
- **Prediction Tint** (`#E4F0F6`), **Residual Tint** (`#F8EEDC`), **Unresolved Tint** (`#F7E7E4`): soft background fills for badges and callouts, always paired with their full-strength sibling for the border or text that carries the meaning.

### Named Rules
**The Reserved Red Rule.** `unresolved` (and its soft tint) appear only for what the record genuinely cannot support: refused constituents, ill-conditioned fits, gauge datum steps, the navigation warning, and a number that fails a stated agreement threshold — two methods on the same constituent, or the same constituent across independently-fitted windows. Every trigger is a named, numeric tolerance somewhere in the code, never a judgment call made in the component. If a use isn't one of those five, it isn't this color.

**The Ruled Surface Rule.** The `grid` token belongs to rulings that carry a measurement — the main chart's own grid, and the small inline scales that borrow its vocabulary on purpose: `FormzahlComparison`'s number-line ticks, `NodalCyclePanel`'s f-range markers, `BeatFigure`'s mean-level reference. Page chrome uses `rule` (its quieter, page-level counterpart) for hairlines that carry no reading — borders, table rules, nav underlines. Repeating `grid` behind prose, where nothing is being measured, is what turns an instrument into wallpaper; repeating it on another ruled scale is the same instrument doing the same job twice.

## Typography

**Display/Prose Font:** Newsreader (fallback: Georgia, Times New Roman, serif)
**UI Font:** Inter Tight (fallback: system-ui, sans-serif)
**Numeric Font:** Roboto Mono, tabular figures (fallback: ui-monospace, monospace)

**Character:** A screen-native serif carrying the register of a scientific report for anything read as prose or judgment, paired with a tight, quiet grotesque for anything operated, and a monospace with locked tabular figures for anything counted. The pairing signals "this is measured, not marketed."

### Hierarchy
- **Hero** (500, 3rem / 48px, 3.25rem line-height, Newsreader): the landing page's single headline only.
- **Display** (500, 2.5rem / 40px, 2.9rem line-height, Newsreader): page-level h1s (e.g. a station name).
- **Headline** (500, 1.75rem / 28px, 2.25rem line-height, Newsreader): section headings.
- **Title** (500, 1.4375rem / 23px, 1.95rem line-height, Newsreader): subsection and card headings.
- **Lead** (400, 1.1875rem / 19px, 1.85rem line-height, Inter Tight): intro paragraphs under a hero or headline.
- **Body** (400, 1rem / 16px, 1.65 line-height, Inter Tight): running prose; 65–75ch reading measure via the `max-w-reading` (38rem) container.
- **Caption** (400, 0.8125rem / 13px, 1.25rem line-height, Inter Tight): table cells, nav labels, secondary metadata.
- **Micro/Eyebrow** (500, 0.75rem / 12px, 0.06em tracking, uppercase, Inter Tight): the small label above a section or stat, and badge text.
- **Numeric** (400, tabular-nums, Roboto Mono): every amplitude, phase, frequency, and condition-number readout. Columns must align and must not reflow as they update — this is a correctness requirement, not a style preference (PRD invariant: figures are tabular everywhere).

### Named Rules
**The Read/Operate/Count Rule.** Three fonts, three jobs, no overlap: Newsreader is for what you read and judge, Inter Tight is for what you operate, Roboto Mono is for what you count. A number outside a mono/tabular context is a bug, not a style choice.

## Layout

Single-column, generous, paper-width content. `max-w-reading` (38rem / ~65ch) bounds running prose; `max-w-page` (76rem) bounds the overall page shell, including the sticky header row and footer. The chart itself is the one element allowed to run the page's full width at generous height — it is the instrument, not a widget, and gets the space to read as one.

Spacing is named by role rather than by scale step: `space-card` (1.25rem) is internal card padding, `space-gutter` (1.25rem) is the page's horizontal margin, `space-block` (1.5rem) separates stacked content blocks, `space-section` (4rem) separates major page sections and sits above the footer. A sticky masthead (`header-height`, 3.5rem) reserves scroll-padding so focus and fragment jumps never land underneath it.

Station sub-navigation is a horizontally-scrollable underline-tab row (`StationNav`) directly under the page header, present on every station view (record, constituents, resolution, comparison, prediction) so the reader always knows which of the five lenses they're in.

## Elevation & Depth

Flat by default; shadow is rare and earned, never a general interactive signal. Depth mostly comes from tonal layering — paper sitting a shade darker than the surfaces resting on it — not from shadow.

### Shadow Vocabulary
- **`shadow-card`** (`0 1px 2px rgb(ink/0.05), 0 1px 8px rgb(ink/0.04)`): the default card lift, and the primary CTA button — marks "this is a distinct, raised sheet on the paper."
- **`shadow-raised`** (`0 2px 4px rgb(ink/0.06), 0 8px 24px rgb(ink/0.06)`): reserved for the rare moment something needs to visibly float above everything else — currently only the skip-to-content link on focus.

### Named Rules
**The Earned Shadow Rule.** A shadow means "this specific surface sits above the paper," never "this element is interactive" or "this element is important." Most cards, most rows, most controls stay flat and rely on a rule (border) instead.

## Shapes

One consistent corner radius carries almost the entire system: `rounded-card` (0.5rem) on cards, buttons, badgeless callouts, and form controls. Alert/callout blocks (the navigation warning, refusal notices, diagnostics callouts) use `rounded-r-card` — radius on the right corners only, because the left edge carries a 4px solid accent border in the alert's color instead, so the two treatments don't compete. Fully round (`rounded-full`) is reserved for pill badges and the small trace-key/legend line-swatches. Small inline icon buttons (social links in the footer) use the plain `rounded`/`rounded-sm` default. The brand mark itself is an exception by design — its own fixed-color SVG tile with an independently chosen ~22% corner radius, described in code as "artwork on its own tile," not a token consumer.

## Components

### Buttons
- **Shape:** `rounded-card` (0.5rem), horizontal padding 1.25rem, vertical 0.625rem.
- **Primary:** filled `prediction` background, `surface` text, `shadow-card`. Hover swaps the fill to `ink` (not a lighter/darker version of the same blue — a deliberate shift to the darkest ink on the site, signalling "committed").
- **Secondary:** outlined — `surface` background, `rule` border, `ink` text. Hover shifts both border and text to `prediction`, no fill change.
- There is no dedicated `Button` component in code; both variants are hand-styled `Link`s at each call site, always with this same pair of class recipes.

### Badges
- **Style:** pill (`rounded-full`), tone-colored border + soft-tint background + full-strength text, `micro` typography, generous horizontal padding relative to height (0.625rem / 0.125rem).
- **Tones:** `prediction` (default/informational — tide character, general tags), `residual`, `unresolved` — always the matching soft/full pair from the same token family, never a mismatched combination.

### Cards
- **Corner Style:** `rounded-card` (0.5rem).
- **Background:** `surface`, with a `rule` 1px border.
- **Shadow Strategy:** `shadow-card` — see Elevation.
- **Internal Padding:** `space-card` (1.25rem).

### Alert / Callout Blocks (signature component)
The left-border-accent pattern is the system's one distinctive structural device, reused identically across the navigation warning, refusal notices, and diagnostic callouts: `rounded-r-card`, a 4px solid left border in the alert's tone color, a soft-tint background at ~60% opacity, and an `eyebrow`-styled title in the same full-strength tone. Three tones carry three meanings — informational note (`prediction`), residual/caution (`residual`), refusal/unresolved (`unresolved`) — and the tone is never chosen for visual variety, only for which of those three the message actually is. A compact variant (no left border, plain `rounded-card` + thin matching-tone border) exists for the same warning inline in tighter spaces, such as within a card.

### Tables
- **Style:** no card wrapper — bare, ruled (`border-collapse`), sitting directly on the page or inside a card. Header cells use `eyebrow` styling; body rows are separated by `rule/60` hairlines with a `sunken/50` hover highlight, no radius, no shadow — tables stay flat and ruled even where cards around them are not.
- **State:** unresolved constituent rows get `unresolvedSoft/70` row background with `unresolved` name text — the same reserved-red language as the callouts, applied at row granularity.
- **Numerals:** every numeric column sits in a `numeric` (tabular-nums, Roboto Mono) context so figures align and don't reflow as they update.

### Navigation
- **Masthead:** sticky, `paper/90` with backdrop blur, bottom `rule` hairline, fixed `header-height` (3.5rem). Logo lockup (BrandMark + serif wordmark) at left; primary links + locale switcher at right. Link default is quiet `inkMuted`, hover adds a `sunken` background and shifts to `ink`; the locale switcher is visually distinct — its own bordered pill that highlights `prediction` on hover, since switching language is a different kind of action than navigating.
- **Station tabs (StationNav):** underline-tab pattern — active tab gets a 2px `prediction`-colored bottom border and medium-weight `prediction` text; inactive tabs have a transparent border that reveals `rule` on hover, text shifting `inkMuted` → `ink`. No background change on any state — the underline alone carries it.
- **Skip link:** visually hidden until focus, then a filled `prediction` pill with `shadow-raised` — the one place `shadow-raised` appears outside its reserved role, because a keyboard user needs it to visibly float above the sticky header it's escaping.

### The Chart (signature component)
The chart is inline SVG built from precomputed path geometry (`lib/chart`), not a component-level visual choice but the project's central artifact, and it carries the system's whole trace vocabulary in one place: the printed `grid` at 0.5px stroke; `datum` reference lines at 0.75–1px, dashed when non-emphasized; the observed trace in `ink` at 1.1px with rounded joins; the predicted/model trace in `prediction` at 2px — deliberately heavier, so agreement reads as the thicker blue line absorbing the thinner ink one; the residual trace in `residual` at 1.1px with its own `residual/50` zero-line; a gauge datum step drawn in dashed `unresolved` — tying the reserved-red language to a real measurement fault, not just UI chrome; and the held-out/extrapolation window rendered as a `sunken` fill sitting behind everything else. No transitions animate any of this except the one deliberate constituent-toggle rebuild.

## Do's and Don'ts

### Do:
- **Do** keep `unresolved`/red exclusive to genuine refusals, ill-conditioned fits, gauge faults, and the navigation warning — never as generic emphasis or a delete/danger affordance unrelated to those meanings.
- **Do** set every amplitude, phase, frequency, and condition-number figure in the `numeric` (tabular, Roboto Mono) style, in a dedicated numeric context so columns align.
- **Do** use the left-border-accent callout pattern (`rounded-r-card`, 4px tone border, soft-tint fill, eyebrow title) for any new alert-level message, choosing the tone from what the message actually is, not for visual variety.
- **Do** keep `grid` scoped to rulings that measure something (the chart, and the inline scales that share its vocabulary); use the quieter `rule` token for page-level hairlines that don't.
- **Do** let hover states shift only color/border/background — never introduce a transition, duration, or easing utility; the flat cut is a deliberate stance the codebase has never broken.

### Don't:
- **Don't** add drop shadows to table rows, nav items, or badges — depth is reserved for `card`/`shadow-card` and the one `shadow-raised` exception on the skip link.
- **Don't** retune `prediction` or `residual` independently of each other — they were validated together for colorblind separation and contrast, and moving one without the other can break that pairing.
- **Don't** animate the Rayleigh slider's fit result or any other discontinuous computed value; a redraw, not a transition, is the honest representation of a fit that genuinely jumps.
- **Don't** introduce a fourth "read" typeface or a second monospace — Newsreader/Inter Tight/Roboto Mono is a closed set tied to the Read/Operate/Count rule, not a starting palette to extend.
