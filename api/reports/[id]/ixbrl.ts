import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../_db.js'
import { cors, requirePermission } from '../../_auth.js'
import { generateIxbrl, type IxbrlTag, type IxbrlMapping } from '../../_ixbrl.js'

/**
 * GET /api/reports/[id]/ixbrl — emits an iXBRL XHTML document for the
 * published report. Gated by `reports.publish`. v1 ships ~14 core ESRS E1
 * concept mappings; expand as more disclosures land. Production-grade
 * tagging should delegate to a partner SDK — see docs/IXBRL_PARTNERS.md.
 */

// ESRS E1 (Climate) core concept mappings.
// Key = GRI / ESRS code stored on question_assignments.gri_code.
const ESRS_E1_MAPPINGS: Record<string, { concept: string; unit: string }> = {
  '305-1': { concept: 'esrs:GrossScope1GreenhouseGasEmissions', unit: 'tCO2e' },
  '305-2': { concept: 'esrs:GrossLocationBasedScope2GreenhouseGasEmissions', unit: 'tCO2e' },
  '305-3': { concept: 'esrs:GrossScope3GreenhouseGasEmissions', unit: 'tCO2e' },
  '305-4': { concept: 'esrs:GHGEmissionsIntensity', unit: 'tCO2ePerEUR' },
  '305-5': { concept: 'esrs:GHGEmissionsReductions', unit: 'tCO2e' },
  'E1-1':  { concept: 'esrs:TransitionPlanForClimateChangeMitigation', unit: 'pure' },
  'E1-2':  { concept: 'esrs:PoliciesRelatedToClimateChangeMitigationAndAdaptation', unit: 'pure' },
  'E1-3':  { concept: 'esrs:ActionsAndResourcesInRelationToClimateChangePolicies', unit: 'pure' },
  'E1-4':  { concept: 'esrs:TargetsRelatedToClimateChangeMitigationAndAdaptation', unit: 'pure' },
  'E1-5':  { concept: 'esrs:EnergyConsumptionFromFossilSources', unit: 'MWh' },
  'E1-6':  { concept: 'esrs:GrossScopesGreenhouseGasEmissions', unit: 'tCO2e' },
  'E1-7':  { concept: 'esrs:GHGRemovalsAndGHGMitigationProjectsFinancedThroughCarbonCredits', unit: 'tCO2e' },
  'E1-8':  { concept: 'esrs:InternalCarbonPricing', unit: 'EUR' },
  'E1-9':  { concept: 'esrs:AnticipatedFinancialEffectsFromMaterialPhysicalAndTransitionRisks', unit: 'EUR' },
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'org'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'reports.publish')
  if (!token) return

  // Vercel rewrites the dynamic segment into req.query.id
  const reportId = String(req.query.id || '')
  if (!reportId) return res.status(400).json({ error: 'report id required' })

  const sql = getDb()

  try {
    // 1. Load report metadata + org slug.
    const reportRows = await sql`
      SELECT ra.id, ra.org_id, ra.period_id, ra.framework_id, ra.verification_token,
             rp.label AS period_label, rp.year AS period_year,
             o.slug AS org_slug
      FROM report_artifacts ra
      LEFT JOIN reporting_period rp ON rp.id = ra.period_id
      LEFT JOIN organisations o ON o.id = ra.org_id
      WHERE ra.id = ${reportId} AND ra.org_id = ${token.org}
    ` as Array<{ id: string; org_id: string; period_id: string; framework_id: string;
                 verification_token: string; period_label: string | null;
                 period_year: number | null; org_slug: string | null }>

    if (reportRows.length === 0) return res.status(404).json({ error: 'Report not found' })
    const report = reportRows[0]

    // 2. Load approved assignment values for this report's period.
    const values = await sql`
      SELECT qa.questionnaire_item_id, qa.gri_code, qa.line_item, qa.unit,
             qa.value::float AS value, qa.status
      FROM question_assignments qa
      WHERE qa.org_id = ${token.org}
        AND qa.framework_id = ${report.framework_id}
        AND qa.status = 'approved'
    ` as Array<{ questionnaire_item_id: string; gri_code: string; line_item: string;
                 unit: string | null; value: number | null; status: string }>

    // 3. Project into IxbrlTag dict keyed by gri_code.
    const contextRef = `FY${report.period_year ?? new Date().getFullYear()}`
    const tags: Record<string, IxbrlTag> = {}
    const mappings: IxbrlMapping[] = []

    for (const v of values) {
      // Match on full code or prefix (305-1.x → 305-1).
      const mapKey = ESRS_E1_MAPPINGS[v.gri_code]
        ? v.gri_code
        : Object.keys(ESRS_E1_MAPPINGS).find(k => v.gri_code.startsWith(k))
      if (!mapKey) continue
      const m = ESRS_E1_MAPPINGS[mapKey]
      if (v.value == null) continue
      tags[v.questionnaire_item_id] = {
        conceptName: m.concept,
        value: v.value,
        unit: v.unit ?? m.unit,
        contextRef,
        decimals: 0,
      }
      mappings.push({
        questionnaireItemId: v.questionnaire_item_id,
        conceptName: m.concept,
        unit: m.unit,
      })
    }

    // 4. Emit iXBRL.
    const xhtml = await generateIxbrl(report.id, mappings, tags)

    const fname = `${slugify(report.org_slug ?? 'org')}-${report.period_year ?? 'fy'}-esrs.xhtml`
    res.setHeader('Content-Type', 'application/xhtml+xml')
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`)
    res.setHeader('X-Ixbrl-Mappings', String(mappings.length))
    return res.status(200).send(xhtml)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
