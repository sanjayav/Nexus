import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { checkRateLimit } from '../_rateLimit.js'
import { getDb } from '../_db.js'

const importSchema = z.object({
  templateId: z.string().uuid(),
  fileName: z.string().min(1).max(500),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(5000),
  // Optional override mapping for generic_csv templates (or to extend a system template).
  mappingOverride: z.record(z.string(), z.string()).optional(),
})

interface Template {
  id: string
  name: string
  source: string
  scope: number | null
  category: string | null
  mapping: Record<string, string>
  required_columns: string[]
  emission_factor_lookup: Record<string, unknown> | null
}

interface Facility { id: string; code: string | null; country: string | null }

interface EFRow {
  id: string
  co2e_per_unit: number
  source: string
  unit: string
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function toInt(v: unknown): number | null {
  const n = toNumber(v)
  return n === null ? null : Math.trunc(n)
}

function compute_co2e_tonnes(activityValue: number, unit: string | null, ef: number): number {
  // Heuristic conversion. EF tables hold kg per unit; the result here is tonnes.
  // - kgCO2e/kWh × MWh → ×1000 (kWh) → /1000 (kg→t) → ×1
  // - kgCO2e/* per unit × units → /1000 (kg→t)
  const u = (unit ?? '').toLowerCase()
  if (u === 'mwh') return (activityValue * 1000 * ef) / 1000
  if (u === 'tj') return (activityValue * 1e6 * ef) / 1e9 // TJ→GJ via *1000, then /1000 kg→t
  return (activityValue * ef) / 1000
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.upload')
  if (!token) return

  // 10 imports / 5 min × 5K rows = 50K rows / 5 min ceiling per org.
  const allowedImport = await checkRateLimit(req, res, {
    key: `import:${token.org}`,
    windowSeconds: 300,
    max: 10,
  })
  if (!allowedImport) return

  let parsed: z.infer<typeof importSchema>
  try { parsed = importSchema.parse(req.body ?? {}) }
  catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()

  try {
    const templateRows = await sql`
      SELECT id, name, source, scope, category, mapping, required_columns, emission_factor_lookup
      FROM connector_templates WHERE id = ${parsed.templateId} LIMIT 1
    ` as Template[]
    if (templateRows.length === 0) return res.status(404).json({ error: 'Template not found' })
    const template = templateRows[0]
    const mapping: Record<string, string> = { ...(template.mapping ?? {}), ...(parsed.mappingOverride ?? {}) }
    const requiredCols = template.required_columns ?? []

    const facilities = await sql`
      SELECT id, code, country FROM facilities WHERE org_id = ${token.org} AND is_active = true
    ` as Facility[]
    const facByCode = new Map<string, Facility>()
    for (const f of facilities) if (f.code) facByCode.set(f.code, f)

    // Create import row up front so the client can track even on partial failure.
    const importRows = await sql`
      INSERT INTO connector_imports (org_id, template_id, file_name, rows_total, status, imported_by)
      VALUES (${token.org}, ${template.id}, ${parsed.fileName}, ${parsed.rows.length}, 'processing', ${token.sub})
      RETURNING id
    ` as Array<{ id: string }>
    const importId = importRows[0].id

    const errors: Array<{ row: number; error: string }> = []
    let imported = 0
    let failed = 0

    for (let i = 0; i < parsed.rows.length; i++) {
      const csvRow = parsed.rows[i]
      const rowNum = i + 2 // 1 = header, data starts at 2 (1-based for human display)

      try {
        // Required-column check (against the source CSV header, pre-mapping).
        for (const col of requiredCols) {
          if (csvRow[col] === undefined || csvRow[col] === null || csvRow[col] === '') {
            throw new Error(`Missing required column "${col}"`)
          }
        }

        const get = (target: string): unknown => {
          const src = mapping[target]
          if (!src) return undefined
          return csvRow[src]
        }

        const periodYear = toInt(get('period_year'))
        const periodMonth = toInt(get('period_month'))
        const facilityCode = get('facility_code')
        const activityValue = toNumber(get('activity_value'))

        if (periodYear === null) throw new Error('Invalid or missing period_year')
        if (periodMonth === null || periodMonth < 1 || periodMonth > 12) throw new Error('Invalid period_month')
        if (activityValue === null) throw new Error('Invalid or missing activity_value')

        const rowScope = template.scope ?? toInt(get('scope'))
        if (rowScope === null || ![1, 2, 3].includes(rowScope)) throw new Error('Invalid or missing scope')

        let facilityId: string | null = null
        if (facilityCode) {
          const fac = facByCode.get(String(facilityCode))
          if (!fac) throw new Error(`Unknown facility code: ${facilityCode}`)
          facilityId = fac.id
        }

        const activityUnit = (get('activity_unit') as string | undefined) ?? null
        const fuelType = (get('fuel_type') as string | undefined) ?? null
        const subcategory = (get('subcategory') as string | undefined) ?? null
        const notes = (get('notes') as string | undefined) ?? null
        const category = template.category ?? (get('category') as string | undefined) ?? null

        let emissionFactor = toNumber(get('emission_factor'))
        let efSource = (get('ef_source') as string | undefined) ?? null
        let co2eTonnes = toNumber(get('co2e_tonnes'))

        // Resolve EF when not provided directly.
        if (emissionFactor === null && template.emission_factor_lookup) {
          const lookup = template.emission_factor_lookup
          const region = (lookup.region === 'auto'
            ? (facilityId && facByCode.get(String(facilityCode))?.country) || 'GLOBAL'
            : (lookup.region as string | undefined) ?? 'GLOBAL')
          const lookupCategory = (lookup.category as string | undefined) ?? category
          const lookupFA = lookup.fuel_or_activity === 'fuel_type'
            ? (fuelType ?? '')
            : (lookup.fuel_or_activity as string | undefined) ?? ''

          if (lookupCategory && lookupFA) {
            const efRows = await sql`
              SELECT id, co2e_per_unit, source, unit FROM emission_factors
              WHERE scope = ${rowScope}
                AND (region = ${region} OR region = 'GLOBAL')
                AND (category = ${lookupCategory} OR category ILIKE ${'%' + lookupCategory + '%'})
                AND (fuel_or_activity ILIKE ${'%' + lookupFA + '%'})
              ORDER BY (region = ${region}) DESC, valid_from DESC
              LIMIT 1
            ` as EFRow[]
            if (efRows.length > 0) {
              emissionFactor = Number(efRows[0].co2e_per_unit)
              efSource = efRows[0].source
            }
          }
        }

        if (co2eTonnes === null && emissionFactor !== null) {
          co2eTonnes = compute_co2e_tonnes(activityValue, activityUnit, emissionFactor)
        }
        if (co2eTonnes === null) co2eTonnes = 0

        await sql`
          INSERT INTO activity_data
            (org_id, facility_id, period_year, period_month, scope, category, subcategory, fuel_type,
             activity_value, activity_unit, emission_factor, ef_source, co2e_tonnes, status, submitted_by, notes)
          VALUES
            (${token.org}, ${facilityId}, ${periodYear}, ${periodMonth}, ${rowScope}, ${category}, ${subcategory}, ${fuelType},
             ${activityValue}, ${activityUnit}, ${emissionFactor}, ${efSource}, ${co2eTonnes}, 'draft', ${token.sub}, ${notes})
        `
        imported++
      } catch (rowErr) {
        failed++
        errors.push({ row: rowNum, error: rowErr instanceof Error ? rowErr.message : 'Unknown error' })
      }
    }

    const finalStatus = failed === 0 ? 'complete' : (imported === 0 ? 'failed' : 'complete')
    await sql`
      UPDATE connector_imports
      SET rows_imported = ${imported}, rows_failed = ${failed},
          status = ${finalStatus}, errors = ${JSON.stringify(errors.slice(0, 200))}::jsonb
      WHERE id = ${importId} AND org_id = ${token.org}
    `

    return res.status(200).json({
      ok: imported > 0,
      importId,
      total: parsed.rows.length,
      imported,
      failed,
      errors: errors.slice(0, 200),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
