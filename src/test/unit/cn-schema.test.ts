/**
 * api/_cnSchema.ts must be strictly additive and idempotent: production runs
 * it on every push to main via /api/setup.
 */
import { describe, it, expect } from 'vitest'
import { ensureCnSchema } from '../../../api/_cnSchema'
import type { Sql } from '../../../api/_db'
import { makeFakeSql } from './fake-sql'

describe('ensureCnSchema', () => {
  it('only issues CREATE TABLE/INDEX IF NOT EXISTS and ADD COLUMN IF NOT EXISTS', async () => {
    const sql = makeFakeSql()
    await ensureCnSchema(sql as unknown as Sql)
    expect(sql.calls.length).toBeGreaterThan(5)
    for (const { q } of sql.calls) {
      const ok =
        /^CREATE TABLE IF NOT EXISTS /.test(q) ||
        /^CREATE INDEX IF NOT EXISTS /.test(q) ||
        /^ALTER TABLE (IF EXISTS )?\w+ ADD COLUMN IF NOT EXISTS \w+ [A-Z]+(\[\])?$/.test(q)
      expect(ok, q).toBe(true)
      // FK clauses ("ON DELETE CASCADE") aside, nothing destructive or data-changing.
      const body = q.replace(/ON DELETE CASCADE/g, '')
      expect(body).not.toMatch(/\b(DROP|DELETE FROM|UPDATE \w+ SET|INSERT INTO|TRUNCATE|RENAME|ALTER COLUMN|SET NOT NULL)\b/i)
    }
    expect(sql.calls.every(c => c.values.length === 0)).toBe(true)
  })

  it('creates every Phase 4 table and the locale columns', async () => {
    const sql = makeFakeSql()
    await ensureCnSchema(sql as unknown as Sql)
    const all = sql.calls.map(c => c.q).join('\n')
    for (const table of ['org_settings', 'org_notify_channels', 'energy_attribute_certificates', 'carbon_credits']) {
      expect(all).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
    expect(all).toContain('ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS locale TEXT')
    expect(all).toContain('ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS message_key TEXT')
    expect(all).toContain('ALTER TABLE IF EXISTS anomalies ADD COLUMN IF NOT EXISTS ai_narrative_locale TEXT')
    expect(all).toContain('ALTER TABLE IF EXISTS ai_gap_analyses ADD COLUMN IF NOT EXISTS locale TEXT')
    // AI stays on by default — never auto-disables, never auto-enables anything new.
    expect(all).toMatch(/ai_enabled BOOLEAN NOT NULL DEFAULT true/)
    expect(all).toMatch(/market TEXT NOT NULL DEFAULT 'global'/)
    // Secrets are stored encrypted.
    expect(all).toMatch(/webhook_url_enc TEXT NOT NULL/)
    expect(all).toMatch(/secret_enc TEXT/)
  })

  it('is idempotent (safe to run twice)', async () => {
    const sql = makeFakeSql()
    await ensureCnSchema(sql as unknown as Sql)
    const first = sql.calls.length
    await ensureCnSchema(sql as unknown as Sql)
    expect(sql.calls.length).toBe(first * 2)
    expect(sql.calls.slice(first).map(c => c.q)).toEqual(sql.calls.slice(0, first).map(c => c.q))
  })
})
