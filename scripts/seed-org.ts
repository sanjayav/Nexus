/**
 * Seeds the org_entities + org_members + question_assignments tables with a
 * realistic starting state tied to REAL questionnaire_item rows in Neon.
 *
 * Idempotent per entity — if the group already exists we skip. To fully
 * re-seed, run `npm run wipe-org` first (below).
 *
 * Usage: npm run seed-org
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

// Fixed entity UUIDs so re-runs don't create duplicates
const E = {
  group:     '00000000-0000-0000-0000-00000000e001',
  bu_chem:   '00000000-0000-0000-0000-00000000e010',
  bu_poly:   '00000000-0000-0000-0000-00000000e011',
  sub_cth:   '00000000-0000-0000-0000-00000000e020',
  sub_intl:  '00000000-0000-0000-0000-00000000e021',
  sub_poly:  '00000000-0000-0000-0000-00000000e022',
  plant_mtp: '00000000-0000-0000-0000-00000000e030',
  plant_ray: '00000000-0000-0000-0000-00000000e031',
  plant_jur: '00000000-0000-0000-0000-00000000e032',
  plant_tpe: '00000000-0000-0000-0000-00000000e033',
}

async function main() {
  console.log('▶ Seeding org structure in Neon…')

  // ── Entities ────────────────────────────────────────
  const entities = [
    [E.group,     null,        'group',         'PTT Global Chemical PCL',             'PTTGC',    'Thailand',  null, 'Petrochemicals'],
    [E.bu_chem,   E.group,     'business_unit', 'Chemicals',                            'CHEM',     'Thailand',  null, null],
    [E.bu_poly,   E.group,     'business_unit', 'Polymers & Specialty',                 'POLY',     'Thailand',  null, null],
    [E.sub_cth,   E.bu_chem,   'subsidiary',    'PTTGC Chemicals Thailand',             'GC-TH',    'Thailand',  100,  null],
    [E.sub_intl,  E.bu_chem,   'subsidiary',    'PTTGC International (Singapore)',      'GC-SG',    'Singapore', 80,   null],
    [E.sub_poly,  E.bu_poly,   'subsidiary',    'Thai Polyethylene Co.',                'TPE',      'Thailand',  100,  null],
    [E.plant_mtp, E.sub_cth,   'plant',         'Map Ta Phut Olefins Plant',            'MTP-OLE',  'Thailand',  null, null],
    [E.plant_ray, E.sub_cth,   'plant',         'Rayong Aromatics Complex',             'RAY-ARO',  'Thailand',  null, null],
    [E.plant_jur, E.sub_intl,  'plant',         'Jurong Island Terminal',               'JUR-TRM',  'Singapore', null, null],
    [E.plant_tpe, E.sub_poly,  'plant',         'Rayong Polyethylene Plant',            'TPE-RAY',  'Thailand',  null, null],
  ] as const
  for (const [id, parent, type, name, code, country, equity, industry] of entities) {
    await sql`
      INSERT INTO org_entities (id, org_id, parent_id, type, name, code, country, equity, industry)
      VALUES (${id}, ${ORG}, ${parent}, ${type}, ${name}, ${code}, ${country}, ${equity}, ${industry})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, country = EXCLUDED.country, equity = EXCLUDED.equity
    `
    console.log(`  ✓ entity: ${name}`)
  }

  // ── Members ────────────────────────────────────────
  // Bind to real user IDs where present.
  const users = await sql`SELECT id, email FROM users WHERE org_id = ${ORG}` as Array<{ id: string; email: string }>
  const userByEmail = new Map(users.map(u => [u.email.toLowerCase(), u.id]))
  const uid = (email: string): string | null => userByEmail.get(email.toLowerCase()) ?? null

  const members = [
    ['admin@aeiforo.com', 'Jane Mitchell',    'platform_admin',                E.group],
    ['so@aeiforo.com',    'Alex Rivera',      'group_sustainability_officer',  E.group],
    ['tl@aeiforo.com',    'Tom Harris',       'subsidiary_lead',               E.sub_cth],
    ['fm@aeiforo.com',    'Sarah Chen',       'plant_manager',                 E.plant_mtp],
    ['maya@aeiforo.com',  'Maya Prasert',     'data_contributor',              E.plant_ray],
    ['aud@aeiforo.com',   'External Auditor', 'auditor',                       E.group],
  ] as const
  for (const [email, name, role, entityId] of members) {
    await sql`
      INSERT INTO org_members (org_id, user_id, entity_id, email, name, role)
      VALUES (${ORG}, ${uid(email)}, ${entityId}, ${email}, ${name}, ${role})
      ON CONFLICT (org_id, email, entity_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    `
    console.log(`  ✓ member: ${email} → ${role}`)
  }

  // ── Assignments — pick real questionnaire_item rows ──
  // Grab one representative row per (gri_code prefix, keyword) so every assignment
  // we want to create has a valid UUID to reference.
  const griQuestions = await sql`
    WITH ranked AS (
      SELECT id, gri_code, line_item, unit,
             ROW_NUMBER() OVER (PARTITION BY LEFT(gri_code, 5) ORDER BY line_item) AS rn
      FROM questionnaire_item
      WHERE gri_code LIKE '305-%' OR gri_code LIKE '303-%'
    )
    SELECT id, gri_code, line_item, unit FROM ranked WHERE rn <= 10
    ORDER BY gri_code
  ` as Array<{ id: string; gri_code: string; line_item: string; unit: string | null }>

  if (griQuestions.length === 0) {
    console.error('  ✗ No GRI 305/303 questions in DB. Run /api/setup first (it seeds PTTGC questionnaire items).')
    return
  }

  // Pick distinct ones for the demo
  const pick = (code: string, keyword?: string) => {
    const matches = griQuestions.filter(q => q.gri_code.startsWith(code))
    if (keyword) {
      const k = matches.find(q => q.line_item.toLowerCase().includes(keyword.toLowerCase()))
      if (k) return k
    }
    return matches[0]
  }
  const q_305_1 = pick('305-1', 'total direct')
  const q_305_2_loc = pick('305-2', 'location')
  const q_305_2_mkt = pick('305-2', 'market')
  const q_305_3 = pick('305-3')
  const q_305_4 = pick('305-4')
  const q_305_5 = pick('305-5')
  const q_305_7 = pick('305-7')
  const q_303_3 = pick('303-3')

  // Wipe existing demo assignments first (idempotent reseed)
  await sql`DELETE FROM question_assignments WHERE org_id = ${ORG}`

  const assignments: Array<{
    q: { id: string; gri_code: string; line_item: string; unit: string | null }
    entityId: string
    email: string
    name: string
    modes: string[]
    status: string
    value: number | null
    due: string
    used_mode: string | null
  }> = [
    // Sarah Chen (fm@) at Map Ta Phut — varied statuses
    { q: q_305_1, entityId: E.plant_mtp, email: 'fm@aeiforo.com', name: 'Sarah Chen', modes: ['Manual', 'Calculator'], status: 'not_started', value: null, due: '2026-05-15', used_mode: null },
    { q: q_303_3, entityId: E.plant_mtp, email: 'fm@aeiforo.com', name: 'Sarah Chen', modes: ['Manual'], status: 'in_progress', value: 14200, due: '2026-06-01', used_mode: 'Manual' },
    { q: q_305_2_loc, entityId: E.plant_mtp, email: 'fm@aeiforo.com', name: 'Sarah Chen', modes: ['Manual', 'Connector'], status: 'submitted', value: 342000, due: '2026-05-20', used_mode: 'Connector' },
    { q: q_305_7, entityId: E.plant_mtp, email: 'fm@aeiforo.com', name: 'Sarah Chen', modes: ['Manual'], status: 'approved', value: 58.4, due: '2026-04-30', used_mode: 'Manual' },
    { q: q_305_3, entityId: E.plant_mtp, email: 'fm@aeiforo.com', name: 'Sarah Chen', modes: ['Manual', 'Calculator'], status: 'approved', value: 890000, due: '2026-05-25', used_mode: 'Calculator' },
    { q: q_305_4, entityId: E.plant_mtp, email: 'fm@aeiforo.com', name: 'Sarah Chen', modes: ['Calculator'], status: 'reviewed', value: 0.71, due: '2026-05-10', used_mode: 'Calculator' },

    // Maya Prasert (maya@) at Rayong
    { q: q_305_1, entityId: E.plant_ray, email: 'maya@aeiforo.com', name: 'Maya Prasert', modes: ['Manual', 'Calculator', 'Connector'], status: 'not_started', value: null, due: '2026-05-15', used_mode: null },
    { q: q_305_2_mkt, entityId: E.plant_ray, email: 'maya@aeiforo.com', name: 'Maya Prasert', modes: ['Manual', 'Connector'], status: 'submitted', value: 187000, due: '2026-05-20', used_mode: 'Manual' },
    { q: q_305_4, entityId: E.plant_ray, email: 'maya@aeiforo.com', name: 'Maya Prasert', modes: ['Calculator'], status: 'reviewed', value: 0.82, due: '2026-05-10', used_mode: 'Calculator' },
    { q: q_305_5, entityId: E.plant_ray, email: 'maya@aeiforo.com', name: 'Maya Prasert', modes: ['Manual'], status: 'rejected', value: 41000, due: '2026-05-18', used_mode: 'Manual' },
  ]

  for (const a of assignments) {
    await sql`
      INSERT INTO question_assignments
        (org_id, framework_id, questionnaire_item_id, gri_code, line_item, unit,
         entity_id, assignee_email, assignee_name, assignee_user_id,
         entry_modes, used_mode, due_date, status, value, assigned_by)
      VALUES
        (${ORG}, 'gri', ${a.q.id}, ${a.q.gri_code}, ${a.q.line_item}, ${a.q.unit},
         ${a.entityId}, ${a.email}, ${a.name}, ${uid(a.email)},
         ${JSON.stringify(a.modes)}::jsonb, ${a.used_mode}, ${a.due}, ${a.status}, ${a.value}, 'admin@aeiforo.com')
    `
  }
  console.log(`  ✓ ${assignments.length} assignments seeded against real GRI UUIDs`)

  console.log('\n✓ Org seed complete.')
}

main().catch(err => { console.error('ERROR:', err); process.exit(1) })
