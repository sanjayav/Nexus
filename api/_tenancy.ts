import type { Sql } from './_db.js'

// ═══════════════════════════════════════════════════════════════════
// data_value tenancy — the one ownership rule.
//
// Historically data_value had no org_id column, and the client posted one
// hard-coded reporting_year_id (the demo org's FY2026 year) for every tenant,
// so values of several orgs share a reporting year. The reporting year alone
// is therefore NOT a safe tenant key.
//
// Owner of a data_value row, in order of preference:
//   1. dv.org_id                — stamped on every new write (nullable column
//                                 added by ensureTenancySchema; legacy rows are
//                                 NULL until scripts/backfill-data-value-org.ts
//                                 is applied).
//   2. eu.org_id                — org of the user who entered the value.
//   3. ry.organisation_id       — org of the reporting year (derived /
//                                 propagated rows that have no entering user).
//
// Every query that scopes data_value to a tenant MUST join
//
//     LEFT JOIN users eu          ON eu.id = dv.entered_by
//     LEFT JOIN reporting_year ry ON ry.id = dv.reporting_year_id
//
// and filter on
//
//     COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = ${orgId}
//
// `to_jsonb(dv) ->> 'org_id'` (rather than `dv.org_id`) keeps the query valid
// on a database where /api/setup has not yet added the column — it yields
// NULL and the fallback chain applies. Same pattern as line_item_zh.
//
// The Neon tagged-template client can't splice SQL fragments, so the
// predicate is written out in each query; DATA_VALUE_OWNER_EXPR is the
// canonical text (tests match on it — keep the two in sync).
//
// A foreign id must be answered exactly like a missing one (404) so ids of
// other tenants can't be probed.
// ═══════════════════════════════════════════════════════════════════

export const DATA_VALUE_OWNER_EXPR =
  "COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id)"

export interface OwnedDataValue {
  id: string
  questionnaire_item_id: string
  status: string
  entered_by: string | null
  reporting_year_id: string | null
}

/** Load a data_value by id iff it belongs to `orgId`; otherwise null. */
export async function loadOwnedDataValue(
  sql: Sql, orgId: string, dataValueId: string,
): Promise<OwnedDataValue | null> {
  const rows = await sql`
    SELECT dv.id, dv.questionnaire_item_id, dv.status, dv.entered_by, dv.reporting_year_id
    FROM data_value dv
    LEFT JOIN users eu ON eu.id = dv.entered_by
    LEFT JOIN reporting_year ry ON ry.id = dv.reporting_year_id
    WHERE dv.id = ${dataValueId}
      AND COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = ${orgId}
  ` as OwnedDataValue[]
  return rows[0] ?? null
}

/** True iff the reporting year exists and belongs to `orgId`. */
export async function isOwnedReportingYear(
  sql: Sql, orgId: string, reportingYearId: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM reporting_year
    WHERE id = ${reportingYearId} AND organisation_id = ${orgId}
  ` as Array<{ id: string }>
  return rows.length > 0
}

/** Postgres SQLSTATE for "column does not exist". */
const UNDEFINED_COLUMN = '42703'
let warnedMissingColumn = false

/**
 * Record the owning org on a data_value row the caller has just written.
 *
 * Only fills a NULL org_id — it never re-assigns a row. Best-effort: if the
 * column hasn't been added yet (/api/setup not run since this deploy) the
 * ownership predicate's fallback chain still applies, so the write is not
 * failed over it.
 */
export async function stampDataValueOrg(
  sql: Sql, dataValueId: string, orgId: string,
): Promise<void> {
  try {
    await sql`
      UPDATE data_value SET org_id = ${orgId}
      WHERE id = ${dataValueId} AND org_id IS NULL
    `
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code
    if (code === UNDEFINED_COLUMN) {
      if (!warnedMissingColumn) {
        warnedMissingColumn = true
        console.warn('[tenancy] data_value.org_id missing — run /api/setup (ensureTenancySchema)')
      }
      return
    }
    console.error('[tenancy] stampDataValueOrg failed for', dataValueId, err instanceof Error ? err.message : err)
  }
}
