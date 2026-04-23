/**
 * Adds a lively task spread for every contributor role so client demos feel
 * populated. Every role sees 5+ items in varied statuses.
 *
 * Idempotent: checks for existing assignments per (assignee_email, question_id)
 * before inserting, so running twice does nothing new.
 *
 * Usage: npm run seed-client
 */
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(resolve(__dirname, '..'), '.env') })
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)

const ORG = '00000000-0000-0000-0000-000000000001'

const E = {
  plant_mtp: '00000000-0000-0000-0000-00000000e030',
  plant_ray: '00000000-0000-0000-0000-00000000e031',
  plant_jur: '00000000-0000-0000-0000-00000000e032',
  plant_tpe: '00000000-0000-0000-0000-00000000e033',
  group:     '00000000-0000-0000-0000-00000000e001',
}

interface Plan {
  email: string
  name: string
  entityId: string
  griPrefix: string        // which GRI code prefix to pick from (e.g. '305-', '302-', '2-')
  keyword?: string         // optional line-item filter
  status: 'not_started' | 'in_progress' | 'submitted' | 'reviewed' | 'approved' | 'rejected'
  modes: string[]
  responseType: 'numeric' | 'narrative'
  value: number | null
  unit: string | null
  due: string
  comment?: string
  usedMode?: string
  narrativeBody?: string
}

/**
 * The demo story. Each plan becomes one new question_assignments row — but
 * only if the user doesn't already have an assignment on a matching question.
 */
// Plans use GRI codes that actually exist in the PTTGC seed (2-5..2-30, 302-1, 302-4, 303-x, 305-x, 306-x, 403-x, 405-x).
const PLANS: Plan[] = [
  // ── Sarah Chen (fm@) · Plant Manager · Map Ta Phut · 5 new ─────
  { email: 'fm@aeiforo.com',    name: 'Sarah Chen',    entityId: E.plant_mtp,
    griPrefix: '302-1', status: 'not_started', modes: ['Manual','Calculator'], responseType: 'numeric',
    value: null, unit: 'GJ', due: '2026-06-15' },
  { email: 'fm@aeiforo.com',    name: 'Sarah Chen',    entityId: E.plant_mtp,
    griPrefix: '302-4', status: 'in_progress', modes: ['Calculator'],          responseType: 'numeric',
    value: 42000, unit: 'GJ', due: '2026-06-01', usedMode: 'Calculator',
    comment: 'Draft — need to reconcile with Q1 production volumes' },
  { email: 'fm@aeiforo.com',    name: 'Sarah Chen',    entityId: E.plant_mtp,
    griPrefix: '306-3', status: 'submitted', modes: ['Manual'],                responseType: 'numeric',
    value: 18400, unit: 'tonnes', due: '2026-05-31', usedMode: 'Manual' },
  { email: 'fm@aeiforo.com',    name: 'Sarah Chen',    entityId: E.plant_mtp,
    griPrefix: '306-5', status: 'not_started', modes: ['Manual'],              responseType: 'numeric',
    value: null, unit: 'tonnes disposed', due: '2026-06-20' },
  { email: 'fm@aeiforo.com',    name: 'Sarah Chen',    entityId: E.plant_mtp,
    griPrefix: '403-9', status: 'rejected', modes: ['Manual'],                 responseType: 'numeric',
    value: 3.2, unit: 'incidents / 200,000 hrs worked', due: '2026-05-25', usedMode: 'Manual',
    comment: 'Rejected — include contractor hours per GRI 403-9 methodology' },

  // ── Maya Prasert (maya@) · Data Contributor · Rayong · 5 new ──
  { email: 'maya@aeiforo.com',  name: 'Maya Prasert',  entityId: E.plant_ray,
    griPrefix: '303-4', status: 'not_started', modes: ['Manual','Connector'],  responseType: 'numeric',
    value: null, unit: 'megalitres', due: '2026-06-15' },
  { email: 'maya@aeiforo.com',  name: 'Maya Prasert',  entityId: E.plant_ray,
    griPrefix: '302-1', status: 'in_progress', modes: ['Connector'],           responseType: 'numeric',
    value: 488000, unit: 'GJ', due: '2026-06-10', usedMode: 'Connector',
    comment: 'Pulling SCADA feed for final Q2 number' },
  { email: 'maya@aeiforo.com',  name: 'Maya Prasert',  entityId: E.plant_ray,
    griPrefix: '306-4', status: 'submitted', modes: ['Manual'],                responseType: 'numeric',
    value: 11200, unit: 'tonnes diverted', due: '2026-05-30', usedMode: 'Manual' },
  { email: 'maya@aeiforo.com',  name: 'Maya Prasert',  entityId: E.plant_ray,
    griPrefix: '303-5', status: 'not_started', modes: ['Manual','Calculator'], responseType: 'numeric',
    value: null, unit: 'megalitres', due: '2026-06-22' },
  { email: 'maya@aeiforo.com',  name: 'Maya Prasert',  entityId: E.plant_ray,
    griPrefix: '305-3', status: 'submitted', modes: ['Manual','Calculator'],   responseType: 'numeric',
    value: 612000, unit: 'tonnes CO2e', due: '2026-05-31', usedMode: 'Calculator' },

  // ── Priya Sharma (narrator@) · Narrative Owner · 5 narrative ──
  // GRI 2-x Universal Standards are governance narratives.
  { email: 'narrator@aeiforo.com', name: 'Priya Sharma', entityId: E.group,
    griPrefix: '2-9',  status: 'not_started', modes: ['Manual'], responseType: 'narrative',
    value: null, unit: null, due: '2026-06-30' },
  { email: 'narrator@aeiforo.com', name: 'Priya Sharma', entityId: E.group,
    griPrefix: '2-11', status: 'in_progress', modes: ['Manual'], responseType: 'narrative',
    value: null, unit: null, due: '2026-06-20',
    usedMode: 'Manual',
    narrativeBody: 'The Chair of the highest governance body is an independent non-executive director, separate from the role of CEO. This independence is safeguarded by the Nomination Committee, composed entirely of independent directors, which reviews Board composition annually.\n\n[Draft — to expand with tenure + conflict-of-interest disclosures]' },
  { email: 'narrator@aeiforo.com', name: 'Priya Sharma', entityId: E.group,
    griPrefix: '2-27', status: 'submitted', modes: ['Manual'], responseType: 'narrative',
    value: null, unit: null, due: '2026-06-15',
    usedMode: 'Manual',
    narrativeBody: 'During the reporting period, there were zero material instances of non-compliance with laws or regulations. One minor environmental notice of violation was received at the Rayong Aromatics Complex related to a Q1 stormwater-permit parameter; it was remediated within 30 days with no fines levied. All incidents are tracked via the Group Compliance Register and reported quarterly to the Audit Committee.' },
  { email: 'narrator@aeiforo.com', name: 'Priya Sharma', entityId: E.group,
    griPrefix: '2-6',  status: 'not_started', modes: ['Manual'], responseType: 'narrative',
    value: null, unit: null, due: '2026-07-10' },
  { email: 'narrator@aeiforo.com', name: 'Priya Sharma', entityId: E.group,
    griPrefix: '2-30', status: 'reviewed', modes: ['Manual'], responseType: 'narrative',
    value: null, unit: null, due: '2026-05-28',
    usedMode: 'Manual',
    narrativeBody: '76% of the global workforce is covered by collective bargaining agreements, concentrated in manufacturing operations in Thailand, Singapore and Vietnam. Where employees are not covered by a collective agreement, working conditions are determined by the local Employment Act and the Group Code of Conduct, which meets or exceeds ILO fundamental conventions. No known limitations to freedom of association apply in any operating jurisdiction.' },

  // ── Cross-plant variety — adds to rollup + gives tl/so more to work on ──
  { email: 'fm@aeiforo.com',    name: 'Sarah Chen',    entityId: E.plant_tpe,
    griPrefix: '305-1', status: 'submitted', modes: ['Manual','Calculator'], responseType: 'numeric',
    value: 245000, unit: 'tonnes CO2e', due: '2026-06-05', usedMode: 'Calculator',
    comment: 'TPE rollup — co-owned with polymer BU' },
  { email: 'maya@aeiforo.com',  name: 'Maya Prasert',  entityId: E.plant_jur,
    griPrefix: '302-1', status: 'reviewed', modes: ['Connector'], responseType: 'numeric',
    value: 142000, unit: 'GJ', due: '2026-05-30', usedMode: 'Connector' },
]

async function main() {
  console.log(`▶ Seeding ${PLANS.length} varied assignments for client demo…\n`)

  let created = 0
  let skipped = 0

  for (const p of PLANS) {
    // Find a matching GRI question to point to
    const qRows = await sql`
      SELECT id, gri_code, line_item
      FROM questionnaire_item
      WHERE framework_id = 'gri' AND gri_code LIKE ${p.griPrefix + '%'}
      ${p.keyword ? sql`AND line_item ILIKE ${'%' + p.keyword + '%'}` : sql``}
      LIMIT 1
    ` as Array<{ id: string; gri_code: string; line_item: string }>

    if (qRows.length === 0) {
      console.log(`  ⚠ no GRI question found for prefix ${p.griPrefix} — skipping`)
      skipped++
      continue
    }
    const q = qRows[0]

    // Skip if this user already has an assignment on this question
    const existing = await sql`
      SELECT id FROM question_assignments
      WHERE org_id = ${ORG} AND assignee_email = ${p.email} AND questionnaire_item_id = ${q.id}
      LIMIT 1
    ` as Array<{ id: string }>
    if (existing.length > 0) {
      console.log(`  − ${p.email} already has ${q.gri_code} — skipped`)
      skipped++
      continue
    }

    // Resolve user id
    const uRows = await sql`SELECT id FROM users WHERE email = ${p.email}` as Array<{ id: string }>
    const userId = uRows[0]?.id ?? null

    // Resolve active period
    const pRows = await sql`SELECT id FROM reporting_periods WHERE org_id = ${ORG} AND status = 'active' LIMIT 1` as Array<{ id: string }>
    const periodId = pRows[0]?.id ?? null

    await sql`
      INSERT INTO question_assignments
        (org_id, framework_id, questionnaire_item_id, gri_code, line_item, unit,
         entity_id, assignee_email, assignee_name, assignee_user_id,
         entry_modes, used_mode, due_date, status, value, comment, response_type,
         narrative_body, period_id, assigned_by)
      VALUES
        (${ORG}, 'gri', ${q.id}, ${q.gri_code}, ${q.line_item}, ${p.unit},
         ${p.entityId}, ${p.email}, ${p.name}, ${userId},
         ${JSON.stringify(p.modes)}::jsonb, ${p.usedMode ?? null}, ${p.due}, ${p.status}, ${p.value},
         ${p.comment ?? null}, ${p.responseType},
         ${p.narrativeBody ?? null}, ${periodId}, 'admin@aeiforo.com')
    `
    console.log(`  ✓ ${p.email.padEnd(22)} ${p.status.padEnd(12)} ${q.gri_code.padEnd(14)} · ${q.line_item.slice(0, 50)}`)
    created++
  }

  // Summary per user
  console.log(`\n▶ Per-user inbox after seed:`)
  const counts = await sql`
    SELECT assignee_email, status, COUNT(*)::int AS n
    FROM question_assignments WHERE org_id = ${ORG}
    GROUP BY assignee_email, status
    ORDER BY assignee_email, status
  ` as Array<{ assignee_email: string; status: string; n: number }>
  const byUser = new Map<string, Record<string, number>>()
  for (const c of counts) {
    if (!byUser.has(c.assignee_email)) byUser.set(c.assignee_email, {})
    byUser.get(c.assignee_email)![c.status] = c.n
  }
  for (const [email, st] of byUser) {
    const total = Object.values(st).reduce((s, n) => s + n, 0)
    console.log(`  ${email.padEnd(24)} total=${total}  ` + Object.entries(st).map(([s, n]) => `${s}=${n}`).join(' · '))
  }

  console.log(`\n✓ created ${created}  skipped ${skipped}`)
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
