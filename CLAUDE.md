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

M0 — not yet scaffolded. Next: constituent definitions, Doodson arguments, and nodal corrections, verified against published values. **No solver work until `pnpm test:astro` passes.**
