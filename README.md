<div align="center">

<img src="public/brand/lockup-horizontal-light.png" alt="Tide Analysis" width="460">

**Fit the tide from real observations, then predict it forward — and see why fifteen days of data can't tell you what six months can.**

[![Live site](https://img.shields.io/badge/live-andifathulms.github.io%2Ftide--analysis-00719E?style=flat-square)](https://andifathulms.github.io/tide-analysis/)
[![Tests](https://img.shields.io/badge/tests-301%20passing-1C6E93?style=flat-square)](#testing)
[![Deploy](https://github.com/andifathulms/tide-analysis/actions/workflows/deploy.yml/badge.svg)](https://github.com/andifathulms/tide-analysis/actions/workflows/deploy.yml)
[![No dependencies](https://img.shields.io/badge/tide%20%2F%20algebra%20%2F%20chart%20libraries-none-C07A16?style=flat-square)](#no-libraries)

</div>

> [!CAUTION]
> **Not for navigation.** This is an educational tool, computed from raw records that have had no quality control. The official Indonesian tide tables are published by **Pushidrosal**. A wrong low tide grounds a boat.

---

## What this is

Tide height is a sum of cosines. The frequencies are astronomical and universal — M2 has the same 12.42-hour period in Balikpapan as in Bristol, because it comes from the Moon's orbit rather than from local geography. Only **amplitude and phase** are local, and those two numbers per constituent are what a coastline does to the forcing.

Getting them is called harmonic analysis: a least-squares fit to a record of observed sea level. **That fit is the project.** A tide predictor that reads published constants and sums cosines is an afternoon's work and demonstrates nothing.

## Four things that shape everything

| | |
|---|---|
| **Constants are computed, never shipped** | No harmonic constant table exists as data anywhere in this repository. Every amplitude on screen came out of a fit, shown with the record, window and method that produced it. |
| **Refuse rather than overfit** | The Rayleigh criterion is enforced *before* the solve. Ask fifteen days to separate K1 from P1 and the answer names the pair and the 182 days it would need. |
| **Every solve reports its conditioning** | κ(A) is a required field of the result type, not an optional diagnostic. A solver returning numbers without saying whether they mean anything is the failure this project exists to expose. |
| **The residual is never suppressed** | Observation minus model, in its own band on the same time axis. Two thirds of each record is fitted; the last third is held out and predicted. |

## What you can do with it

- **[Read a record](https://andifathulms.github.io/tide-analysis/id/catatan/ioc-benoa/)** — the observed trace, the fitted prediction over it, the residual beneath, and a slider for how much of the record to fit.
- **[Watch the tide be built](https://andifathulms.github.io/tide-analysis/id/komponen/ioc-benoa/)** — start with M2 alone, add S2, and the spring-neap beat appears from two cosines.
- **[Push a record past its limit](https://andifathulms.github.io/tide-analysis/id/resolusi/ioc-benoa/)** — shorten the window and watch constituents drop out as κ climbs.
- **[Compare the two classical methods](https://andifathulms.github.io/tide-analysis/id/banding/ioc-benoa/)** — least squares against Admiralty, on the same record.

## Four ports, four characters

The Formzahl number F = (K1 + O1) / (M2 + S2) classifies tidal character, and the archipelago holds all four classes. Every figure below came out of a least-squares fit to that station's own record — none is quoted from a table.

| Station | F | Character |
|---|--:|---|
| Sabang, Aceh | 0.204 | semidiurnal — two nearly equal tides a day |
| Padang | 0.394 | mixed, mainly semidiurnal |
| Benoa, Bali | 0.413 | mixed, mainly semidiurnal |
| Bitung | 0.578 | mixed, mainly semidiurnal |
| Ambon | 0.811 | mixed, mainly semidiurnal |
| Surabaya | 1.242 | mixed, mainly diurnal |
| Semarang | 1.597 | mixed, mainly diurnal |
| Kolinamil, Jakarta Port | 3.486 | diurnal — one tide a day |

`pnpm records:sweep` is how those were found: it surveys all 57 open Indonesian stations on a short window and classifies each. Its numbers choose stations and are never reported — four constituents over 35 days let P1 leak into K1 and inflate F.

## The astronomy

Constituent speeds are **derived from the time derivatives of the five astronomical elements**. No frequency is written down as a literal anywhere in the code, which is why the published speed table in `tests/astro` is a check on the astronomy rather than an input to it.

`pnpm test:astro` asserts the speeds against Schureman (1958) to 1e-6 °/h, and the element rates against the tropical, synodic, anomalistic and draconic periods and the 18.61-year nodal cycle. Nodal f and u follow the compact Schureman series, are applied explicitly, and are shown in the constituent table rather than folded into the reported constants.

## <a id="no-libraries"></a>No tide, linear algebra or charting libraries

The astronomy, the solver and the chart are the project.

- **The solver** diagonalises AᵀA by cyclic Jacobi rotations, which yields the solution, the singular values and hence κ(A) in one pass. Deterministic: the same record, window and set produce byte-identical constants.
- **The chart** is SVG built from path strings computed in `lib/chart`, so components stay presentational and the trace lifts the pen across every declared gap instead of drawing through it.

## The data

| Source | Status | Why |
|---|---|---|
| **IOC** Sea Level Station Monitoring Facility | ✅ enabled | Open with mandatory citation (DOI 10.14284/482). Served raw with no quality control, per the facility's own disclaimer. |
| **UHSLC** | ⛔ disabled | The portal attaches per-country attribution set by the operator that owns the gauge; for Indonesian stations that operator is BIG, and those terms are unverified. |
| **BIG** | ⛔ disabled | Redistribution terms for the station records and the Model Pasut product are unverified. No BIG data is in this repository. |

The licence gate runs before any adapter and in front of the build. A record from a source that is not resolved and enabled cannot be fetched, bundled or served — `pnpm records:validate` fails the build rather than shipping it.

Eight stations are bundled, 212 days each, hourly, one sensor per station, with gaps and rejected spikes declared.

## What the records taught us

Four things that looked fine and were not — each now has a test so it cannot come back:

1. **A station reports several sensors on the same timestamps**, each against its own zero. Merging them mixes datums.
2. **"Most readings" picks the dead one.** Benoa's radar sat at −0.281 m for seven months while another gauge recorded a 2.3 m tide beside it. The fit returned 4 mm of M2 with κ = 1.52 and a clean bill of health.
3. **"Largest σ" picks the spikiest one.** Semarang's radar was flat with nine-metre excursions. Selection now uses a robust scale, and isolated spikes are rejected into declared gaps.
4. **Datum steps are invisible to both.** A gauge reset shifts every later reading; it is not a spike and not a gap. Detected, modelled as a per-segment level, and reported — with the honest limit stated: these gauges wander up to 0.3 m on weather alone, so a 0.2 m step is indistinguishable from a storm.

## <a id="testing"></a>Testing

**301 tests.** The backbone is synthetic ground truth: generate a record from constants you chose, add noise you chose, fit it, and assert what comes back — you control the answer, so correctness is provable rather than plausible.

```bash
pnpm test:astro       # Doodson arguments + nodal factors vs published values
pnpm test:synthetic   # recover known constants from generated records
pnpm test:rayleigh    # resolution refusal + conditioning, both directions
pnpm test:run         # everything, once
```

Noise-free recovery lands within 1e-6 m and 1e-4°. Rayleigh is asserted in both directions: fifteen days refuses K1 against P1 and names the 182 days needed; two hundred days resolves the pair and recovers both. Bypassing the gate shows what the refusal prevents — κ doubles with every halving of the window while the recovered K1 amplitude runs from its true 0.27 m to 2.4 m.

## Running it

```bash
pnpm install
pnpm dev                    # http://localhost:3000
pnpm build                  # static export to ./out; runs records:validate first
pnpm preview                # serve ./out under the production basePath
pnpm records:fetch          # DEV/CI only — pull station records from open sources
pnpm records:sweep          # DEV only — survey every open Indonesian station
pnpm typecheck && pnpm lint
```

## Layout

```
lib/astro/     Doodson arguments, element rates, nodal f and u. Pure.
lib/tide/      The core: constituents, design matrix, solver, Rayleigh,
               steps, Admiralty, prediction, Formzahl, asymmetry.
lib/sources/   Adapters and the licence gate. All sources emit one Record.
lib/chart/     Chart geometry as values — scales, ticks, path strings.
data/records/  Bundled records + the manifest declaring their licences.
tests/         astro · synthetic · rayleigh · sources · records · chart
```

`lib/astro` and `lib/tide` take typed arrays in and return results out: no DOM, no React, no clock, no network, no module-level mutable state. That is what makes the numerical claims testable rather than eyeballed.

## Licence

Code under this repository's licence. Station records carry the terms of the source that published them, recorded per record and per source in `data/records/manifest.json`.

---

<div align="center">
<sub>Designed &amp; built by <a href="https://andifathulms.github.io/en/">Andi Fathul Mukminin</a></sub>
</div>
