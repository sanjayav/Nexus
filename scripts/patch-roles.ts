/**
 * Post-setup patch — brings the DB role model into line with the new RBAC catalog.
 *
 * The base setup seeds 5 legacy roles: admin, team-lead, analyst, viewer, auditor.
 * The new RBAC model has 6: platform_admin, group_sustainability_officer,
 * subsidiary_lead, plant_manager, data_contributor, auditor.
 *
 * This script:
 *   1. Adds group_sustainability_officer, plant_manager, data_contributor as
 *      additional role rows (with the right permission sets).
 *   2. Re-maps the seeded demo users so each one exercises a distinct role:
 *        admin@aeiforo.com → platform_admin (was admin — compatible)
 *        so@aeiforo.com    → group_sustainability_officer (was viewer — upgrade)
 *        tl@aeiforo.com    → subsidiary_lead (was team-lead — compatible)
 *        fm@aeiforo.com    → plant_manager (was analyst — compatible)
 *        maya@aeiforo.com  → data_contributor (new user)
 *        aud@aeiforo.com   → auditor (new user)
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage: npm run patch-roles    (requires DATABASE_URL in .env)
 */

import { neon } from '@neondatabase/serverless'
import * as bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
loadEnv({ path: join(ROOT, '.env') })

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const ORG = '00000000-0000-0000-0000-000000000001'

// New role definitions. Fixed UUIDs so re-runs don't create duplicates.
const NEW_ROLES = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    name: 'Group Sustainability Officer',
    slug: 'group_sustainability_officer',
    description: 'Approves consolidated figures, signs off the group report',
    perms: [
      ['dashboard', 'view'], ['calculators', 'view'], ['data', 'view'],
      ['workflow', 'view'], ['workflow', 'approve'],
      ['reports', 'view'], ['reports', 'create'], ['reports', 'publish'],
      ['analytics', 'view'], ['audit', 'view'],
    ],
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    name: 'Plant Manager',
    slug: 'plant_manager',
    description: 'Owns data entry for a single plant, assigns contributors',
    perms: [
      ['dashboard', 'view'], ['calculators', 'view'], ['calculators', 'edit'],
      ['data', 'view'], ['data', 'upload'],
      ['workflow', 'view'], ['reports', 'view'], ['analytics', 'view'],
    ],
  },
  {
    id: '00000000-0000-0000-0000-0000000000a3',
    name: 'Data Contributor',
    slug: 'data_contributor',
    description: 'Answers assigned questionnaires, attaches evidence',
    perms: [
      ['dashboard', 'view'], ['calculators', 'view'], ['calculators', 'edit'],
      ['data', 'view'], ['data', 'upload'],
      ['workflow', 'view'], ['reports', 'view'],
    ],
  },
]

// Users: one per role, plus auditor. `existingId` = id that setup.ts created;
// when present we keep it. New users get their own fixed UUIDs.
const USER_ROLE_MAP: Array<{
  email: string
  name: string
  newId?: string
  roleSlug: string
}> = [
  { email: 'admin@aeiforo.com', name: 'Jane Mitchell', roleSlug: 'admin' }, // already correct
  { email: 'so@aeiforo.com', name: 'Alex Rivera', roleSlug: 'group_sustainability_officer' },
  { email: 'tl@aeiforo.com', name: 'Tom Harris', roleSlug: 'team-lead' }, // subsidiary_lead via legacy map
  { email: 'fm@aeiforo.com', name: 'Sarah Chen', roleSlug: 'plant_manager' },
  { email: 'maya@aeiforo.com', name: 'Maya Prasert', newId: '00000000-0000-0000-0000-000000000201', roleSlug: 'data_contributor' },
  { email: 'aud@aeiforo.com', name: 'External Auditor', newId: '00000000-0000-0000-0000-000000000202', roleSlug: 'auditor' },
]

async function main() {
  console.log('▶ Patching role model…')

  // 1. Insert new roles
  for (const r of NEW_ROLES) {
    await sql`
      INSERT INTO roles (id, org_id, name, slug, description, is_system)
      VALUES (${r.id}, ${ORG}, ${r.name}, ${r.slug}, ${r.description}, true)
      ON CONFLICT (org_id, slug) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description
    `
    console.log(`  ✓ role: ${r.slug}`)
    // Assign permissions
    for (const [resource, action] of r.perms) {
      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT ${r.id}, id FROM permissions WHERE resource=${resource} AND action=${action}
        ON CONFLICT DO NOTHING
      `
    }
  }

  // 2. Create any missing users (default password: demo2026)
  const hash = bcrypt.hashSync('demo2026', 10)
  for (const u of USER_ROLE_MAP) {
    if (u.newId) {
      await sql`
        INSERT INTO users (id, org_id, email, name, password_hash)
        VALUES (${u.newId}, ${ORG}, ${u.email}, ${u.name}, ${hash})
        ON CONFLICT (email) DO NOTHING
      `
      console.log(`  ✓ user: ${u.email}`)
    }
  }

  // 3. Re-map user roles
  for (const u of USER_ROLE_MAP) {
    const userRows = await sql`SELECT id FROM users WHERE email = ${u.email}` as Array<{ id: string }>
    if (userRows.length === 0) {
      console.log(`  ✗ user not found: ${u.email}`)
      continue
    }
    const userId = userRows[0].id
    const roleRows = await sql`SELECT id FROM roles WHERE slug = ${u.roleSlug} AND org_id = ${ORG}` as Array<{ id: string }>
    if (roleRows.length === 0) {
      console.log(`  ✗ role not found: ${u.roleSlug}`)
      continue
    }
    const roleId = roleRows[0].id
    // Wipe prior roles for this user, then assign the new one (single-role model for demo clarity)
    await sql`DELETE FROM user_roles WHERE user_id = ${userId}`
    await sql`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (${userId}, ${roleId})
      ON CONFLICT DO NOTHING
    `
    console.log(`  ✓ ${u.email} → ${u.roleSlug}`)
  }

  // 4. Summary
  const users = await sql`
    SELECT u.email, u.name, array_agg(r.slug) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.email, u.name
    ORDER BY u.email
  ` as Array<{ email: string; name: string; roles: string[] }>

  console.log('\n▶ Users in DB:')
  for (const u of users) {
    console.log(`  ${u.email.padEnd(25)} ${u.name.padEnd(22)} [${u.roles.filter(Boolean).join(', ')}]`)
  }

  console.log('\n✓ Patch complete.')
}

main().catch(err => { console.error('ERROR:', err); process.exit(1) })
