/**
 * One-shot seeder — runs every seed in the right order against whatever
 * DATABASE_URL is in .env. Use this to populate the production Neon DB.
 *
 * Usage:
 *   1. Temporarily set .env DATABASE_URL to the production value
 *      (copy from Vercel → Settings → Environment Variables)
 *   2. npx tsx scripts/seed-all.ts
 *   3. Restore your local DATABASE_URL in .env
 *
 * Each sub-seed is idempotent — running twice is safe.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(resolve(__dirname, '..'), '.env') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — aborting.')
  process.exit(1)
}

const host = process.env.DATABASE_URL.match(/@([^/]+)/)?.[1] ?? '(unknown)'
console.log(`\n▶ Seeding database at ${host}\n`)

const STEPS: Array<{ name: string; file: string }> = [
  { name: 'Tables + platform schema',   file: 'patch-roles.ts' },
  { name: 'Org structure + users',      file: 'seed-org.ts' },
  { name: 'Data Standard catalogue',    file: 'seed-data-standard.ts' },
  { name: 'TCFD + CSRD questionnaires', file: 'seed-tcfd-csrd.ts' },
  { name: 'PTTGC branding',             file: 'brand-pttgc.ts' },
  { name: 'Anomaly tables',             file: 'migrate-anomalies.ts' },
  { name: 'Report artifact tables',     file: 'migrate-report-artifacts.ts' },
  { name: 'Realistic historical values', file: 'reseed-realistic-values.ts' },
  { name: 'Client demo assignments',    file: 'seed-client-demo.ts' },
]

const scriptsDir = resolve(__dirname)

for (const step of STEPS) {
  const path = join(scriptsDir, step.file)
  console.log(`\n━━━ ${step.name} (${step.file}) ━━━`)
  const r = spawnSync('npx', ['tsx', path], {
    stdio: 'inherit',
    env: process.env,
  })
  if (r.status !== 0) {
    console.error(`\n✗ Step "${step.name}" failed with exit code ${r.status}.`)
    console.error('  Fix the error and re-run — each step is idempotent.')
    process.exit(r.status ?? 1)
  }
}

console.log('\n✓ All seeds complete.\n')
