import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db.js'
import { cors, requirePermission } from './_auth.js'

/**
 * Audit log explorer. Gated `audit.view` — admin-only.
 *
 *   GET /api/audit?from=&to=&actorId=&actions=&resourceTypes=&limit=&offset=
 *   GET /api/audit?format=csv&...                — streams CSV
 *
 * Multi-select params (`actions`, `resourceTypes`) accept either a comma list
 * (`actions=auth.login,user.create`) or the bracketed form
 * (`actions[]=auth.login&actions[]=user.create`) the frontend sometimes emits.
 */

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  // Quote any cell containing a quote, comma, newline. Escape inner quotes by doubling.
  if (/["\n\r,]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'audit.view')
  if (!token) return

  const sql = getDb()

  const from = typeof req.query.from === 'string' ? req.query.from : null
  const to = typeof req.query.to === 'string' ? req.query.to : null
  const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : null
  const actions = parseList(req.query.actions ?? req.query['actions[]'])
  const resourceTypes = parseList(req.query.resourceTypes ?? req.query['resourceTypes[]'])
  const format = typeof req.query.format === 'string' ? req.query.format : null

  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT))
  const offset = Math.max(0, Number(req.query.offset) || 0)

  try {
    // We assemble the WHERE clauses via the typed tagged-template helper.
    // Each filter is optional; the `IS NULL OR …` form keeps the parameter
    // bound but lets the row through when the filter wasn't supplied.
    const rows = await sql`
      SELECT
        al.id,
        al.user_id,
        u.name AS user_name,
        u.email AS user_email,
        al.action,
        al.resource_type,
        al.resource_id,
        al.details,
        al.ip_address,
        al.created_at
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.org_id = ${token.org}
        AND (${from}::timestamptz IS NULL OR al.created_at >= ${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR al.created_at <= ${to}::timestamptz)
        AND (${actorId}::uuid IS NULL OR al.user_id = ${actorId}::uuid)
        AND (${actions.length === 0} OR al.action = ANY(${actions}::text[]))
        AND (${resourceTypes.length === 0} OR al.resource_type = ANY(${resourceTypes}::text[]))
      ORDER BY al.created_at DESC
      LIMIT ${format === 'csv' ? MAX_LIMIT : limit}
      OFFSET ${format === 'csv' ? 0 : offset}
    ` as Array<{
      id: string
      user_id: string | null
      user_name: string | null
      user_email: string | null
      action: string
      resource_type: string
      resource_id: string | null
      details: Record<string, unknown> | null
      ip_address: string | null
      created_at: string
    }>

    // Total count for paging — separate query so the slice query stays fast.
    const totalRows = format === 'csv' ? [] : await sql`
      SELECT COUNT(*)::int AS total
      FROM audit_log al
      WHERE al.org_id = ${token.org}
        AND (${from}::timestamptz IS NULL OR al.created_at >= ${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR al.created_at <= ${to}::timestamptz)
        AND (${actorId}::uuid IS NULL OR al.user_id = ${actorId}::uuid)
        AND (${actions.length === 0} OR al.action = ANY(${actions}::text[]))
        AND (${resourceTypes.length === 0} OR al.resource_type = ANY(${resourceTypes}::text[]))
    ` as Array<{ total: number }>

    if (format === 'csv') {
      const header = ['created_at', 'actor', 'actor_email', 'action', 'resource_type', 'resource_id', 'ip_address', 'details']
      const lines = [header.join(',')]
      for (const r of rows) {
        lines.push([
          csvCell(r.created_at),
          csvCell(r.user_name ?? ''),
          csvCell(r.user_email ?? ''),
          csvCell(r.action),
          csvCell(r.resource_type),
          csvCell(r.resource_id ?? ''),
          csvCell(r.ip_address ?? ''),
          csvCell(r.details ?? {}),
        ].join(','))
      }
      const body = lines.join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`)
      return res.status(200).send(body)
    }

    return res.status(200).json({
      rows,
      total: totalRows[0]?.total ?? 0,
      limit,
      offset,
    })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
