# PRD — Pasut

**Fit the tide from real observations, then predict it forward — and see why fifteen days of data can't tell you what six months can.**

| | |
|---|---|
| **Status** | Draft — pre-implementation |
| **Owner** | Andi Fathul Mukminin Salahuddin |
| **Type** | Personal portfolio project, open source, educational |
| **Deployment** | GitHub Pages (static export, no server, no runtime network) |
| **Language** | Indonesian-first UI; English secondary. Oceanographic terms stay in English or standard Indonesian usage. |
| **Observation data** | IOC Sea Level Monitoring / UHSLC (open). BIG as an adapter if terms permit — see §4. |

*Name: **Pasut**, the standard Indonesian contraction of pasang surut. Explanatory to the audience that matters. English alternative: **Tide Analysis**.*

---

## 1. The idea

Tide height at a place is a sum of cosines. What makes it predictable is that **the frequencies are astronomical and universal** — the M2 constituent has the same 12.42-hour period in Balikpapan as in Bristol, because it comes from the Moon's orbit, not from local geography.

Only **amplitude and phase** are local. Those two numbers per constituent are what a coastline does to the forcing, and once you have them the tide is arithmetic forever.

Getting them is called **harmonic analysis**: a least-squares fit of amplitudes and phases to a record of observed sea level. That fit is the project.

## 2. Why analysis, not lookup

A tide predictor that reads published constants and sums cosines is an afternoon's work and demonstrates nothing. **Deriving the constants from real observations is the interesting half**, and it makes three things visible that a lookup tool hides.

**The Rayleigh criterion.** Two constituents can only be separated if the record is long enough for them to drift a full cycle apart. Fifteen days resolves the major ones; K1 and P1 need roughly six months, as do S2 and K2. **Ask a short record for too many constituents and the fit becomes unstable in a specific, showable way** — the design matrix approaches singularity and the amplitudes blow apart.

This is the same mathematics as the time-frequency tradeoff in a spectrogram: resolution costs observation length. Making it a slider — record length against resolvable constituents, with the condition number displayed — is the single best thing in the app.

**Method disagreement.** Indonesian practice uses two approaches: the **Admiralty** method and **least squares**, and comparing them at a site is a live published question. Same record, two methods, constants side by side.

**Validation you can see.** Fit on part of the record, predict the held-out part, plot both. Residuals are the honest measure and most tide tools never show one.

## 3. Indonesia is an unusually good subject

Tide type is classified by the **Formzahl number**, F = (K1 + O1) / (M2 + S2), and the archipelago has all four regimes. Published values include **0.557 at Segara Anakan** and **0.35–0.39 in Teluk Balikpapan**, both mixed tending semidiurnal; **Teluk Banten** as mixed tending diurnal; and **Tanjung Priok** as diurnal.

Four ports, four different tidal characters, identical physics — that contrast is the educational core, and it needs no invention.

Balikpapan Bay also has documented **tidal asymmetry**, where interaction between M2, S2 and the shallow-water MS4 skews the ebb, and asymmetry increases upstream in the estuary. Shallow-water constituents are where tide gets genuinely interesting, and they're on your doorstep.

## 4. Data

**Observation records are the input, not constants.**

**Primary: IOC Sea Level Monitoring Facility and UHSLC.** Both carry Indonesian stations under clear open terms. This is the launch path — no permission to seek.

**BIG as an adapter, if terms permit.** `tides.big.go.id` serves records from BIG's permanent station network, placed at ports around the archipelago, referenced to SWL = 0. BIG also has a **Model Pasut** product providing harmonic constants and tidal datums (HAT, MSL, LAT), built from altimetry plus station observations assimilated into hydrodynamic equations. **Whether either is redistributable is unverified** — check before shipping, and until then BIG is an adapter that ships disabled behind the licence gate.

The adapter pattern matters here for the same reason as elsewhere: sources normalise into one internal record format and nothing downstream branches on provenance.

**Constants are never shipped as data.** They are computed from records, in the browser, and displayed with the record and method that produced them.

## 5. Non-goals

- **Not for navigation.** Pushidrosal publishes the official tide tables and those are what mariners use. A wrong low tide grounds a boat. Stated prominently, not in a footer.
- **No storm surge, no meteorological effects, no sea level rise projection.** Harmonic tide only; everything else is residual and labelled as such.
- **No global coverage.** Indonesian stations, plus whatever the open sources carry.
- **No real-time feed.** Records are bundled at build time; the app is offline.
- **No accounts, no server.**
- **No ML.** Least squares and Admiralty, both classical and both inspectable.

## 6. Features

### 6.1 The record — signature view
Observed sea level as a continuous trace, with the fitted prediction overlaid and the **residual drawn beneath as its own band**. The residual is where the honesty lives: it holds weather, surge, and everything the harmonic model doesn't explain, and its size tells you how much to trust the fit.

Fit window and validation window are shaded distinctly, so you can see the model being tested on data it never saw.

### 6.2 The constituent table
Amplitude, phase, and frequency per constituent, with the ones the record cannot honestly resolve **marked as unresolved rather than reported**. Sorted by amplitude, so the two or three that dominate a site are immediately obvious.

### 6.3 The Rayleigh slider
Record length against constituent set. As the window shortens, constituents that can no longer be separated grey out, and the **condition number of the design matrix** is displayed rising. Push it past the limit and watch the fit destabilise — the visible version of an ill-posed problem.

### 6.4 Formzahl and tide type
Computed from the fitted constants, with the classification named and the four Indonesian examples available for comparison on one screen. This is the shareable moment: four ports, four shapes, one physics.

### 6.5 Method comparison
Least squares against Admiralty on the same record. Constants side by side, differences highlighted, both cited to their standard description.

### 6.6 The constituent explorer
Toggle constituents on and off and watch the predicted curve rebuild. Start with M2 alone — a clean twice-daily wave — then add S2 and watch the spring-neap cycle emerge from the beat between them. **That beat is the fortnightly rhythm everyone has noticed and few can explain**, and it appears from two cosines.

### 6.7 Prediction
Forward prediction for a chosen date range, with high and low water times and heights, plus a stated datum. Nodal corrections applied, and the correction shown rather than buried.

### 6.8 Method disclosure
Which record, which station, which source and licence, which constituents fitted, which method, what the residual RMS is. Linked from the plot.

## 7. Architecture

Static Next.js 14 App Router export. No backend, no runtime network.

```
station record (bundled)
  → design matrix (astronomical arguments per constituent)
  → least squares solve  → amplitudes + phases + condition number
  → nodal corrections    → constants at epoch
  → prediction           → height series, extrema
                         → record | constituents | Rayleigh | comparison
```

**`lib/tide` is pure and runs in Node.** Typed arrays in, results out. No DOM, no React, no clock, no network — which is what makes the numerical claims testable rather than eyeballed.

**Astronomical arguments are computed, not tabulated.** Constituent frequencies and equilibrium arguments derive from the standard Doodson formulation over the lunar and solar elements. This is real, citable astronomy and it is the part that makes the tool a tool rather than a spreadsheet.

**Nodal corrections are explicit.** The 18.6-year lunar node cycle modulates amplitudes and phases; the f and u factors are applied, cited, and surfaced in the UI rather than folded silently into the constants.

**The solver reports its own conditioning.** Condition number computed and returned with every fit. A solver that returns numbers without indicating whether they mean anything is the failure mode this project exists to expose.

**Refuse rather than overfit.** Requesting a constituent set the record cannot resolve under Rayleigh returns a structured refusal naming which constituents conflict and what record length would be needed. Never return unstable amplitudes as though they were results.

**Times are integer seconds in UTC.** No `Date` in the numerical core, no timezone handling inside the fit; local time is a display concern.

## 8. Testing

**Synthetic ground truth — the backbone.** Generate a record from known constants, add known noise, fit it, and assert the recovered amplitudes and phases match within tolerance. You control the answer, so correctness is provable rather than plausible. Sweep across noise levels, record lengths, and constituent sets.

**Rayleigh behaviour, asserted in both directions.** A record long enough to separate two constituents recovers both; a record too short is refused, not silently fitted. The condition number rises as the window shortens.

**Round-trip.** Fit a real record, predict the fitted window, and assert the residual RMS falls below a stated threshold. Then predict a held-out window and assert it degrades gracefully rather than catastrophically.

**Astronomical arguments** checked against published values for known epochs — constituent frequencies and equilibrium arguments are standard and tabulated, so they are directly verifiable.

**Nodal corrections** asserted against published f and u values across the 18.6-year cycle.

**Method agreement.** Least squares and Admiralty must agree on the major constituents within a stated tolerance on the same record. Divergence beyond that is a bug in one of them, and the test says which.

**Formzahl classification** fixture-tested against the published Indonesian values in §3.

**Determinism.** Same record, window, and constituent set produce byte-identical constants.

## 9. Design direction

The material world is the **marégraphe chart** — the paper drum of a mechanical tide gauge, where a pen traced sea level continuously onto a ruled roll for weeks at a time. Ruled grid, a single continuous ink line, annotations in the margin. The instrument's own visual language, and it happens to be exactly the right one for a long continuous trace.

**Palette.** Chart paper `#F2EFE4`. Grid `#C7C3B2`, printed and always present, because a tide chart is nothing without its ruling. Trace ink `#1B2A2E`, near-black with a marine cast, for the observed record. **Prediction teal `#2E7A85`**, overlaid on the observation so agreement reads as the two lines merging. **Residual ochre `#B5822E`** in its own band beneath — visible, never hidden. **Unresolved red `#B0392B`** reserved for constituents the record cannot support and for a fit that has gone ill-conditioned. Datum lines in a pale slate.

**Type.** **Newsreader** for prose and headings — a screen-native serif with the register of a scientific report. **Inter Tight** for controls and labels. **Roboto Mono** with tabular figures for constituent tables, amplitudes, phases, and the condition number; these are columns of numbers that must align and must not reflow as they update.

**Structure.** The chart takes the full width at generous height, ruled, with the datum, MSL, HAT and LAT as labelled horizontal references — a real tide chart carries its datums on the face. The residual band sits directly beneath on the same time axis, no gap, so a spike in one lines up exactly with a deviation in the other. The constituent table sits alongside as a printed column.

**Motion.** One orchestrated moment: toggling a constituent, and the prediction curve rebuilding as that cosine is added or removed — the spring-neap beat visibly emerging when S2 joins M2. The Rayleigh slider redraws rather than transitions, because the fit is discontinuous and animating it would imply otherwise.

**Copy.** Indonesian first, in the vocabulary the field uses — *pasang surut*, *pasut*, *komponen harmonik*, *amplitudo*, *fase*, *muka air rata-rata*, *purnama-perbani*. Constituent names stay in their standard form. The navigation warning is stated once, plainly, and prominently.

## 10. Milestones

| | | |
|---|---|---|
| **M0** | Astronomy | Scaffold; constituent definitions, Doodson arguments, nodal corrections. Verified against published values. **No UI.** |
| **M1** | The fit | Design matrix, least-squares solver, condition reporting, Rayleigh refusal. Synthetic ground-truth suite green. Console only. |
| **M2** | The chart | Record loading, observed and predicted traces, residual band, constituent table, datums. **Ship publicly here.** |
| **M3** | Rayleigh | The slider, unresolved marking, condition number display, instability demonstration. **The reason the project exists.** |
| **M4** | Character | Formzahl, tide type, the four-port comparison, constituent explorer. |
| **M5** | Methods | Admiralty implementation, side-by-side comparison, agreement tests. |
| **M6** | Prediction | Forward prediction, high and low water tables, datum handling, export, sharing. |

M0 having no interface is deliberate: the astronomy must be right before anything is drawn, and it is the layer where an error is invisible in the output.

## 11. Success criteria

- Synthetic records recover known constants within tolerance across the noise and length sweep.
- Rayleigh refusal fires correctly in both directions; condition number tracks window length as predicted.
- Astronomical arguments and nodal factors match published values.
- Least squares and Admiralty agree on major constituents within tolerance on real records.
- Formzahl classification reproduces the published Indonesian values.
- Held-out prediction degrades gracefully; residual RMS reported honestly and never suppressed.
- Every station record carries its source, station id, period, and licence.
- The navigation warning is unmissable.
- Fully offline after first load. JS ≤ 250 KB gzipped, excluding records.

## 12. Deployment

`output: 'export'`, `basePath` matching the repository name, `.nojekyll` in the output root. Station records ship as separate chunks, bundled at build time. Source validation gates the deploy — every record needs a resolved licence. Fonts self-hosted via `next/font`. Verify under the production `basePath` with `pnpm preview` before pushing.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Someone uses it for navigation.** | Prominent, repeated statement; Pushidrosal named as the official source. Not a footer disclaimer. |
| **A subtly wrong astronomical argument produces a plausible-looking wrong tide.** | Published-value verification at M0, before any UI. The synthetic ground-truth suite catches the rest. |
| **Overfitting a short record and reporting nonsense confidently.** | Rayleigh refusal, condition number surfaced, unresolved constituents marked rather than reported. This is the project's central honesty mechanism. |
| **BIG data licence unverified.** | Ships disabled behind the licence gate; IOC and UHSLC carry the launch. |
| **Ill-conditioned solves silently returning garbage.** | Condition number computed on every fit and returned with the result, never optional. |
| **Datum confusion** — records referenced to different zeros. | Datum is a first-class field on every record, displayed on the chart face, never assumed. |
| **Scope creep into surge or sea-level-rise modelling.** | §5 is binding. Everything non-harmonic is residual, and residual is displayed rather than modelled. |
