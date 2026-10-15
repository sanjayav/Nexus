# iXBRL Production Tagging — Partner Integration

The current `api/_ixbrl.ts` implementation is a **structural scaffold**. It
produces a syntactically valid XHTML+ix document with embedded
`ix:nonFraction` elements wired to ~14 ESRS E1 (Climate) concept mappings
(see `api/reports/[id]/ixbrl.ts`). It **does not** validate against the
ESRS XBRL Taxonomy, register units (`xbrli:unit`), declare contexts
(`xbrli:context`), or run taxonomy conformance checks. Filing this output
to ESMA / national OAMs without further processing is **not** safe.

## Recommended path to production

Integrate a vendor SDK in `generateIxbrl()` (replace the body):

| Vendor             | Product                  | Notes                                                             |
| ------------------ | ------------------------ | ----------------------------------------------------------------- |
| CoreFiling         | Magnify / True North     | Full ESRS + ESEF taxonomy. REST + Java SDKs.                      |
| ParsePort          | XBRL Tagging Engine      | API-first. Strong ESEF coverage; ESRS support shipping 2025-2026. |
| IRIS Carbon        | iXBRL Filing Platform    | SaaS. Useful when manual reviewer step is desired.                |
| Workiva            | Wdesk + Wdata            | End-to-end ESG/CSRD workflow.                                     |
| ParsePort Validator (free) | open-source              | Validation only — useful in CI.                             |

## Integration shape

The current `generateIxbrl(reportId, mappings, data)` signature is
intentionally compatible with a vendor-SDK call:

```ts
import { tagDocument } from '@vendor/xbrl-sdk'

export async function generateIxbrl(reportId, mappings, data) {
  const xhtml = await renderHumanReadableReport(reportId) // existing PDF/HTML pipeline
  return tagDocument(xhtml, { taxonomy: 'esrs-2024', mappings, data })
}
```

## What stays put

- The ESRS E1 mapping table in `api/reports/[id]/ixbrl.ts`
  (`ESRS_E1_MAPPINGS`) — this is the bridge from internal `gri_code` to
  ESRS taxonomy concept names. Extend it as more disclosures are
  productised.
- The `IxbrlTag` / `IxbrlMapping` types in `api/_ixbrl.ts` — these match
  the shape most vendor SDKs accept.
- The download UI in `src/pages/ReportPublishing.tsx` and helper
  `orgStore.downloadReportIxbrl()` — vendor-agnostic.

## What changes

- Body of `generateIxbrl()` — swap the inline string concatenation for the
  vendor SDK call.
- Add `xbrli:context` and `xbrli:unit` declarations once the vendor SDK
  isn't handling those for you.
- Wire taxonomy-conformance error reporting back to the route handler so
  partial / invalid disclosures surface in the publish workflow.

## Validation in CI

Even without a paid vendor, run ParsePort's open-source validator in CI
against generated XHTML to catch regressions before they ship to clients.
