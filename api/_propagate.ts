import type { Sql } from './_db.js'
import { stampDataValueOrg } from './_tenancy.js'

// ═══════════════════════════════════════════════════════════════════
// Linked-data propagation engine.
//
// When a data_value transitions to 'approved' for a questionnaire_item that
// is part of a concept_mapping (same concept_key across multiple frameworks),
// we automatically fill every peer framework's matching disclosure with the
// converted value. Each propagated row is marked derived_from = source.id so
// the UI can show "auto-filled from <framework>" badges + lets the user
// override.
//
// Rules:
//   • Skip peers where a value already exists with is_overridden=true.
//   • If a peer row exists with is_overridden=false, UPDATE it (re-approval
//     re-syncs). If none exists, INSERT a new approved row.
//   • Unit conversion: peer_value = source_value
//                                   * (peer.unit_conversion / source.unit_conversion).
//   • Idempotent: re-approving the same source repeats the propagation but
//     never duplicates — UPDATE/INSERT branches keyed by lookup row.
//   • Same scope_key + facility_id + reporting_year_id are preserved across
//     peers so multi-facility, multi-scope data still maps 1:1.
//   • Tenancy (see api/_tenancy.ts): the source must belong to `orgId` AND
//     sit in one of `orgId`'s own reporting years; peer rows are only looked
//     up / updated within `orgId`; every row written is stamped org_id=orgId.
//     A legacy value that lives in another org's reporting year (the old
//     hard-coded client year) is not propagated: a derived row has no
//     entering user, so it would fall back to that year's org.
// ═══════════════════════════════════════════════════════════════════

export interface PropagationResult {
  /** Number of peer data_value rows inserted. */
  inserted: number
  /** Number of peer data_value rows updated (existing, not overridden). */
  updated: number
  /** Number of peer mappings skipped because of is_overridden=true. */
  skipped: number
  /** Concept key the source belongs to (or null if not mapped). */
  conceptKey: string | null
}

interface SourceRow {
  id: string
  questionnaire_item_id: string
  reporting_year_id: string
  facility_id: string | null
  scope_key: string | null
  value: number | null
  unit: string | null
}

interface ConceptPeer {
  questionnaire_item_id: string
  framework_id: string
  unit_conversion: number
}

export async function propagateApprovedValue(
  sql: Sql,
  approvedValueId: string,
  orgId: string,
): Promise<PropagationResult> {
  const result: PropagationResult = { inserted: 0, updated: 0, skipped: 0, conceptKey: null }

  // 1. Look up the approved row — only if it is the caller org's value in
  //    one of the caller org's own reporting years.
  const sourceRows = await sql`
    SELECT dv.id, dv.questionnaire_item_id, dv.reporting_year_id, dv.facility_id,
           dv.scope_key, dv.value, dv.unit
    FROM data_value dv
    LEFT JOIN users eu ON eu.id = dv.entered_by
    LEFT JOIN reporting_year ry ON ry.id = dv.reporting_year_id
    WHERE dv.id = ${approvedValueId}
      AND COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = ${orgId}
      AND ry.organisation_id = ${orgId}
    LIMIT 1
  ` as SourceRow[]
  if (sourceRows.length === 0) return result
  const source = sourceRows[0]
  if (source.value === null || source.value === undefined) return result

  // 2. Find the concept_key for this questionnaire_item. A questionnaire_item
  //    can belong to at most one concept_key per framework — and propagation
  //    only makes sense when it's part of one, so pick the first match.
  const conceptRows = await sql`
    SELECT concept_key, unit_conversion
    FROM concept_mappings
    WHERE questionnaire_item_id = ${source.questionnaire_item_id}
    LIMIT 1
  ` as Array<{ concept_key: string; unit_conversion: number }>
  if (conceptRows.length === 0) return result
  const conceptKey = conceptRows[0].concept_key
  const sourceUnitConv = Number(conceptRows[0].unit_conversion) || 1
  result.conceptKey = conceptKey

  // 3. Find every peer mapping (different questionnaire_item_id) for the
  //    same concept_key.
  const peers = await sql`
    SELECT questionnaire_item_id, framework_id, unit_conversion
    FROM concept_mappings
    WHERE concept_key = ${conceptKey}
      AND questionnaire_item_id != ${source.questionnaire_item_id}
  ` as ConceptPeer[]

  // 4. For each peer, find or create the matching data_value row.
  for (const peer of peers) {
    const peerUnitConv = Number(peer.unit_conversion) || 1
    const sourceValue = Number(source.value)
    const peerValue = sourceValue * (peerUnitConv / sourceUnitConv)

    // Look up the caller org's existing peer row. Match on (questionnaire_item,
    // year, facility, scope_key) — facility/scope_key are nullable so we use
    // IS NOT DISTINCT FROM. Without the owner predicate a shared reporting
    // year would match — and overwrite — another tenant's value.
    const existing = await sql`
      SELECT dv.id, dv.is_overridden
      FROM data_value dv
      LEFT JOIN users eu ON eu.id = dv.entered_by
      LEFT JOIN reporting_year ry ON ry.id = dv.reporting_year_id
      WHERE dv.questionnaire_item_id = ${peer.questionnaire_item_id}
        AND dv.reporting_year_id    = ${source.reporting_year_id}
        AND dv.facility_id IS NOT DISTINCT FROM ${source.facility_id}
        AND dv.scope_key   IS NOT DISTINCT FROM ${source.scope_key}
        AND COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = ${orgId}
      LIMIT 1
    ` as Array<{ id: string; is_overridden: boolean | null }>

    if (existing.length > 0) {
      // User-locked? Skip silently.
      if (existing[0].is_overridden) {
        result.skipped++
        continue
      }
      // Update in place.
      await sql`
        UPDATE data_value
        SET value         = ${peerValue},
            status        = 'approved',
            derived_from  = ${source.id},
            is_overridden = false,
            approved_at   = now(),
            entered_at    = COALESCE(entered_at, now())
        WHERE id = ${existing[0].id}
      `
      await stampDataValueOrg(sql, existing[0].id, orgId)
      result.updated++
    } else {
      // Insert a new approved derived row.
      const inserted = await sql`
        INSERT INTO data_value
          (questionnaire_item_id, reporting_year_id, facility_id, scope_key,
           value, unit, entry_mode, status,
           entered_at, approved_at,
           derived_from, is_overridden)
        VALUES
          (${peer.questionnaire_item_id}, ${source.reporting_year_id},
           ${source.facility_id}, ${source.scope_key},
           ${peerValue}, ${source.unit}, 'Manual', 'approved',
           now(), now(),
           ${source.id}, false)
        RETURNING id
      ` as Array<{ id: string }>
      if (inserted[0]) await stampDataValueOrg(sql, inserted[0].id, orgId)
      result.inserted++
    }
  }

  return result
}
