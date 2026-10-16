import type { Sql } from './_db.js'

// ═══════════════════════════════════════════════════════════════════
// Reporting period ↔ reporting_year lifecycle.
//
// data_value rows live in a reporting_year (UNIQUE organisation_id, year).
// Reporting periods (UNIQUE org_id, framework_id, year) are what admins
// manage in the product. Every period of an org-year shares that org-year's
// reporting_year; reporting_periods.reporting_year_id records the link
// (api/_periodYearSchema.ts).
//
// syncPeriodReportingYear() is called by /api/org create-period and
// transition-period. It:
//   1. create-or-links the caller org's year for the period's year
//      (organisation_id = caller org; INSERT … ON CONFLICT DO NOTHING, so a
//      repeat or a concurrent call never makes a second year);
//   2. stamps reporting_year_id on that org's periods of that year;
//   3. mirrors the period lifecycle onto the year — monotonic
//      setup → active → published, never backwards, published terminal:
//        any live period active / locked / published  → year 'active'
//        every live period published                  → year 'published'
//        otherwise                                    → year 'setup'
//      ('archived' periods are ignored.) A year published elsewhere
//      (/api/workflow publish) is immutable and is never reopened.
//
// Every statement is scoped to the caller org. The demo org's seeded FY2026
// year is never modified (it may be linked to, which only writes the period).
//
// Neon's HTTP driver has no interactive transactions, so each step is a
// single atomic, idempotent statement: the insert relies on the UNIQUE key,
// and status changes are compare-and-set on the status read in step 1.
// ═══════════════════════════════════════════════════════════════════

/** The demo org's seeded year (api/setup.ts). Never modified by period sync. */
export const DEMO_REPORTING_YEAR_ID = '11000000-0000-0000-0000-000000000026'

export type YearStatus = 'setup' | 'active' | 'published'
const RANK: Record<YearStatus, number> = { setup: 0, active: 1, published: 2 }
const isYearStatus = (s: string): s is YearStatus => s in RANK

/** Year status implied by the statuses of an org's periods of that year. */
export function impliedYearStatus(periodStatuses: readonly string[]): YearStatus | null {
  const live = periodStatuses.filter(s => s !== 'archived')
  if (live.length === 0) return null
  if (live.every(s => s === 'published')) return 'published'
  if (live.some(s => s === 'active' || s === 'locked' || s === 'published')) return 'active'
  return 'setup'
}

/** Monotonic step: only ever moves a year forward; 'published' is terminal. */
export function nextYearStatus(current: string, implied: YearStatus | null): string {
  if (!implied || !isYearStatus(current)) return current
  return RANK[implied] > RANK[current] ? implied : current
}

export interface PeriodYearLink {
  reporting_year_id: string
  year: number
  /** Year status after the sync. */
  status: string
  /** A new reporting_year row was inserted by this call. */
  created: boolean
  /** reporting_periods.reporting_year_id is set (false until /api/setup adds the column). */
  linked: boolean
}

/** Postgres SQLSTATE for "column does not exist". */
const UNDEFINED_COLUMN = '42703'
let warnedMissingColumn = false

/**
 * Create-or-link the caller org's reporting_year for a period and mirror the
 * period lifecycle onto it. Returns null when the period isn't the caller
 * org's, or when it has no year and `create` is false.
 *
 * `create`: insert the year if the org has none for the period's year. Pass
 * true for setup / active / locked periods; false for published / archived
 * (closing a period never conjures up an empty year).
 */
export async function syncPeriodReportingYear(
  sql: Sql,
  orgId: string,
  periodId: string,
  opts: { create: boolean },
): Promise<PeriodYearLink | null> {
  const periods = await sql`
    SELECT id, year, status, publish_hash
    FROM reporting_periods
    WHERE id = ${periodId} AND org_id = ${orgId}
  ` as Array<{ id: string; year: number; status: string; publish_hash: string | null }>
  const period = periods[0]
  if (!period) return null
  const year = Number(period.year)

  const siblings = await sql`
    SELECT status FROM reporting_periods
    WHERE org_id = ${orgId} AND year = ${year}
  ` as Array<{ status: string }>
  const implied = impliedYearStatus(siblings.map(s => s.status))

  // ── 1. create-or-link ──────────────────────────────────────────────
  const findYear = async () => (await sql`
    SELECT id, status FROM reporting_year
    WHERE organisation_id = ${orgId} AND year = ${year}
    LIMIT 1
  ` as Array<{ id: string; status: string }>)[0]

  let ry = await findYear()
  let created = false
  if (!ry) {
    if (!opts.create) return null
    const initial: YearStatus = implied === 'setup' || implied === null ? 'setup' : 'active'
    const ins = await sql`
      INSERT INTO reporting_year (organisation_id, year, status)
      VALUES (${orgId}, ${year}, ${initial})
      ON CONFLICT (organisation_id, year) DO NOTHING
      RETURNING id, status
    ` as Array<{ id: string; status: string }>
    created = ins.length > 0
    // Nothing returned → a concurrent call inserted it first; use that row.
    ry = ins[0] ?? await findYear()
    if (!ry) throw new Error(`reporting_year for ${year} could not be created`)
  }

  // ── 2. link the org's periods of that year ─────────────────────────
  let linked = true
  try {
    await sql`
      UPDATE reporting_periods SET reporting_year_id = ${ry.id}
      WHERE org_id = ${orgId} AND year = ${year}
        AND reporting_year_id IS DISTINCT FROM ${ry.id}
    `
  } catch (err: unknown) {
    if ((err as { code?: string } | null)?.code !== UNDEFINED_COLUMN) throw err
    linked = false
    if (!warnedMissingColumn) {
      warnedMissingColumn = true
      console.warn('[periodYear] reporting_periods.reporting_year_id missing — run /api/setup (ensurePeriodYearSchema)')
    }
  }

  // ── 3. mirror the lifecycle (compare-and-set) ──────────────────────
  let status = ry.status
  const next = nextYearStatus(ry.status, implied)
  if (next !== ry.status && ry.id !== DEMO_REPORTING_YEAR_ID) {
    const updated = next === 'published'
      ? await sql`
          UPDATE reporting_year
          SET status = 'published', published_at = now(), publish_hash = ${period.publish_hash ?? null}
          WHERE id = ${ry.id} AND organisation_id = ${orgId} AND status = ${ry.status}
          RETURNING status
        ` as Array<{ status: string }>
      : await sql`
          UPDATE reporting_year SET status = ${next}
          WHERE id = ${ry.id} AND organisation_id = ${orgId} AND status = ${ry.status}
          RETURNING status
        ` as Array<{ status: string }>
    // Lost a race → report whatever the winner left.
    status = updated[0]?.status ?? (await findYear())?.status ?? ry.status
  }

  return { reporting_year_id: ry.id, year, status, created, linked }
}

/**
 * Request-path wrapper: the period write has already succeeded, so a failed
 * year sync is logged and reported instead of failing the request. Both
 * period actions are idempotent, so repeating the action retries the sync.
 */
export async function syncPeriodReportingYearSafe(
  sql: Sql,
  orgId: string,
  periodId: string,
  opts: { create: boolean },
): Promise<{ reporting_year: PeriodYearLink | null; reporting_year_error?: string }> {
  try {
    return { reporting_year: await syncPeriodReportingYear(sql, orgId, periodId, opts) }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[periodYear] sync failed for period', periodId, message)
    return { reporting_year: null, reporting_year_error: message }
  }
}
