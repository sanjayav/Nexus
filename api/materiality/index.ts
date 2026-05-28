import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { verifyToken, cors, requirePermission } from '../_auth.js'

// ─── Schema migration — idempotent on every cold start ─────────────────
// (We don't have a migration runner here; a simple CREATE/ALTER IF NOT
// EXISTS at startup keeps the endpoint self-bootstrapping in demo envs.)
let schemaReady = false
async function ensureSchema(sql: ReturnType<typeof getDb>) {
  if (schemaReady) return
  await sql`ALTER TABLE material_topics ADD COLUMN IF NOT EXISTS likelihood INTEGER`
  await sql`ALTER TABLE material_topics ADD COLUMN IF NOT EXISTS severity INTEGER`
  await sql`ALTER TABLE material_topics ADD COLUMN IF NOT EXISTS time_horizon TEXT`
  await sql`ALTER TABLE material_topics ADD COLUMN IF NOT EXISTS is_material BOOLEAN DEFAULT false`
  await sql`ALTER TABLE material_topics ADD COLUMN IF NOT EXISTS threshold NUMERIC DEFAULT 3.0`
  await sql`
    CREATE TABLE IF NOT EXISTS material_topic_iro (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID REFERENCES material_topics(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('impact','risk','opportunity')),
      description TEXT NOT NULL,
      severity INTEGER,
      likelihood INTEGER,
      time_horizon TEXT,
      scope TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS material_topic_stakeholder (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      topic_id UUID REFERENCES material_topics(id) ON DELETE CASCADE,
      stakeholder_group TEXT NOT NULL,
      concern_rating INTEGER CHECK (concern_rating BETWEEN 1 AND 5),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  schemaReady = true
}

const UpsertTopic = z.object({
  id: z.string().uuid().optional(),
  framework_id: z.string().optional(),
  topic_name: z.string().min(1),
  topic_category: z.string().nullable().optional(),
  impact_score: z.number().nullable().optional(),
  financial_score: z.number().nullable().optional(),
  likelihood: z.number().int().min(1).max(5).nullable().optional(),
  severity: z.number().int().min(1).max(5).nullable().optional(),
  time_horizon: z.enum(['short','medium','long']).nullable().optional(),
  threshold: z.number().nullable().optional(),
  rationale: z.string().nullable().optional(),
  linked_gri_codes: z.array(z.string()).optional(),
  dma_status: z.enum(['identified','assessed','material','not_material','pending_review']).optional(),
})

const IroBody = z.object({
  topic_id: z.string().uuid(),
  type: z.enum(['impact','risk','opportunity']),
  description: z.string().min(1),
  severity: z.number().int().min(1).max(5).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  time_horizon: z.enum(['short','medium','long']).optional(),
  scope: z.string().optional(),
})

const StakeholderBody = z.object({
  topic_id: z.string().uuid(),
  stakeholder_group: z.enum(['investors','employees','customers','suppliers','regulators','civil_society','other']),
  concern_rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()
  try {
    await ensureSchema(sql)
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Schema bootstrap failed' })
  }

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const orgId = token.org

  try {
    if (req.method === 'GET') {
      const topics = await sql`
        SELECT id, framework_id, topic_name, topic_category, linked_gri_codes,
               impact_score, financial_score, likelihood, severity, time_horizon,
               is_material, threshold, dma_status, rationale, owner_email,
               assessed_at, created_at
        FROM material_topics WHERE org_id = ${orgId}
        ORDER BY topic_name ASC
      `
      const iros = await sql`
        SELECT iro.id, iro.topic_id, iro.type, iro.description, iro.severity,
               iro.likelihood, iro.time_horizon, iro.scope, iro.created_at
        FROM material_topic_iro iro
        JOIN material_topics t ON t.id = iro.topic_id
        WHERE t.org_id = ${orgId}
        ORDER BY iro.created_at DESC
      `
      const stakeholders = await sql`
        SELECT s.id, s.topic_id, s.stakeholder_group, s.concern_rating, s.notes, s.created_at
        FROM material_topic_stakeholder s
        JOIN material_topics t ON t.id = s.topic_id
        WHERE t.org_id = ${orgId}
        ORDER BY s.created_at DESC
      `
      return res.status(200).json({ topics, iros, stakeholders })
    }

    if (req.method === 'POST') {
      const sub = String(req.query.action || (req.body?.action ?? '')).toLowerCase()

      // Default action when none passed: upsert-topic.
      if (sub === '' || sub === 'upsert' || sub === 'upsert-topic') {
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const parsed = UpsertTopic.safeParse(req.body ?? {})
        if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() })
        const b = parsed.data

        const impactInt = b.impact_score == null ? null : Math.round(Number(b.impact_score))
        const finInt = b.financial_score == null ? null : Math.round(Number(b.financial_score))
        const linkedJson = JSON.stringify(b.linked_gri_codes ?? [])

        if (b.id) {
          await sql`
            UPDATE material_topics SET
              topic_name = ${b.topic_name},
              topic_category = ${b.topic_category ?? null},
              linked_gri_codes = ${linkedJson}::jsonb,
              impact_score = ${impactInt},
              financial_score = ${finInt},
              likelihood = ${b.likelihood ?? null},
              severity = ${b.severity ?? null},
              time_horizon = ${b.time_horizon ?? null},
              threshold = ${b.threshold ?? null},
              dma_status = ${b.dma_status ?? 'identified'},
              rationale = ${b.rationale ?? null},
              assessed_at = ${b.dma_status && b.dma_status !== 'identified' ? new Date().toISOString() : null}
            WHERE id = ${b.id} AND org_id = ${orgId}
          `
          return res.status(200).json({ ok: true, id: b.id })
        }
        const rows = await sql`
          INSERT INTO material_topics
            (org_id, framework_id, topic_name, topic_category, linked_gri_codes,
             impact_score, financial_score, likelihood, severity, time_horizon,
             threshold, dma_status, rationale, assessed_at)
          VALUES
            (${orgId}, ${b.framework_id ?? 'gri'}, ${b.topic_name}, ${b.topic_category ?? null},
             ${linkedJson}::jsonb, ${impactInt}, ${finInt}, ${b.likelihood ?? null},
             ${b.severity ?? null}, ${b.time_horizon ?? null}, ${b.threshold ?? null},
             ${b.dma_status ?? 'identified'}, ${b.rationale ?? null},
             ${b.dma_status && b.dma_status !== 'identified' ? new Date().toISOString() : null})
          ON CONFLICT (org_id, framework_id, topic_name) DO UPDATE SET
            impact_score = EXCLUDED.impact_score,
            financial_score = EXCLUDED.financial_score,
            dma_status = EXCLUDED.dma_status
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0]?.id })
      }

      if (sub === 'iro') {
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const parsed = IroBody.safeParse(req.body ?? {})
        if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() })
        const b = parsed.data
        // Confirm topic belongs to this org.
        const own = await sql`SELECT 1 FROM material_topics WHERE id = ${b.topic_id} AND org_id = ${orgId}` as Array<unknown>
        if (own.length === 0) return res.status(404).json({ error: 'topic not found' })
        const rows = await sql`
          INSERT INTO material_topic_iro (topic_id, type, description, severity, likelihood, time_horizon, scope)
          VALUES (${b.topic_id}, ${b.type}, ${b.description}, ${b.severity ?? null}, ${b.likelihood ?? null}, ${b.time_horizon ?? null}, ${b.scope ?? null})
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0]?.id })
      }

      if (sub === 'stakeholder') {
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const parsed = StakeholderBody.safeParse(req.body ?? {})
        if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() })
        const b = parsed.data
        const own = await sql`SELECT 1 FROM material_topics WHERE id = ${b.topic_id} AND org_id = ${orgId}` as Array<unknown>
        if (own.length === 0) return res.status(404).json({ error: 'topic not found' })
        const rows = await sql`
          INSERT INTO material_topic_stakeholder (topic_id, stakeholder_group, concern_rating, notes)
          VALUES (${b.topic_id}, ${b.stakeholder_group}, ${b.concern_rating}, ${b.notes ?? null})
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0]?.id })
      }

      if (sub === 'finalize') {
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        // Compute per-topic materiality verdict.
        // Aggregate stakeholder ratings into the impact axis (avg of per-group avg)
        // for any topic that has stakeholder rows but no impact_score set.
        await sql`
          UPDATE material_topics t SET impact_score = sub.avg_score
          FROM (
            SELECT topic_id, ROUND(AVG(concern_rating)::numeric, 2) AS avg_score
            FROM material_topic_stakeholder
            GROUP BY topic_id
          ) sub
          WHERE t.id = sub.topic_id
            AND t.org_id = ${orgId}
            AND (t.impact_score IS NULL)
        `
        // Compute financial_score from likelihood × severity (1–25 → rescale 1–5)
        // for any topic that has both but no financial_score.
        await sql`
          UPDATE material_topics t SET financial_score = LEAST(5, GREATEST(1, ROUND((COALESCE(likelihood,0) * COALESCE(severity,0))::numeric / 5)))
          WHERE org_id = ${orgId}
            AND financial_score IS NULL
            AND likelihood IS NOT NULL AND severity IS NOT NULL
        `
        // Apply threshold.
        const result = await sql`
          UPDATE material_topics SET
            is_material = (COALESCE(impact_score,0) >= COALESCE(threshold, 3.0))
                          OR (COALESCE(financial_score,0) >= COALESCE(threshold, 3.0)),
            dma_status = CASE
              WHEN (COALESCE(impact_score,0) >= COALESCE(threshold,3.0))
                OR (COALESCE(financial_score,0) >= COALESCE(threshold,3.0))
              THEN 'material'
              ELSE 'not_material'
            END,
            assessed_at = now()
          WHERE org_id = ${orgId}
          RETURNING id, topic_name, is_material, impact_score, financial_score, threshold
        `
        return res.status(200).json({ ok: true, count: (result as unknown[]).length, topics: result })
      }

      return res.status(400).json({ error: `Unknown action: ${sub}` })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' })
  }
}
