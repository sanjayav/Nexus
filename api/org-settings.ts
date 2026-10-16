import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from './_auth.js'
import { getDb } from './_db.js'
import { audit, auditIp } from './_audit.js'
import {
  loadOrgSettings,
  saveOrgSettings,
  orgSettingsPatchSchema,
  effectiveSettings,
  diffSettings,
} from './_orgSettings.js'
import { describeAiAvailability } from './_llm.js'

/**
 * Org market settings (China edition, Phase 4).
 *
 *   GET /api/org-settings
 *     Any authenticated member (JWT or API key). Returns the stored settings
 *     (or defaults when the org has never saved any), derived `effective`
 *     values and the AI availability for the org.
 *
 *   PUT /api/org-settings      — permission admin.org
 *     Body: partial OrgSettings patch (see orgSettingsPatchSchema). Unknown
 *     keys are rejected. Audit-logged as `org_settings.update` with a
 *     field-level diff.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    if (req.method === 'GET') {
      const t = await requirePermission(req, res)
      if (!t) return
      const sql = getDb()
      const s = await loadOrgSettings(sql, t.org)
      const { stored, ...settings } = s
      return res.status(200).json({
        settings,
        stored,
        effective: effectiveSettings(settings),
        ai: describeAiAvailability(settings),
      })
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const t = await requirePermission(req, res, 'admin.org')
      if (!t) return
      const parsed = orgSettingsPatchSchema.safeParse(req.body ?? {})
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body', issues: parsed.error.issues })
      }
      const sql = getDb()
      const { before, after } = await saveOrgSettings(sql, t.org, parsed.data, t.sub)
      const changes = diffSettings(before, after)
      await audit({
        orgId: t.org,
        userId: t.sub.startsWith('apikey:') ? null : t.sub,
        action: 'org_settings.update',
        resourceType: 'org_settings',
        resourceId: t.org,
        details: { changes, actor: t.sub, created: !before.stored },
        ip: auditIp(req),
      })
      return res.status(200).json({
        settings: after,
        stored: true,
        effective: effectiveSettings(after),
        ai: describeAiAvailability(after),
        changes,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
