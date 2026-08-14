# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dual audience, confirmed:

- **Curious general public and students** — Indonesian-first, drawn in by wanting to understand why tides are predictable at all, and to see the Rayleigh honesty mechanism (a short record refusing to answer) made visible rather than asserted.
- **Technical peers evaluating the work as a portfolio piece** — other engineers, oceanography-adjacent readers, potential employers, who judge it on whether the astronomy is actually derived, the solver actually reports its own conditioning, and the code holds up to inspection (`lib/astro`, `lib/tide` pure and tested).

Both audiences are load-bearing: copy and structure must stay legible to a lay Indonesian reader, while the method disclosure, tests, and pure numerical core must satisfy someone auditing the engineering.

## Product Purpose

Fits tidal harmonic constituents (amplitude, phase) from real sea-level observations by least squares, then predicts forward from those fitted constants. Exists to make the inverse problem — deriving constants from a record, rather than looking them up — visible and inspectable, and to show honestly when a record is too short to support the constituents being asked of it. Success is a reader leaving understanding both why tides are predictable (universal astronomical frequencies, local amplitude/phase) and why more data is sometimes required, not optional.

## Positioning

A lookup tool that sums published harmonic constants is an afternoon's work and demonstrates nothing. Pasut's mechanism a neighboring product could not truthfully copy without doing the same work: every constant on screen came out of an in-browser least-squares fit to a real record, every fit reports its own condition number as a required field (not an optional diagnostic), and a constituent set the record cannot resolve under the Rayleigh criterion is refused with a structured answer naming the conflicting pair and the record length that would resolve it — never silently overfit.

## Operating Context

- Static site, GitHub Pages, `output: 'export'` — no backend, no runtime network, fully offline after first load.
- Runs entirely client-side in the browser; the fit itself happens on-device against bundled station records.
- Eight bundled IOC stations, 212 days each, hourly, one sensor per station, gaps and rejected spikes declared per record.
- Indonesian-first UI (`id` default locale), English secondary (`en`), via `app/[locale]`.
- Explicitly **not for navigation** — Pushidrosal is the official Indonesian source for tide tables; the warning is prominent and repeated on every view showing a predicted height, not a footer disclaimer.

## Capabilities and Constraints

- Computes tidal constituent constants via least-squares harmonic analysis from observation records; never ships a harmonic constant table as data.
- Enforces the Rayleigh resolvability criterion before solving; refuses unsupportable constituent requests with a structured, named refusal rather than returning unstable numbers.
- Reports condition number on every solve, surfaced (never discarded, never optional).
- Also implements the classical Admiralty method for side-by-side comparison against least squares on the same record.
- Applies and surfaces nodal (18.6-year lunar cycle) corrections explicitly rather than folding them silently into reported constants.
- Computes Formzahl tide-type classification from fitted constants.
- Forward prediction for a chosen date range, with high/low water times and heights against a stated datum.
- Data sources: IOC Sea Level Monitoring Facility (enabled, open, mandatory citation). UHSLC and BIG adapters exist but ship **disabled** behind a licence gate — terms for Indonesian-station attribution are unverified. No BIG data is in the repository.
- Datum is a first-class, always-displayed field; records against different zeros are never merged or compared silently.
- Gaps in a record are declared, never interpolated.
- No storm surge, no meteorological effects, no sea-level-rise projection — everything non-harmonic is residual, displayed, not modelled.
- No global coverage — Indonesian stations only, plus whatever the open sources carry.
- No real-time feed, no accounts, no server, no ML.
- Budget: JS ≤ 250 KB gzipped, excluding station record chunks.
- No tide, linear algebra, or charting library — the astronomy, the solver, and the chart are the project's own code and its point.

## Brand Commitments

- Name: **Pasut** (Indonesian contraction of *pasang surut*), English alternative **Tide Analysis**.
- Wordmark/lockup assets exist at `docs/brand/` (horizontal lockup, light and dark) and `exports/` (icon, lockup, social, svg, wordmark). No OIKN or government branding anywhere.
- Author credit: Andi Fathul Mukminin Salahuddin, linked from the footer.
- Terminology stays in Indonesian for tidal vocabulary (*pasang surut*, *pasut*, *komponen harmonik*, *amplitudo*, *fase*, *muka air rata-rata*, *purnama-perbani*) with standard constituent names (M2, S2, K1, O1, etc.) kept in their conventional form regardless of locale.

## Evidence on Hand

- Eight bundled IOC station records (Sabang, Padang, Benoa, Bitung, Ambon, Surabaya, Semarang, Kolinamil/Jakarta Port), 212 days hourly each, real sea-level observations with declared gaps and rejected spikes — not synthetic, not fabricated.
- Published Formzahl reference values used for fixture testing: 0.557 (Segara Anakan), 0.35–0.39 (Teluk Balikpapan), plus the four regimes recovered directly from the bundled stations' own fits (see CLAUDE.md "Current state" table).
- 366 passing tests, `pnpm build` exporting 90 pages, `pnpm lint`/`pnpm typecheck` clean, at time of writing (2026-08-14) — treat as a snapshot, verify against current state before citing.
- No testimonials, customer logos, press, or case studies exist and none should be fabricated — this is a personal open-source portfolio project, not a marketed product.

## Product Principles

1. **Constants are computed, never shipped.** Every number on screen traces to a fit against a real record; a committed constants table is treated as a bug.
2. **Refuse rather than overfit.** An unresolvable request produces a named, structured refusal — never confident nonsense.
3. **Conditioning is never optional.** The condition number is part of the result type, not a diagnostic a caller can discard.
4. **The residual is the honesty check.** Always shown, never suppressed, because it is what the harmonic model doesn't explain.
5. **Not for navigation, said prominently and repeatedly** — this is educational, and the disclaimer is structural, not a footer afterthought.

## Accessibility & Inclusion

No additional requirements beyond the WCAG AA text-contrast bar already enforced in the design tokens (CLAUDE.md "Current state": every colour used as text clears 4.5:1 on paper, surface, sunken, and its own tint).
