# Pasut

**Fit the tide from real observations, then predict it forward — and see why fifteen days of data can't tell you what six months can.**

Tidal harmonic analysis and prediction. Constituents are fitted from real sea level records by least squares; the solver reports its own conditioning; and a record that cannot support what is asked of it produces a refusal rather than a number.

Static site, no backend, no runtime network. Indonesian first.

> **Not for navigation.** This is an educational tool, computed from raw records that have had no quality control. The official Indonesian tide tables are published by **Pushidrosal**.

## What it does

- **Computes constants, never ships them.** No harmonic constant table exists as data anywhere in this repository. Every amplitude and phase on screen came out of a least-squares fit to a bundled record, and is displayed with the record, window and method that produced it.
- **Refuses rather than overfits.** The Rayleigh criterion is enforced *before* the solve. Ask fifteen days to separate K1 from P1 and the answer names the pair and the 182 days it would need.
- **Reports its conditioning.** κ(A) is a required field of every fit result, not an optional diagnostic.
- **Shows the residual.** Observation minus model, in its own band on the same time axis, never suppressed. Two thirds of each record is fitted and the last third is held out and predicted, so the model is visibly tested on data it never saw.

## Astronomy

Constituent speeds are derived from the time derivatives of the five astronomical elements — no frequency is written down as a literal anywhere in the code. `pnpm test:astro` checks them against the published Schureman table to 1e-6 °/h, and checks the element rates against the tropical, synodic, anomalistic and draconic periods and the 18.61-year nodal cycle.

Nodal f and u follow the compact Schureman series, are applied explicitly, and are shown in the constituent table rather than folded into the reported constants.

## Data

| Source | Status | Notes |
|---|---|---|
| IOC Sea Level Station Monitoring Facility | **enabled** | Open with mandatory citation (DOI 10.14284/482). Served raw with no quality control, per the facility's own disclaimer. |
| UHSLC | disabled | The portal attaches per-country attribution conditions set by the operator that owns the gauge; for Indonesian stations that operator is BIG, and those terms are unverified. |
| BIG | disabled | Redistribution terms for the station records and the Model Pasut product are unverified. No BIG data is in this repository. |

The licence gate runs before any adapter and in front of the build. A record from a source that is not resolved and enabled cannot be fetched, bundled or served.

## Commands

```bash
pnpm dev
pnpm build                  # static export to ./out; runs records:validate first
pnpm preview                # serve ./out under the production basePath
pnpm test:run               # every test, once
pnpm test:astro             # Doodson arguments + nodal factors vs published values
pnpm test:synthetic         # recover known constants from generated records
pnpm test:rayleigh          # resolution refusal + conditioning, both directions
pnpm records:fetch          # DEV/CI only — pull station records from open sources
pnpm records:validate       # licence gate, datum present, gaps documented
pnpm typecheck
```

## Layout

```
lib/astro/       Doodson arguments, element rates, nodal f and u. Pure.
lib/tide/        The core: constituents, design matrix, solver, Rayleigh,
                 Admiralty, prediction, Formzahl. Pure, runs in Node.
lib/sources/     Adapters and the licence gate. All sources normalise into one Record.
lib/chart/       Chart geometry as values — scales, ticks, path strings.
lib/view/        Build-time analysis for pages.
data/records/    Bundled records + the manifest that declares their licences.
tests/           astro · synthetic · rayleigh · sources · chart
```

`lib/astro` and `lib/tide` take typed arrays in and return results out: no DOM, no React, no clock, no network, no module-level mutable state. That is what makes the numerical claims testable rather than eyeballed.

## Licence

Code under this repository's licence. Station records carry the terms of the source that published them, recorded per record and per source in `data/records/manifest.json`.
