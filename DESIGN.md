---
name: Pasut — Tide Analysis
description: A tidal harmonic analysis instrument styled as a hydrographic plotting table — cool chart paper, a night watch in the dark, computed constants and honest refusals.
colors:
  paper: "#F2F5F6"
  surface: "#FFFFFF"
  sunken: "#E7EDF0"
  ink: "#0B2533"
  ink-muted: "#41566A"
  ink-faint: "#56697A"
  grid: "#C6D3D9"
  rule: "#D8E1E5"
  prediction: "#0068A6"
  residual: "#B8740C"
  residual-text: "#8A5508"
  unresolved: "#BE3428"
  datum: "#596A78"
  prediction-soft: "#E1EFF7"
  residual-soft: "#F7EEDD"
  unresolved-soft: "#FBE9E6"
  night: "#071A26"
  night-ink: "#DCE7EC"
  night-prediction: "#53B6EC"
  night-residual: "#E3A13A"
  fz-1: "#C3B5E8"
  fz-2: "#9A82D6"
  fz-3: "#7158BD"
  fz-4: "#4B3391"
colors-dark:
  paper: "#06131B"
  surface: "#0C1E29"
  sunken: "#0A1922"
  ink: "#E4EDF1"
  ink-muted: "#A9BAC4"
  ink-faint: "#8EA0AC"
  grid: "#1D3646"
  rule: "#18303E"
  prediction: "#53B6EC"
  residual: "#E3A13A"
  residual-text: "#EBB561"
  unresolved: "#FF7A6B"
  datum: "#93A3AE"
typography:
  hero:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: "1.04"
    letterSpacing: "-0.045em"
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: "2.75rem"
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.4375rem"
    fontWeight: 700
    lineHeight: "1.95rem"
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: "1.85rem"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.65rem"
  caption:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  micro:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1.0625rem"
    letterSpacing: "0.08em"
  numeric:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    fontFeature: "tnum"
  accent:
    fontFamily: "Newsreader, Georgia, serif"
    fontStyle: "italic"
    fontWeight: 400
rounded:
  card: "0.75rem"
  full: "9999px"
spacing:
  card: "1.25rem"
  gutter: "1.25rem"
  block: "1.5rem"
  section: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0.625rem 1.25rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "{colors.rule}"
    rounded: "{rounded.full}"
    padding: "0.625rem 1.25rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
---

# Design System: Pasut — Tide Analysis

## Overview

**Creative North Star: "The Plotting Table"**

A hydrographic office's chart table: cool paper under daylight, a ruled chart that a reader takes measurements from, and seas lettered in italic. In the dark theme it becomes the night watch. The chart is the instrument and gets the most space and the most colour on every screen. The interface around it stays quiet.

It replaced, in October 2026, a warm-cream "marégraphe" look with serif headlines. That look read as an essay about the numbers rather than an instrument producing them, and it kept the chart at card scale. The principles underneath carried over unchanged.

Two audiences read the same surface: a lay Indonesian reader drawn by curiosity, and a technical peer auditing the engineering. They get legible prose and plain-language stages for the first, and exact tabular readouts and a visible κ for the second.

**Key characteristics**
- **Colour means data.** The three series and the reserved red carry meaning. Actions, links, focus and active states are ink, so blue on screen always means the fitted model.
- **One bold surface.** The night band sits behind the home hero only. Everything else is calm paper.
- **Two designed themes.** Light and dark are each measured. Dark is not an inversion.
- **The inverse problem is the navigation.** Every station is worked through four stages in order: Rekam → Urai → Uji → Ramal.
- **Motion is rare and honest.** Colour transitions and one chart draw-in. Nothing computed ever tweens.

## Colours

Every token is an RGB channel triple in `:root` (`app/globals.css`), redefined for the dark theme under both `prefers-color-scheme: dark` (unless the reader chose light) and `[data-theme='dark']`. Components name tokens only; `tailwind.config.ts` holds no literals.

### The three series
- **Prediction** (`#0068A6` / dark `#53B6EC`): the fitted model, and nothing else. It is drawn heavier than the observation, so agreement reads as the blue line absorbing the ink one.
- **Residual** (`#B8740C` stroke, `#8A5508` text / dark `#E3A13A`, `#EBB561`): what the model does not explain. The stroke sits under the text floor on purpose, so use `residualText` for type.
- **Observation** is **ink**: the thin line.

Blue and ochre were chosen as the pair that survives every common colour-vision deficiency, and they sit in different lightness bands in both themes. Re-tune them together or not at all.

### Reserved red
**Unresolved** (`#BE3428` / dark `#FF7A6B`) is used only for refused constituents, ill-conditioned fits, gauge datum steps, the navigation warning, and a number that fails a stated agreement tolerance. Never for hover, emphasis or decoration.

### Neutrals
Paper `#F2F5F6` (cool, a slight sea-blue bias), surface `#FFFFFF`, sunken `#E7EDF0`, ink `#0B2533`, muted `#41566A`, faint `#56697A`, plus two hairlines: `grid` for rulings a reader measures from, `rule` for page chrome. Dark equivalents are in the front matter.

### The night band
`night` `#071A26` with its own ink set. Inside `.night` the series and ink tokens re-scope to the band, so a `TideChart` placed there reads correctly with no changes. Measured on the band: observation 14.1:1, prediction 7.8:1, residual 8.0:1.

### Tide character
`fz-1`…`fz-4` form an ordered single-hue violet ramp, from two tides a day to one. Violet so it can never be read as a series. It is used for fills only, and the class name is always printed beside it. In the dark theme the ramp flips, so "more diurnal" stays "more contrast".

### Contrast
Every colour used as text clears 4.5:1 on paper, surface, sunken and its own tint, in both themes. The tightest pairing is faint ink on the prediction tint at 4.84:1. Graphical strokes clear 3:1.

### Named rules
**The Colour-Means-Data Rule.** If a colour is not one of the three series, the reserved red, or the Formzahl ramp, it is ink or a neutral. A button the colour of the model trace says "the model" when it means "click".

**The Reserved Red Rule.** As above. Every trigger is a named numeric tolerance in code, never a judgement made in a component.

**The Ruled Surface Rule.** `grid` belongs to rulings that carry a measurement (the chart, the atlas graticule, the spectrum scale, inline Formzahl and nodal scales). Page chrome uses `rule`.

## Typography

| Role | Face | Use |
|---|---|---|
| Read and operate | **Plus Jakarta Sans** 400–800 | headings, body, controls. Drawn by Tokotype, an Indonesian foundry, and it holds up over long Indonesian prose. |
| Count | **IBM Plex Mono** 400/500, tabular | every amplitude, phase, frequency, κ, date in a readout. Slashed zero, distinct 1/l. |
| Accent | **Newsreader** italic | one phrase in the hero, and sea names on the atlas, the way nautical charts letter water. Never a heading system. |

Scale (ratio 1.2 from 16px): 12 · 13 · 16 · 19 · 23 · 28 · 40 · 60. Headings are 700, page titles 800 with tracking tightened as size grows.

**The Read/Operate/Count Rule** still holds. A number outside a mono, tabular context is a bug.

## Layout

`max-w-page` (76rem) bounds the shell and `max-w-reading` (38rem) bounds prose. The home hero breaks out edge to edge (`mx-[calc(50%-50vw)]`, with `overflow-x-clip` on the layout root).

**Charts** keep their viewBox aspect ratio. Below 36rem they scroll sideways inside a focusable frame instead of shrinking into a letterboxed strip.

### Navigation
- **Masthead**: the lockup, then **Stasiun · Pelajari · Metode** (pill links, the active one on `sunken`), the language switch, and the theme toggle (system → light → dark).
- **Station header**: breadcrumb, station name, a **station switcher** (a native `<details>`, keeps the reader on the same stage), the Formzahl pill, and provenance (period, datum, gaps, source) in a ruled strip.
- **Stage nav**: four stages, numbered because they are a sequence. On wider screens it is a row of four with the active stage underlined in ink. On phones the same element is a bar fixed to the bottom, and `body:has([data-stage-bar])` reserves its height. Uji adds a second switch between **Resolusi** and **Banding**.
- **Page index**: long views carry an "On this page" row of jump links.

## Elevation and shape

Flat by default. `shadow-card` is for raised sheets and primary buttons, and `shadow-raised` is for floating things (the crosshair readout, the switcher menu, the skip link). Shadows are their own variables, because ink turns pale in the dark theme.

Cards use `rounded-card` (0.75rem). Buttons, pills, switches and badges are fully round. Callouts keep the left-border accent (`rounded-r-card`, 4px border in the tone colour).

## Motion

- **Colour transitions** of 150ms on hover and focus (`ease-tide`). Colour only, never layout.
- **Chart draw-in** once, on the home chart only. It is staggered by duration, never by delay: a delayed trace waits at its invisible start, and a stalled clock (a background tab, a renderer capturing the page) would leave it missing. The resting state is fully drawn.
- **Crosshair** follows the pointer instantly. It reports samples, and a sample does not glide.
- **The constituent toggle rebuild** is unchanged.
- **Never animated**: the Rayleigh slider's result, κ, refusals, or any fitted number. A fit that jumps must redraw rather than tween, or the motion would imply a continuity the numbers do not have.
- `prefers-reduced-motion` turns the draw-in off entirely and shortens everything else to nothing.

## Components

- **ButtonLink** (`components/ui`): the one action recipe. Primary is an ink pill; secondary is outlined.
- **Callout**: note (neutral ink), warning (residual), refusal (unresolved).
- **FormzahlPill / FormzahlSwatch**: a tide character on the ramp, always with its label and F.
- **PageIndex**: the "On this page" row.
- **TideChart**: grid, datum lines, held-out band, observation (ink, 1.1px), model (prediction, 2px), residual band, datum-step marks in reserved red, and the **crosshair** (`ChartCrosshair`), which shows a timestamp in the record's local zone and the three heights. Over a gap it shows nothing.
- **StationAtlas**: Natural Earth coastline on `rule`, dashed graticule, italic sea names, gauge marks sized by F and filled from the ramp. Every mark links to its station.
- **ConstituentSpectrum**: one panel per species on a shared amplitude scale. Unresolved constituents are a dashed red mark with the record length they need, and no bar.

## Do's and don'ts

**Do**
- reach for ink for anything a reader clicks;
- set every number in the mono with tabular figures;
- check both themes when adding a token, and measure the contrast;
- keep the navigation warning beside every predicted height, on every view.

**Don't**
- use prediction blue for an action, or the reserved red for anything but its five meanings;
- animate a computed result;
- add a fourth typeface, or use the serif for headings;
- put `grid` behind prose.
