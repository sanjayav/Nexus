import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from './_auth.js'
import { getDb, type Sql } from './_db.js'
import { audit, auditIp } from './_audit.js'
import { loadOrgSettings } from './_orgSettings.js'
import {
  certificateCreateSchema,
  certificateUpdateSchema,
  creditCreateSchema,
  creditPatchSchema,
  computeLedgerTotals,
  CN_RESIDUAL_FACTOR_KG_PER_KWH,
  type CertificateRow,
  type CreditRow,
} from './_greenLedger.js'

/**
 * Green power (绿证 / 绿电交易 / I-REC / PPA) and carbon-credit ledger.
 *
 *   GET    /api/green-certificates?year=2025[&kind=eac|credit]      data.view
 *            → { certificates, credits, totals }
 *   GET    /api/green-certificates?view=totals&year=2025[&purchased_mwh=…][&residual_factor=…]
 *            → LedgerTotals (market-based Scope 2 inputs + CN-SSE climate figures)
 *   POST   /api/green-certificates   { kind: 'eac', … } | { kind: 'credit', … }   data.upload
 *   PUT    /api/green-certificates?kind=eac|credit&id=<uuid>   partial patch       data.upload
 *   DELETE /api/green-certificates?kind=eac|credit&id=<uuid>   soft delete         data.upload
 *
 * purchased_mwh defaults to the org's Scope 2 electricity activity_data for
 * the year (kWh / MWh rows). residual_factor defaults to the MEE/NBS 2023
 * China residual factor (0.6096 kgCO2/kWh) for market 'cn' orgs, else null
 * (market-based tCO2e is then not computed).
 */

const idSchema = z.string().uuid()

type CertRecord = CertificateRow & Record<string, unknown> & { id: string }
type CreditRecord = CreditRow & Record<string, unknown> & { id: string }

function num(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function normaliseCert(r: CertRecord) {
  const d = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)
  return { ...r, mwh: num(r.mwh), period_start: d(r.period_start), period_end: d(r.period_end) }
}
function normaliseCredit(r: CreditRecord) {
  const d = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)
  return { ...r, tco2e: num(r.tco2e), retired_on: d(r.retired_on) }
}

async function purchasedElectricityMwh(sql: Sql, orgId: string, year: number): Promise<number | null> {
  try {
    const rows = (await sql`
      SELECT
        SUM(CASE WHEN lower(activity_unit) = 'kwh' THEN activity_value / 1000.0
                 WHEN lower(activity_unit) = 'mwh' THEN activity_value
                 WHEN lower(activity_unit) = 'gwh' THEN activity_value * 1000.0
                 ELSE 0 END) AS mwh,
        COUNT(*) FILTER (WHERE lower(activity_unit) IN ('kwh','mwh','gwh')) AS n
      FROM activity_data
      WHERE org_id = ${orgId} AND scope = 2 AND period_year = ${year}
        AND (category ILIKE '%electric%' OR category ILIKE '%grid%')
    `) as Array<{ mwh: string | number | null; n: string | number }>
    if (!rows[0] || Number(rows[0].n) === 0) return null
    return num(rows[0].mwh)
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const tok = await requirePermission(req, res, 'data.view')
      if (!tok) return
      const yearRaw = Number(req.query.year)
      const year = Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100 ? yearRaw : new Date().getUTCFullYear() - 1
      const kind = String(req.query.kind ?? '')

      const certs = kind === 'credit' ? [] : (await sql`
        SELECT id, instrument_type, mwh, period_start, period_end, certificate_id, facility_id,
               entity_id, supplier, energy_source, province, evidence_id, notes, created_at, updated_at
        FROM energy_attribute_certificates
        WHERE org_id = ${tok.org} AND is_active = true
          AND period_start <= ${`${year}-12-31`}::date AND period_end >= ${`${year}-01-01`}::date
        ORDER BY period_start DESC, created_at DESC
      `) as CertRecord[]
      const credits = kind === 'eac' ? [] : (await sql`
        SELECT id, standard, tco2e, vintage, registry_id, project_name, project_type, retired,
               retired_on, reporting_year, purpose, evidence_id, notes, created_at, updated_at
        FROM carbon_credits
        WHERE org_id = ${tok.org} AND is_active = true
          AND (reporting_year = ${year}
               OR (reporting_year IS NULL AND retired_on IS NOT NULL AND EXTRACT(YEAR FROM retired_on) = ${year})
               OR (reporting_year IS NULL AND retired_on IS NULL))
        ORDER BY COALESCE(retired_on, created_at::date) DESC
      `) as CreditRecord[]

      const settings = await loadOrgSettings(sql, tok.org)
      const purchasedParam = num(req.query.purchased_mwh)
      const factorParam = num(req.query.residual_factor)
      const purchased = purchasedParam ?? await purchasedElectricityMwh(sql, tok.org, year)
      const factor = factorParam ?? (settings.market === 'cn' ? CN_RESIDUAL_FACTOR_KG_PER_KWH : null)
      // Totals always use both ledgers, regardless of `kind`.
      const allCerts = kind === 'credit' ? (await sql`
        SELECT instrument_type, mwh, period_start, period_end FROM energy_attribute_certificates
        WHERE org_id = ${tok.org} AND is_active = true
          AND period_start <= ${`${year}-12-31`}::date AND period_end >= ${`${year}-01-01`}::date
      `) as CertificateRow[] : certs
      const allCredits = kind === 'eac' ? (await sql`
        SELECT standard, tco2e, vintage, retired, retired_on, reporting_year FROM carbon_credits
        WHERE org_id = ${tok.org} AND is_active = true
      `) as CreditRow[] : credits
      const totals = computeLedgerTotals({
        year, certificates: allCerts, credits: allCredits, purchasedMwh: purchased, residualFactorKgPerKwh: factor,
      })

      if (req.query.view === 'totals') return res.status(200).json(totals)
      return res.status(200).json({
        year,
        certificates: certs.map(normaliseCert),
        credits: credits.map(normaliseCredit),
        totals,
      })
    }

    const tok = await requirePermission(req, res, 'data.upload')
    if (!tok) return
    const actor = tok.sub
    const actorUserId = tok.sub.startsWith('apikey:') ? null : tok.sub
    const ip = auditIp(req)

    if (req.method === 'POST') {
      const kind = (req.body as { kind?: string } | undefined)?.kind
      if (kind === 'eac') {
        const p = certificateCreateSchema.safeParse(req.body)
        if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? 'Invalid body' })
        const b = p.data
        const rows = (await sql`
          INSERT INTO energy_attribute_certificates
            (org_id, instrument_type, mwh, period_start, period_end, certificate_id, facility_id, entity_id,
             supplier, energy_source, province, evidence_id, notes, created_by, updated_by)
          VALUES
            (${tok.org}, ${b.instrument_type}, ${b.mwh}, ${b.period_start}, ${b.period_end}, ${b.certificate_id ?? null},
             ${b.facility_id ?? null}, ${b.entity_id ?? null}, ${b.supplier ?? null}, ${b.energy_source ?? null},
             ${b.province ?? null}, ${b.evidence_id ?? null}, ${b.notes ?? null}, ${actor}, ${actor})
          RETURNING id, instrument_type, mwh, period_start, period_end, certificate_id, facility_id,
                    entity_id, supplier, energy_source, province, evidence_id, notes, created_at, updated_at
        `) as CertRecord[]
        await audit({ orgId: tok.org, userId: actorUserId, action: 'green_certificate.create', resourceType: 'energy_attribute_certificate', resourceId: rows[0].id, details: { instrument_type: b.instrument_type, mwh: b.mwh, period: [b.period_start, b.period_end], certificate_id: b.certificate_id ?? null }, ip })
        return res.status(201).json({ certificate: normaliseCert(rows[0]) })
      }
      if (kind === 'credit') {
        const p = creditCreateSchema.safeParse(req.body)
        if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? 'Invalid body' })
        const b = p.data
        const rows = (await sql`
          INSERT INTO carbon_credits
            (org_id, standard, tco2e, vintage, registry_id, project_name, project_type, retired, retired_on,
             reporting_year, purpose, evidence_id, notes, created_by, updated_by)
          VALUES
            (${tok.org}, ${b.standard}, ${b.tco2e}, ${b.vintage ?? null}, ${b.registry_id ?? null},
             ${b.project_name ?? null}, ${b.project_type ?? null}, ${b.retired ?? true}, ${b.retired_on ?? null},
             ${b.reporting_year ?? null}, ${b.purpose ?? null}, ${b.evidence_id ?? null}, ${b.notes ?? null}, ${actor}, ${actor})
          RETURNING id, standard, tco2e, vintage, registry_id, project_name, project_type, retired,
                    retired_on, reporting_year, purpose, evidence_id, notes, created_at, updated_at
        `) as CreditRecord[]
        await audit({ orgId: tok.org, userId: actorUserId, action: 'carbon_credit.create', resourceType: 'carbon_credit', resourceId: rows[0].id, details: { standard: b.standard, tco2e: b.tco2e, vintage: b.vintage ?? null, registry_id: b.registry_id ?? null }, ip })
        return res.status(201).json({ credit: normaliseCredit(rows[0]) })
      }
      return res.status(400).json({ error: "kind must be 'eac' or 'credit'" })
    }

    const kind = String(req.query.kind ?? '')
    const id = String(req.query.id ?? '')
    if (kind !== 'eac' && kind !== 'credit') return res.status(400).json({ error: "kind must be 'eac' or 'credit'" })
    if (!idSchema.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (kind === 'eac') {
        const p = certificateUpdateSchema.safeParse(req.body ?? {})
        if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? 'Invalid body' })
        const cur = (await sql`
          SELECT id, instrument_type, mwh, period_start, period_end, certificate_id, facility_id,
                 entity_id, supplier, energy_source, province, evidence_id, notes
          FROM energy_attribute_certificates WHERE id = ${id} AND org_id = ${tok.org} AND is_active = true
        `) as CertRecord[]
        if (cur.length === 0) return res.status(404).json({ error: 'Certificate not found' })
        const n = { ...normaliseCert(cur[0]), ...p.data } as Record<string, unknown>
        if (String(n.period_start) > String(n.period_end)) return res.status(400).json({ error: 'period_start must be on or before period_end' })
        const rows = (await sql`
          UPDATE energy_attribute_certificates SET
            instrument_type = ${n.instrument_type as string}, mwh = ${n.mwh as number},
            period_start = ${n.period_start as string}, period_end = ${n.period_end as string},
            certificate_id = ${(n.certificate_id as string | null) ?? null}, facility_id = ${(n.facility_id as string | null) ?? null},
            entity_id = ${(n.entity_id as string | null) ?? null}, supplier = ${(n.supplier as string | null) ?? null},
            energy_source = ${(n.energy_source as string | null) ?? null}, province = ${(n.province as string | null) ?? null},
            evidence_id = ${(n.evidence_id as string | null) ?? null}, notes = ${(n.notes as string | null) ?? null},
            updated_at = now(), updated_by = ${actor}
          WHERE id = ${id} AND org_id = ${tok.org}
          RETURNING id, instrument_type, mwh, period_start, period_end, certificate_id, facility_id,
                    entity_id, supplier, energy_source, province, evidence_id, notes, created_at, updated_at
        `) as CertRecord[]
        await audit({ orgId: tok.org, userId: actorUserId, action: 'green_certificate.update', resourceType: 'energy_attribute_certificate', resourceId: id, details: { fields: Object.keys(p.data) }, ip })
        return res.status(200).json({ certificate: normaliseCert(rows[0]) })
      }
      const p = creditPatchSchema.safeParse(req.body ?? {})
      if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? 'Invalid body' })
      const cur = (await sql`
        SELECT id, standard, tco2e, vintage, registry_id, project_name, project_type, retired,
               retired_on, reporting_year, purpose, evidence_id, notes
        FROM carbon_credits WHERE id = ${id} AND org_id = ${tok.org} AND is_active = true
      `) as CreditRecord[]
      if (cur.length === 0) return res.status(404).json({ error: 'Credit not found' })
      const n = { ...normaliseCredit(cur[0]), ...p.data } as Record<string, unknown>
      const rows = (await sql`
        UPDATE carbon_credits SET
          standard = ${n.standard as string}, tco2e = ${n.tco2e as number}, vintage = ${(n.vintage as number | null) ?? null},
          registry_id = ${(n.registry_id as string | null) ?? null}, project_name = ${(n.project_name as string | null) ?? null},
          project_type = ${(n.project_type as string | null) ?? null}, retired = ${n.retired as boolean},
          retired_on = ${(n.retired_on as string | null) ?? null}, reporting_year = ${(n.reporting_year as number | null) ?? null},
          purpose = ${(n.purpose as string | null) ?? null}, evidence_id = ${(n.evidence_id as string | null) ?? null},
          notes = ${(n.notes as string | null) ?? null}, updated_at = now(), updated_by = ${actor}
        WHERE id = ${id} AND org_id = ${tok.org}
        RETURNING id, standard, tco2e, vintage, registry_id, project_name, project_type, retired,
                  retired_on, reporting_year, purpose, evidence_id, notes, created_at, updated_at
      `) as CreditRecord[]
      await audit({ orgId: tok.org, userId: actorUserId, action: 'carbon_credit.update', resourceType: 'carbon_credit', resourceId: id, details: { fields: Object.keys(p.data) }, ip })
      return res.status(200).json({ credit: normaliseCredit(rows[0]) })
    }

    if (req.method === 'DELETE') {
      const rows = kind === 'eac'
        ? (await sql`
            UPDATE energy_attribute_certificates SET is_active = false, updated_at = now(), updated_by = ${actor}
            WHERE id = ${id} AND org_id = ${tok.org} AND is_active = true RETURNING id
          `) as Array<{ id: string }>
        : (await sql`
            UPDATE carbon_credits SET is_active = false, updated_at = now(), updated_by = ${actor}
            WHERE id = ${id} AND org_id = ${tok.org} AND is_active = true RETURNING id
          `) as Array<{ id: string }>
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
      await audit({ orgId: tok.org, userId: actorUserId, action: kind === 'eac' ? 'green_certificate.delete' : 'carbon_credit.delete', resourceType: kind === 'eac' ? 'energy_attribute_certificate' : 'carbon_credit', resourceId: id, details: { soft_delete: true }, ip })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
