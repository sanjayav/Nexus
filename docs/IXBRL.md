# Nexus iXBRL Engine

This document covers the deep iXBRL (inline XBRL) generation engine built into
Nexus. It replaces the v1 14-concept skeleton with a 280+ concept taxonomy
and proper context / unit / dimension handling.

See also: [`IXBRL_PARTNERS.md`](./IXBRL_PARTNERS.md) for the certified-validator
integration plan (CoreFiling, ParsePort, IRIS Carbon).

---

## Architecture

```
src/pages/IXBRLPreview.tsx        ─┐
                                   ├── reports.previewIxbrl()
                                   │   POST /api/ixbrl/preview ──► generateIxbrlDeep()
                                   │
                                   └── reports.validateIxbrl()
                                       POST /api/ixbrl/validate ─► validateIxbrl()

GET /api/reports/[id]/ixbrl         ──► generateIxbrlDeep() (with v1 fallback)

api/_ixbrl.ts                       ── Generation + validation engine
api/_ixbrlTaxonomy.ts               ── 280+ ESRS / ISSB / SEC / GRI / EU-tax concepts
```

## Concept registry

`api/_ixbrlTaxonomy.ts` exports `XBRL_CONCEPTS: XbrlConcept[]` with these
counts:

| Framework      | Concepts | Notes                                                |
|----------------|----------|------------------------------------------------------|
| ESRS E1        | ~60      | Scope 1/2/3 (incl. all 15 categories), energy, targets |
| ESRS E2        | 10       | Air/water/soil pollutants, SoC, SVHC, microplastics   |
| ESRS E3        | 10       | Withdrawal, discharge, consumption, intensity         |
| ESRS E4        | 10       | Land use, IUCN species, no-net-loss                    |
| ESRS E5        | 10       | Material in/out, recycled content, waste              |
| ESRS S1        | 20       | Headcount, FTE, pay gap, training, H&S                |
| ESRS S2        | 10       | HRDD, suppliers, living wage, child/forced labour    |
| ESRS S3        | 10       | Community engagement, FPIC, land rights              |
| ESRS S4        | 10       | Product safety, recalls, data privacy                 |
| ESRS G1        | 15       | Anti-corruption, fines, lobbying, board diversity     |
| ISSB IFRS S1/S2| 30       | Governance, strategy, metrics, transition plan       |
| SEC Climate    | 25       | Material risks, board oversight, severe weather       |
| GRI            | 20       | GRI 305 emissions, 303 water, 401/403 HR, 405          |
| EU Taxonomy    | 10       | Turnover/CapEx/OpEx alignment, GAR, DNSH              |

Every entry includes `qname`, `label`, `dataType`, `periodType`, optional
`unitRef`, `decimals`, `balance`, `validators[]`, and a `references[]`
back-link to the originating standard paragraph.

### Mapping data → concepts

Three paths (first match wins):

1. **Explicit** — `data_value.xbrl_concept_id` column (set by admin UI or seeders).
2. **Heuristic** — `inferConceptId(framework, griCode, lineItem)` pattern-matches.
3. **Skip** — row is dropped with a warning surfaced in the preview.

## Engine API

```ts
import { generateIxbrlDeep } from 'api/_ixbrl'

const result = await generateIxbrlDeep({
  orgId: '...',
  reportingYear: 2026,
  frameworkIds: ['csrd-e1', 'csrd-e2'],
  approvedOnly: true,
})

// result:
// {
//   xhtml: string,
//   concepts: number,
//   contexts: number,
//   units: number,
//   warnings: string[],
//   coverage: Array<{ conceptId, label, framework, mapped, valueId?, griCode? }>,
// }
```

The XHTML body:
- declares `xmlns:ix`, `xmlns:xbrli`, `xmlns:xbrldi`, `xmlns:link`, `xmlns:xlink`
- emits one `<link:schemaRef>` per namespace used (esrs / ifrs-full / etc.)
- emits one `<xbrli:context id="…">` per unique entity+period+dimensions tuple
- emits one `<xbrli:unit id="u_…">` per measure (tCO2e, EUR, pure, MWh, m³, kg, …)
- wraps every value in `<ix:nonFraction>` (numeric) or `<ix:nonNumeric>` (text/boolean/date)
- groups facts by framework in a readable table layout

## Validator

`POST /api/ixbrl/validate` (or `validateIxbrl(xhtml)` directly) runs **structural** checks:

- Well-formedness smell test (balanced tags, declared namespaces).
- Every `<ix:nonFraction>` carries `name`, `contextRef`, `unitRef`, `decimals`.
- Every `contextRef` points at a real `<xbrli:context>`.
- Every `unitRef` points at a real `<xbrli:unit>`.
- Numeric bodies parse as numbers.
- `format="ixt:date-iso8601"` bodies match `YYYY-MM-DD`.
- Unknown concepts warn but do not fail.

What this does **not** do: run the full EFRAG ESRS linkbase or check
dimensional-tuple completeness. That requires a certified vendor — see
`IXBRL_PARTNERS.md`.

## Entity identifier

The `<xbrli:entity>` block uses the LEI scheme
(`http://standards.iso.org/iso/17442`) when `organisations.lei` is set, and
falls back to a Nexus placeholder scheme (`http://www.example.com`) with a
warning otherwise. Set the LEI before production filing.

## Schema additions

```sql
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS lei TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS legal_form TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS isin TEXT;
ALTER TABLE data_value    ADD COLUMN IF NOT EXISTS xbrl_concept_id TEXT;
```

## What is "draft" vs "production"

| Capability                                  | Status |
|---------------------------------------------|--------|
| Concept registry (280+ entries)             | Production |
| Context / unit / dimension generation       | Production |
| Inline tag emission                         | Production |
| Schema-ref declarations                     | Production |
| Structural validation                       | Production |
| **EFRAG ESRS linkbase validation**          | Draft — requires CoreFiling / ParsePort SDK |
| **Dimensional completeness check**          | Draft — partial |
| **iXBRL transformation registry**           | Partial (booleans + ISO date) |

The "draft" items are exactly where a paid taxonomy SDK pays back.
