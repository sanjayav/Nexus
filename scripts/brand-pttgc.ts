/**
 * Brand the demo tenant as PTTGC for tomorrow's POC.
 *
 * Adds brand columns (logo_url, primary_color, legal_name, country, thai_name)
 * to `organisations` if missing, then updates the demo tenant row.
 *
 * Idempotent.
 */
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
loadEnv({ path: join(ROOT, '.env') })
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)

const ORG = '00000000-0000-0000-0000-000000000001'

async function main() {
  console.log('▶ Adding brand columns + PTTGC branding…')

  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS legal_name TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS thai_name TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS primary_color TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS secondary_color TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_mark TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS industry TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS headquarters TEXT`
  await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS website TEXT`
  console.log('  ✓ brand columns ready')

  // PTTGC branding: corporate navy → green gradient
  await sql`
    UPDATE organisations SET
      name            = ${'PTT Global Chemical'},
      legal_name      = ${'PTT Global Chemical Public Company Limited'},
      thai_name       = ${'บริษัท พีทีที โกลบอล เคมิคอล จำกัด (มหาชน)'},
      country         = ${'Thailand'},
      primary_color   = ${'#00448C'},
      secondary_color = ${'#00A651'},
      logo_mark       = ${'PTTGC'},
      industry        = ${'Petrochemicals'},
      headquarters    = ${'Bangkok, Thailand'},
      website         = ${'https://www.pttgcgroup.com'}
    WHERE id = ${ORG}
  `
  console.log('  ✓ Tenant rebranded to PTTGC')

  const v = await sql`SELECT name, legal_name, thai_name, primary_color, secondary_color FROM organisations WHERE id = ${ORG}`
  console.log('\n', v[0])
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
