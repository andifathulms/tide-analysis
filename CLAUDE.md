# CLAUDE.md — Pasut

Tidal harmonic analysis and prediction. Fits constituents from real sea level observations by least squares, reports its own conditioning, and refuses to resolve what the record cannot support. Static site, GitHub Pages, no backend, no runtime network.

Read `PRD.md` before starting any task — **§2 and §5 in particular**. It fixes scope; this file describes how to work in the repo.

**Four things shape everything:**

1. **Constants are computed, never shipped.** A lookup tool that sums published cosines demonstrates nothing. The least-squares fit from observations is the project. No harmonic constant table is ever committed as data.
2. **Refuse rather than overfit.** Asking a fifteen-day record to separate K1 from P1 is not a hard problem, it is an impossible one. The Rayleigh criterion is enforced and the refusal names which constituents conflict and what record length would be needed.
3. **Every solve reports its condition number.** A solver returning numbers without indicating whether they mean anything is the exact failure this project exists to expose.
4. **Not for navigation.** Pushidrosal publishes the official tables. A wrong low tide grounds a boat. The warning is prominent, repeated, and not a footer.

---

## Stack

- Next.js 14, App Router, `output: 'export'` — static only
- TypeScript, `strict: true`
- Tailwind CSS
- Vitest
- pnpm
- **No tide library, no linear algebra library, no charting library.** The astronomy, the solver, and the chart are the project.
- Fonts via `next/font`, self-hosted.

## Commands

```bash
pnpm dev
pnpm build                  # static export to ./out; runs records:validate first
pnpm preview                # serve ./out under the production basePath
pnpm test                   # vitest watch
pnpm test:run               # vitest once — before every commit
pnpm test:astro             # Doodson arguments + nodal factors vs published values
pnpm test:synthetic         # recover known constants from generated records
pnpm test:rayleigh          # resolution refusal + conditioning, both directions
pnpm records:fetch          # DEV/CI — pull station records from open sources
pnpm records:validate       # licence gate, datum present, gaps documented
pnpm typecheck
pnpm lint
```

`pnpm test:astro` runs first in CI. Every downstream number depends on it, and an error there is invisible in the output.

## Layout

```
app/
  [locale]/                 # id (default), en
    catatan/                # the chart — record, fit, residual
    komponen/               # constituent table + explorer
    resolusi/               # Rayleigh slider
    banding/                # least squares vs Admiralty
    metode/                 # method disclosure
components/
  chart/                    # ruled marégraphe chart, traces, datum lines
  residual/                 # residual band, same time axis
  table/                    # constituent columns
lib/
  astro/                    # Doodson arguments, frequencies, nodal f and u. Pure.
  tide/                     # THE CORE. Pure. Runs in Node.
    constituents.ts         # definitions, Doodson numbers
    design.ts               # design matrix construction
    solve.ts                # least squares + condition number
    rayleigh.ts             # resolvability + structured refusal
    admiralty.ts            # the classical method
    predict.ts              # constants → height series, extrema
    formzahl.ts
  sources/
    ioc/  uhslc/            # enabled
    big/                    # adapter, DISABLED behind the licence gate
    normalise.ts            # any source → Record
    manifest.ts             # licence declarations + gate
data/
  records/                  # bundled station records + manifest (source, datum, period, licence)
tests/
  astro/
  synthetic/
  rayleigh/
```

## Invariants

1. **`lib/astro` and `lib/tide` are pure.** Typed arrays in, results out. No DOM, no React, no clock, no network, no module-level mutable state. Must run in Node — that is what makes the numerical claims testable.

2. **No harmonic constant table ships as data.** Constants come from a fit, every time, and are displayed with the record, window, and method that produced them. A committed constants file is a bug.

3. **Astronomical arguments are computed from the Doodson formulation**, not tabulated. Constituent frequencies derive from the lunar and solar elements. Cite the source in the comment.

4. **Nodal corrections are explicit and surfaced.** The f and u factors from the 18.6-year node cycle are applied, cited, and shown in the UI — never folded silently into reported constants.

5. **Every solve returns its condition number**, and the caller cannot discard it. It is part of the result type, not an optional diagnostic.

6. **Rayleigh is enforced before solving.** A requested constituent set the record cannot resolve returns a structured refusal naming the conflicting pair and the record length required. **Never return unstable amplitudes as though they were results.**

7. **Unresolved constituents are marked, not reported.** There is no third state where a number is shown without its resolvability status.

8. **Integer seconds UTC in the numerical core.** No `Date` objects in `lib/tide` or `lib/astro`. No timezone handling inside the fit; local time is display only.

9. **Datum is a first-class field on every record**, displayed on the chart face. Records referenced to different zeros must never be compared or merged without the datum being explicit. Never assume MSL.

10. **The residual is always available and never suppressed.** It carries weather, surge, and everything the harmonic model does not explain, and its RMS is the honest measure of the fit.

11. **Sources normalise; nothing downstream branches on provenance.** IOC, UHSLC, and BIG adapters all emit the same `Record`.

12. **The licence gate runs before any adapter.** `data/records/manifest.json` declares each source's licence; the build refuses an unresolved one. **BIG ships disabled until its terms are verified** — do not enable it or paste its data in.

13. **Gaps in a record are declared, not interpolated.** A missing span is a property of the record and affects the fit; filling it silently corrupts the constants.

14. **Unresolved red is reserved for constituents the record cannot support and for ill-conditioned fits.** Prediction teal overlays observation ink; residual ochre has its own band. See PRD §9.

15. **The navigation warning appears on every view that shows a predicted height.** Not once on a landing page.

16. **Nothing is computed in a component.**

## Working style

- **Astronomy before everything.** M0 has no UI on purpose. A wrong equilibrium argument produces a tide that looks entirely plausible and is hours off.
- **Write the synthetic generator before the solver.** Generate a record from constants you chose, add noise you chose, then fit it — you control the answer, so correctness is provable. This is the backbone and it comes first.
- **When a synthetic test fails, the solver or the astronomy is wrong.** Not the tolerance. Investigate in that order.
- **Never widen a tolerance to pass.** Tolerances are set once from the synthetic sweep and documented.
- **Build the Rayleigh refusal before the UI shows constituents.** Otherwise the first thing a user does — request everything on a short record — produces confident nonsense.
- **Verify licences before bundling a record.** Two sibling projects hit licensing walls late. IOC and UHSLC carry the launch; BIG waits.
- **Small increments.** One station, fully fitted and validated, beats five loaded and none checked.
- **Don't touch `next.config.js`, the Actions workflow, `records:validate`, or the licence manifest without saying so explicitly.**
- **Don't add a tide, linear algebra, or charting dependency.**
- **Never weaken a test or the validator to make something pass.**

## Conventions

- Named exports; defaults only where Next requires them.
- Discriminated unions for results, refusals, and constituent states, keyed on `type`. Exhaustive `switch` with a `never` default.
- No `any`. No non-null `!` in `lib/tide` or `lib/astro`.
- Follow the field's notation in identifiers: `M2`, `S2`, `K1`, `O1`, `N2`, `P1`, `K2`, `Q1`, `M4`, `MS4`, `Mf`, `Mm`, `Sa`, `Ssa`; `H` for amplitude, `g` for phase lag, `f` and `u` for nodal factors. A reader should be able to hold a tide textbook beside the code.
- Amplitudes in metres named `*M`; phases in degrees named `*Deg`; frequencies in degrees per hour named `*DegPerHour`; times in seconds named `*Sec`. Convert once, at the boundary.
- Comments cite the formulation or published table any constant comes from.
- Indonesian first in UI copy; constituent names and standard oceanographic terms in their conventional form.
- Station ids stable and readable, carrying the source: `ioc-jakarta`, `uhslc-benoa`. They appear in URLs and the manifest.
- Tabular numerals on every amplitude, phase, and condition-number readout.
- Tailwind utilities inline; semantic tokens in `tailwind.config.ts` — `chart`, `grid`, `traceInk`, `prediction`, `residual`, `unresolved`, `datum`. Never raw hex in components.

## Testing rules

- `pnpm test:run` before every commit; `pnpm test:astro` and `pnpm test:synthetic` before any commit touching `lib/astro` or `lib/tide`.
- Synthetic recovery swept across noise levels, record lengths, and constituent sets. Recovered amplitudes and phases within stated tolerance.
- Rayleigh asserted in **both** directions: a sufficient record resolves the pair; an insufficient one refuses. Condition number rises monotonically as the window shortens.
- Astronomical arguments and nodal factors asserted against published values at known epochs.
- Least squares and Admiralty asserted to agree on major constituents within tolerance on the same record.
- Formzahl classification asserted against published Indonesian values.
- Held-out prediction asserted to degrade gracefully — residual RMS bounded, not catastrophic.
- New record → licence resolved, datum present, gaps declared, period recorded.
- Determinism asserted on every fit.
- Bug fix → failing test first.

## Deployment

`main` builds and deploys via Actions; record validation gates it. `basePath` must match the repository name; `.nojekyll` must exist in `out/`. Records ship as separate chunks. Verify with `pnpm preview` before pushing.

## Framing

The site states prominently and repeatedly that this is an educational tool, not for navigation, and names Pushidrosal as the official source for Indonesian tide tables. Every station shows its source, licence, record period, and datum. The method page discloses the constituent set, the fitting method, and the residual RMS. No OIKN or government branding anywhere.

## Current state

M0–M6 implemented. 366 tests green, `pnpm build` exports 90 pages, `pnpm lint` and `pnpm typecheck` clean.

Design tokens live in `:root` in `app/globals.css` — colours as RGB channels so Tailwind's alpha modifiers still resolve, one type scale at ratio 1.2 from a 16px body, spacing named by role. `tailwind.config.ts` maps token names to those variables and holds no literal values. Every colour used as text clears 4.5:1 on paper, surface, sunken and its own tint; `residual` is the chart stroke and `residualText` is its darker sibling for type. The only unavoidable literal is `themeColor` in `app/layout.tsx`, which is emitted before any stylesheet loads.

Four views were added after M6, all of them about what a record can support:

- **`/resolusi`** (no station) — the separation ladder for the standard set, and what each length of deployment buys. Fifteen days resolves six of ten constituents, twenty-nine resolves eight, and nothing improves until a hundred and eighty-three, because K1/P1 and K2/S2 both wait on the solar year.
- **Constituent correlation** (`lib/tide/correlation.ts`, on `/komponen`) — the cosine of the smallest principal angle between each pair of constituent subspaces, returned on `HarmonicFit` beside κ and not separable from it. It is the continuum that κ summarises and the Rayleigh criterion thresholds.
- **Leakage** (`lib/tide/leakage.ts`, on `/catatan`) — the residual's magnitude at each refused frequency, so a refusal is an accounting rather than an absence. Never a constant: no phase is reported and the confounding constituents are part of the result type.
- **Coverage** (`lib/tide/coverage.ts`, on `/resolusi/[station]`) — the same record refit under masks. Every row has identical span, and span is all the Rayleigh criterion reads.
- **The node cycle** (`lib/tide/nodalcycle.ts`, on `/komponen`) — f swept across 18.61 years, so `f = 1.037` reads as scale rather than as rounding.

A later pass asked whether a newcomer could follow the process, and found the inverse problem — the half PRD §2 calls the project — was never shown. What it added:

- **The derivation** (`lib/view/derivation.ts`, on `/catatan`) — one constituent walked from timestamp to constant on the station's own record. Doodson coefficients to V(t), V and u to the two design columns, the fitted pair (a, b), and the trigonometry back to H and g. It lands on the row directly above it, and a test asserts that round trip: a worked example that stops matching the table is worse than none.
- **The recovery sweep** (`lib/tide/recovery.ts`, on `/resolusi`) — invented constants in, noise added, the same solver, and what came back beside what went in. 15 cm of noise per reading still returns every amplitude within a centimetre. PRD §8's backbone, shown to a reader for the first time.
- **Window stability** (`lib/tide/stability.ts`, on `/catatan`) — the record cut into four non-overlapping stretches, each fitted alone. Benoa: M2 moves 9%, S2 moves 56%, M4 moves 81%. Answers the question the app could not: whether a constant belongs to the harbour or to these months.
- **The beat figure** (`lib/chart/beat.ts`, on `/resolusi`) — K1 and P1 drawn at four points across the 183 days they demand, so "drift a full cycle apart" is visible rather than stipulated.

κ now carries its meaning where it is printed, the constituent table converts phase to hours, and the ± is stated as one standard error *with* the assumption it rests on — independent hourly noise, which tidal residuals violate. The stability panel puts a number on that: S2's ± is about 1% and its actual movement between stretches is 56%.

**The constituent explorer demonstrates synthesis, not analysis**, and now says so. Toggling constituents re-sums constants that were fitted once; it does not refit. Refitting was considered and rejected — it would destroy PRD §6.6's lesson, since M2 alone would absorb its neighbours and the spring-neap beat would no longer be two true constants interfering.

Two things learned building those, both now asserted in tests:

1. **Gaps are not simply bad.** What costs you is losing the middle, not losing hours. Removing 70% of Benoa as one outage takes the worst pair from 0.14 to 0.95; removing the same 70% at scattered times leaves it at 0.15. Kolinamil has 740 missing hours and fits cleanly because its gaps are scattered.
2. **A refusal is conservative.** It fires when a pair has not drifted one *full* cycle apart, so a refused pair may still be partly separable — K2/S2 on Benoa's 141-day fit window sits at 0.27, not at the 0.97 the same pair scores on a fortnight.

Eight IOC stations bundled, 212 days each, hourly, 1 January to 1 August 2026. `pnpm records:sweep` surveyed all 57 open Indonesian stations on a 35-day window and found all four Formzahl regimes, so the four-port contrast in PRD §3 is complete and computed rather than quoted:

| Station | F | Class |
|---|---|---|
| Sabang, Aceh | 0.204 | harian ganda |
| Padang | 0.394 | campuran condong ganda |
| Benoa | 0.413 | campuran condong ganda |
| Bitung | 0.578 | campuran condong ganda |
| Ambon | 0.811 | campuran condong ganda |
| Surabaya | 1.242 | campuran condong tunggal (borderline) |
| Semarang | 1.597 | campuran condong tunggal |
| Kolinamil, Pelabuhan Jakarta | 3.486 | harian tunggal |

The diurnal one is a gauge in Jakarta's port — the regime PRD §3 attributes to Tanjung Priok, recovered from the record. It has the most gaps of the eight (740 hours) and covers 202.5 days rather than 212.

**Sweep F and bundled F are not the same number** and should not be compared as if they were. The sweep fits four constituents over 35 days; a bundled record fits ten over 212. With P1 and K2 unresolvable on a short window they leak into K1 and S2, inflating F — Semarang reads 2.86 on the sweep and 1.597 on its record. The sweep is for choosing stations, not for reporting.

**UHSLC ships disabled, not enabled as PRD §4 assumed.** Its portal attaches per-country attribution conditions set by the operator that owns the gauge, and for Indonesian stations that operator is BIG — the same terms this project has not verified. The adapter is written and tested; enabling it is a manifest change once someone reads the terms. IOC carries the launch alone.

Three things that bit, all recorded in tests so they cannot come back:

1. **A station reports several sensors on the same timestamps**, each against its own zero. Merging them mixes datums. One sensor is chosen per station and the choice is recorded on the record.
2. **The choice cannot be "most readings"** — Benoa's radar was stuck at −0.281 m for seven months while another gauge recorded a 2.3 m tide beside it.
3. **Nor can it be "largest σ"** — Semarang's radar was flat with nine-metre spikes, which gave it the largest σ at the station. The rule is largest robust scale, and isolated spikes are rejected into declared gaps.

Next, in rough order: a diurnal station if an open one appears; the fit window on the record page is currently fixed at two thirds, which could be a control; and `pnpm records:fetch` takes about fifteen minutes per station against a service that sometimes stalls.
