# PCAF Financed Emissions

Nexus implements the **PCAF Global GHG Accounting and Reporting Standard for the Financial Industry** — the de-facto methodology for portfolio-level Scope 3 Category 15 (Investments) emissions used by banks, asset managers, and insurers.

Reference: [carbonaccountingfinancials.com](https://carbonaccountingfinancials.com/files/downloads/PCAF-Global-GHG-Standard.pdf)

## What it covers

The PCAF calculators (Data → Calculators → **PCAF Portfolio**, route `/calculators/pcaf`) implement the nine PCAF asset classes:

| Asset class | PCAF Standard | Attribution formula |
| --- | --- | --- |
| Listed equity | A | `outstanding / EVIC` |
| Corporate bonds | A | `outstanding / EVIC` |
| Business loans | B | `outstanding / (borrower equity + debt)` |
| Unlisted equity | B | `investment / (investee equity + debt)` |
| Project finance | C | `loan / (project equity + debt)` |
| Commercial real estate | D | `loan / property value` |
| Mortgages | E | `loan / property value` |
| Motor vehicle loans | F | `loan / vehicle value` |
| Sovereign debt | G | `investment / GDP-PPP` |

For each asset, **financed emissions = counterparty emissions × attribution factor**, with the calculator picking the best emissions input available:

1. **Reported** (e.g. counterparty CDP disclosure) — preferred
2. **Physical-activity estimate** (e.g. floor area × intensity, odometer × EF/km)
3. **Economic estimate** (e.g. sector intensity × revenue proxy) — last resort

## Data quality score (1–5)

PCAF assigns each asset a data-quality score reflecting how close the inputs are to ground truth:

| DQ | Meaning |
| --- | --- |
| 1 | Verified emissions × verified value (best) |
| 2 | Verified emissions × estimated value, OR unverified reported × verified value |
| 3 | Reported emissions × any value |
| 4 | Physical-activity proxy × verified value |
| 5 | Sector / region revenue proxy (worst) |

The portfolio dashboard surfaces a **weighted-average DQ** (weighted by `financed_emissions_total`) — investors and assurers use this as the single number to assess portfolio data quality. Persefoni typically reports weighted DQ of 3.0–3.5; achieving <2.5 requires direct counterparty engagement.

## Using Nexus for PCAF

1. **Add assets** — pick an asset class, enter counterparty + outstanding + (preferably) reported emissions. The calculator runs live; save when satisfied.
2. **Review portfolio** — the table and donut chart break emissions down by asset class.
3. **Sync to Scope 3** — the "Sync to Scope 3" action aggregates all assets in the reporting year into a single `activity_data` row (scope=3, category="Cat 15 - Investments"). That row then flows through the standard reporting workflow into ESRS E1-6, GRI 305-3, TCFD, and SEC climate disclosures.
4. **Audit trail** — every save and sync is logged via the standard audit chain.

## Endpoints

- `POST /api/pcaf/calculate` (gated `calculators.edit`) — preview financed emissions + DQ for a single asset (does not persist)
- `POST /api/pcaf/assets` (gated `calculators.edit`) — persist a PCAF asset row
- `GET /api/pcaf/assets?year=YYYY` (gated `data.view`) — list assets for the org+year
- `DELETE /api/pcaf/assets?id=...` (gated `calculators.edit`) — remove an asset
- `GET /api/pcaf/portfolio-summary?year=YYYY` (gated `data.view`) — KPIs, per-asset-class breakdown, top emitters, weighted DQ, coverage %
- `POST /api/pcaf/sync-scope3` (gated `calculators.edit`) — aggregate portfolio into a draft Scope 3 Cat 15 activity row

## Caveats — illustrative factors

The sector intensity, residential intensity, vehicle EF, and country-emissions-per-GDP tables shipped in `src/data/pcafEmissionFactors.ts` are **illustrative placeholders** — bounded enough to give realistic outputs in demo environments, but they are **not** the real PCAF Annex 9 / EXIOBASE / Climate Watch data. Each table is marked `// TODO: real …` in the source. Replace with sourced data before any client-facing disclosure.
