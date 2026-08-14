---
target: Pasut — whole site (multi-view)
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-14T01-03-05Z
slug: pasut-whole-site-multi-view
---
Method: dual-agent (A: isolated design-review sub-agent · B: isolated detector-evidence sub-agent, run in parallel, no shared context)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | `sr-only` status regions, always-visible κ, loading states in `RayleighSlider`/`FitWindowControl`. |
| 2 | Match System / Real World | 3 | Domain-authentic vocabulary throughout, but `DerivationPanel`'s six Doodson symbols (τ, s, h, p, N, p′) are never glossed on the page. |
| 3 | User Control and Freedom | 3 | Sliders/toggles present; no reset affordance beyond re-dragging, and no bookmarkable state (see below). |
| 4 | Consistency and Standards | 3 | The left-border callout pattern is real and reused in concept, but 10 of its 13 occurrences hand-roll the classes instead of importing `ui/index.tsx`'s `Callout`, and three of those hand-rolled copies drop the corner radius the other seven keep — a visual-consistency risk the component was built to prevent. Downgraded from the design-review agent's independent 4/4 once the detector's file-by-file evidence surfaced this. |
| 5 | Error Prevention | 4 | The Rayleigh refusal *is* the error-prevention mechanism — it fires before a misleading number renders. |
| 6 | Recognition Rather Than Recall | 3 | `TraceKey`/`StationNav` repeat consistently, but the universal Rayleigh ladder (`/resolusi`) and the per-station one (`/resolusi/[station]`) split the same subject across two routes a reader must remember to reconcile. |
| 7 | Flexibility and Efficiency of Use | 3 | `useDeferredValue` keeps sliders responsive, but no URL-state sync means no way to link or bookmark a specific fit window — a real gap for the technical-peer half of the audience. |
| 8 | Aesthetic and Minimalist Design | 4 | Flat-by-default, one reserved alarm color, disciplined type scale — restraint is the design, and it holds under a five-view audit. |
| 9 | Error Recovery / Diagnosis | 4 | `RefusalNotice` names the conflicting pair, required days, available days, and links to `LeakagePanel` — exemplary, not generic. |
| 10 | Help and Documentation | 3 | `/metode` exists and κ is explained inline in `FitDiagnostics`, but discoverability is one caption link at the bottom of `/catatan`. |
| **Total** | | **34/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: This is authored, not templated. The "Marégraphe" concept survives contact with real mechanism, not just palette: `BrandMark.tsx` draws a solid-fitted/dashed-extrapolated stroke as its own logo; `BeatFigure.tsx` draws K1 and P1 literally drifting out of phase across four snapshots to make the Rayleigh criterion's T = 360°/Δσ visible instead of stipulated; `DerivationPanel.tsx` walks one constituent from Doodson coefficients to V(t) to (a,b) to (H,g) against a real timestamp; `RecoveryPanel.tsx` is the one place on the site with an answer key. A generic analytics-dashboard template could not produce `CorrelationPanel`'s triangular matrix or `NodalCyclePanel`'s f-swing bars without doing the same domain work this project did. The reserved-red rule is enforced structurally through `Badge`/`Callout` tone props, and the refusal is written as a first-class result type rather than an error toast.

**Deterministic scan**: `detect.mjs --json app components` returned 18 findings (17 warning, 1 advisory) across 3 rules: `design-system-font` ×4, `design-system-radius` ×1, `side-tab` ×13. Verified against source, all 4 `design-system-font` hits and the 1 `design-system-radius` hit are false positives — the regex doesn't resolve Tailwind's `theme('fontFamily.ui')` calls to the DESIGN.md-declared font they actually name, and the flagged `border-radius: 2px` shapes a `:focus-visible` outline, not a card or button. The 13 `side-tab` (`border-l-4`) hits are where the two assessments genuinely disagree with what a surface read alone would conclude: the pattern itself is real and intentional (DESIGN.md documents it as the system's signature structural device), but only 3 of the 13 occurrences are the actual `Callout` component (`ui/index.tsx:129/133/137`, its three tone branches). The other 10 — `NavigationWarning.tsx`, `Diagnostics.tsx` ×3, `RayleighResults.tsx`, `RecoveryPanel.tsx`, `StabilityPanel.tsx`, `BeatFigure.tsx`, `ConstituentExplorer.tsx`, `DerivationPanel.tsx` — reproduce the identical class recipe by hand without importing the component built for exactly this, and the copies have already started drifting (radius present in some, silently dropped in others). `side-tab` is also the detector's own name for "the most recognizable tell of AI-generated UIs" — a pattern this codebase canonized deliberately is simultaneously the one visual signature most likely to read as generic if the duplication keeps spreading unchecked.

**Visual overlays**: Not available this run. No Puppeteer install and no browser-automation tool were exposed in this session, so live-page/URL scanning and screenshot overlay evidence could not run; findings above are from static source analysis and manual file review only, not a rendered-page pass.

## Overall Impression

Pasut is a design system that earns its restraint — every color, every font, every flat surface is load-bearing, and three components (`BeatFigure`, `DerivationPanel`, `RecoveryPanel`) do real pedagogical work no template could fake. The biggest opportunity isn't visual: it's that the system's one distinctive structural device (the left-border callout) is drifting into hand-rolled duplication across 10 files instead of being enforced by the component that already exists for it, and the site's most engaged interaction (the constituent explorer) currently asks a first-time reader to parse 10 ungrouped options at once.

## What's Working

- **`Diagnostics.tsx`'s `RefusalNotice`/`FitDiagnostics`** treat refusal and ill-conditioning as structured, named results (conflicting pair, required days, available days) rather than generic error UI — PRD principle 2 made literally visible in markup, and independently the strongest heuristic score on the site (Error Recovery, 4/4).
- **`BeatFigure.tsx` and `RecoveryPanel.tsx`** are demonstrations a generic template could not produce: one draws the literal beat-drift mechanism behind the Rayleigh criterion across four time snapshots; the other is the site's only self-checkable result (synthetic answer key vs. fitted output).
- **The reserved-red discipline holds structurally**, not just by convention — `Badge`/`Callout` tone props in `ui/index.tsx` are the only path to the `unresolved` color family, so no view can accidentally reach for alarm red as decoration.

## Priority Issues

**[P0] `ConstituentExplorer` exceeds the working-memory limit at its single most-used decision point.**
- **Why it matters**: `components/ConstituentExplorer.tsx` renders every constituent (M2, S2, K1, O1, N2, P1, K2, Q1, M4, MS4 — up to 10) as flat, ungrouped toggle pills plus two utility buttons, all visible simultaneously. This is the app's own doc-commented "most engaged control" and the one place a first-time reader is asked to make a real choice; per the cognitive-load checklist, 10+ simultaneous options with no grouping is a hard failure of the ≤4-visible-options rule, and it works against the "M2 alone → add S2 → beat emerges" narrative the component exists to tell.
- **Fix**: Group toggles by species (semidiurnal / diurnal / shallow-water) under small sub-labels; default non-primary groups visually receded so the M2→S2 story stays the obvious first move.
- **Suggested command**: `$impeccable distill`

**[P1] The signature callout pattern is duplicated by hand in 10 files instead of reused, and has already started to drift.**
- **Why it matters**: `ui/index.tsx`'s `Callout` component exists specifically to enforce DESIGN.md's left-border-accent rule (4px tone border, soft-tint background, eyebrow title) consistently. Only 3 of 13 actual usages call it. The other 10 — including the safety-critical `NavigationWarning` — hand-roll the same class recipe, and the copies already disagree with each other: `rounded-r-card` is present in some (`NavigationWarning.tsx:32`, `Diagnostics.tsx`) and silently absent in others (`RecoveryPanel.tsx:96`, `StabilityPanel.tsx:113`, `BeatFigure.tsx:77`, `ConstituentExplorer.tsx:147`, `DerivationPanel.tsx:139`). Left alone, this is exactly how a deliberate, documented signature device degrades into the generic "AI slop tell" its own detector rule is named for.
- **Fix**: Replace all 10 hand-rolled instances with `&lt;Callout tone="..."&gt;`, extending its prop surface if a caller needs something the component doesn't yet expose, rather than re-deriving the classes.
- **Suggested command**: `$impeccable polish`

**[P1] No URL-state sync on the interactive controls the technical audience most needs to cite.**
- **Why it matters**: `RayleighSlider` and `FitWindowControl` hold window-length/split entirely in component state. PRODUCT.md names technical peers evaluating this as a portfolio piece as half the intended audience, but nothing a reader reaches by dragging a slider is linkable — a reviewer can't say "look at Benoa at 15 days," they have to describe steps. This is also the state that produces the app's most honest moment (a refusal); that moment currently can't be pointed at.
- **Fix**: Mirror `days`/`percent` into the query string on change and read it as the initial value — static export needs no server round-trip for this.
- **Suggested command**: `$impeccable harden`

**[P1] `DerivationPanel`'s astronomical notation is unglossed, undercutting its own purpose.**
- **Why it matters**: `DerivationPanel.tsx`'s `ELEMENTS` array uses six Doodson symbols (τ, s, h, p, N, p′) with zero inline gloss, unlike κ, which gets an explanatory line in `FitDiagnostics`. Per CLAUDE.md this panel exists explicitly so "a newcomer could follow the process" — but a lay reader hits unexplained notation at the exact moment the page is trying to teach them the inverse problem, which is the site's stated educational core.
- **Fix**: Add a one-line legend under the element row naming each symbol in plain Indonesian, the same way `kappa.what`/`kappa.meaning` already model for κ.
- **Suggested command**: `$impeccable clarify`

**[P2] `/catatan` stacks seven sections in one unbroken scroll with no pacing.**
- **Why it matters**: Chart → κ diagnostics → two RMS cards → reading callout → constituent table → stability panel → derivation panel, all on PRD's stated "signature view," with no anchor nav or progressive collapse. A first-time reader has no waypoint for how much is left or where they are.
- **Fix**: Add a short in-page contents strip under the section header, or collapse the stability/derivation panels behind `&lt;details&gt;`, the way `StationHeader` already collapses provenance.
- **Suggested command**: `$impeccable layout`

## Persona Red Flags

**Jordan (first-timer)**: Lands on `/catatan` and must parse κ, an RMS pair, an 8-column numeric table, and Doodson notation in one uninterrupted scroll (P2). `DerivationPanel`'s unglossed symbols (P1) hit this persona hardest of all, despite the panel being written specifically for them per CLAUDE.md.

**Casey (mobile)**: `ConstituentExplorer`'s 10-toggle row (P0) wraps into a dense, ungrouped multi-row grid on narrow viewports with nothing to anchor a thumb-scan. `StationNav`'s five-tab horizontal-scroll strip has no fade/arrow cue that "prediksi" sits off-screen — easy to never discover the fifth lens exists.

**Project-specific — "the portfolio auditor" (the technical half of PRODUCT.md's declared dual audience)**: Wants to verify and cite a specific claim — a particular refusal, a particular κ at a particular window — but can't: `RayleighSlider`/`FitWindowControl` state is unshareable (P1). This is the exact persona the site's honesty mechanism is aimed at, and it's the one persona who can't produce a permalink to the evidence.

## Minor Observations

- `StationNav.tsx:24` and `NavigationWarning.tsx:32` use raw `-mx-5`/`px-5` instead of the semantic `gutter` token that `ui/index.tsx`'s `Scroller` already uses correctly for the identical value — same design decision, two different implementations in the codebase.
- `components/chart/TideChart.tsx`'s `&lt;figure className="w-full overflow-x-auto"&gt;` doesn't use the `Scroller` wrapper's `role="region"`/`tabIndex`/`aria-labelledby` pattern the way `ConstituentTable.tsx` does; low practical risk since the SVG scales to its container today, but inconsistent with the a11y pattern the codebase otherwise applies to scrollable content.
- `StationNav`'s horizontal-scroll strip has no visual affordance (fade/arrow) hinting more tabs sit off-screen on narrow viewports.
- `/resolusi` (universal ladder) and `/resolusi/[station]` (per-station ladder) cover overlapping ground under different framings; well-reasoned in code comments, but costs a reader some reorientation between the two.
- The homepage's "Constants shipped: 0" stat was deliberately cut per its own inline comment — a self-correcting design decision worth noting as evidence the team already catches some of these on their own.

## Questions to Consider

- If the constituent explorer is the single most engaging interaction on the site, why does it default to reading like a footnoted disclaimer ("not a refit") instead of leading with the beat-emergence moment as the actual hero interaction?
- The refusal is treated as an honest, first-class result everywhere in copy and code — so why does the interactive state that produces one still vanish on refresh? Shouldn't the site's most honest moment be the easiest one to point someone else at?
- The callout pattern was documented as *the* signature device in DESIGN.md this session — now that it's visible that 10 of 13 uses don't call the component built for it, is the fix mechanical (swap in `Callout`) or does the pattern need a second look at whether it's earning its "signature" status?
