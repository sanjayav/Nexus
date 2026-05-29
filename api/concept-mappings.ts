import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db.js'
import { cors, verifyToken, requirePermission } from './_auth.js'

/**
 * Linked-data API.
 *
 *   GET  /api/concept-mappings?concept_key=...         → list mappings for a concept
 *   GET  /api/concept-mappings?questionnaire_item_id=… → list peers of a single QI
 *   POST /api/concept-mappings/override                → lock a data_value (gated data.approve)
 *
 * The two GET variants are public to authenticated users — they're metadata,
 * no value bleeds across orgs (concept_mappings are global). The override
 * action is permission-gated since flipping is_overridden=true blocks future
 * propagation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()

  if (req.method === 'GET') {
    const token = await verifyToken(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { concept_key, questionnaire_item_id } = req.query as Record<string, string | undefined>
    try {
      if (concept_key) {
        const rows = await sql`
          SELECT cm.id, cm.concept_key, cm.framework_id, cm.questionnaire_item_id,
                 cm.unit_conversion,
                 qi.gri_code, qi.line_item, qi.unit, qi.section
          FROM concept_mappings cm
          LEFT JOIN questionnaire_item qi ON qi.id = cm.questionnaire_item_id
          WHERE cm.concept_key = ${concept_key}
          ORDER BY cm.framework_id, qi.gri_code
        `
        return res.status(200).json({ concept_key, mappings: rows })
      }

      if (questionnaire_item_id) {
        // Find the concept_key this QI belongs to (if any) and return its peers.
        const conceptRows = await sql`
          SELECT concept_key FROM concept_mappings
          WHERE questionnaire_item_id = ${questionnaire_item_id}
          LIMIT 1
        ` as Array<{ concept_key: string }>
        if (conceptRows.length === 0) {
          return res.status(200).json({ concept_key: null, mappings: [] })
        }
        const ck = conceptRows[0].concept_key
        const peers = await sql`
          SELECT cm.id, cm.concept_key, cm.framework_id, cm.questionnaire_item_id,
                 cm.unit_conversion,
                 qi.gri_code, qi.line_item, qi.unit, qi.section
          FROM concept_mappings cm
          LEFT JOIN questionnaire_item qi ON qi.id = cm.questionnaire_item_id
          WHERE cm.concept_key = ${ck}
          ORDER BY cm.framework_id, qi.gri_code
        `
        return res.status(200).json({ concept_key: ck, mappings: peers })
      }

      // No filter → return a summary (concept_key + count) so the admin UI can
      // browse what's mapped.
      const summary = await sql`
        SELECT concept_key, COUNT(*)::int AS framework_count
        FROM concept_mappings
        GROUP BY concept_key
        ORDER BY concept_key
      `
      return res.status(200).json({ concept_keys: summary })
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  if (req.method === 'POST') {
    // /api/concept-mappings/override is the only POST action.
    // The path may arrive as `/concept-mappings` or `/concept-mappings/override`
    // depending on the rewrite — check the body action field as the canonical
    // intent and treat the URL path as advisory.
    const action = (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).action : null)
      || (req.url?.includes('/override') ? 'override' : null)

    if (action !== 'override') {
      return res.status(400).json({ error: "POST requires action='override'" })
    }

    const token = await requirePermission(req, res, 'data.approve')
    if (!token) return

    const { data_value_id } = req.body as { data_value_id?: string }
    if (!data_value_id) return res.status(400).json({ error: 'data_value_id required' })

    try {
      const updated = await sql`
        UPDATE data_value
        SET is_overridden = true
        WHERE id = ${data_value_id}
        RETURNING id, is_overridden, derived_from
      ` as Array<{ id: string; is_overridden: boolean; derived_from: string | null }>
      if (updated.length === 0) return res.status(404).json({ error: 'data_value not found' })
      return res.status(200).json({ ok: true, ...updated[0] })
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
