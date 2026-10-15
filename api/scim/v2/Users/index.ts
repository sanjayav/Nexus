import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { cors } from '../../../_auth.js'
import { getDb } from '../../../_db.js'
import { authenticateScim, scimJson, scimError, toScimUser, isScimJsonBody, type ScimUserRow } from '../../../_scim.js'

interface UserDbRow {
  id: string
  email: string
  name: string
  is_active: boolean
  external_id: string | null
  created_at: string
}

function parseFilter(filter: string | undefined): { userName?: string; externalId?: string } | null {
  if (!filter) return {}
  // Support only `userName eq "x"` and `externalId eq "x"` — the bare minimum
  // for Azure AD / Okta to resolve users before create / update.
  const m = filter.match(/^\s*(userName|externalId)\s+eq\s+"([^"]+)"\s*$/i)
  if (!m) return null
  const field = m[1].toLowerCase() === 'username' ? 'userName' : 'externalId'
  return { [field]: m[2] }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const session = await authenticateScim(req, res)
  if (!session) return

  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const filterStr = (req.query.filter as string | undefined) ?? undefined
      const startIndex = Math.max(1, parseInt((req.query.startIndex as string) ?? '1', 10) || 1)
      const count = Math.min(200, Math.max(0, parseInt((req.query.count as string) ?? '50', 10) || 50))
      const parsed = parseFilter(filterStr)
      if (parsed === null) {
        return scimError(res, 400, `Unsupported filter: ${filterStr}`, 'invalidFilter')
      }

      let rows: UserDbRow[]
      let total: number
      if (parsed.userName) {
        const r = await sql`
          SELECT id, email, name, is_active, external_id, created_at FROM users
          WHERE org_id = ${session.orgId} AND lower(email) = lower(${parsed.userName})
          ORDER BY created_at ASC
        ` as UserDbRow[]
        rows = r
        total = r.length
      } else if (parsed.externalId) {
        const r = await sql`
          SELECT id, email, name, is_active, external_id, created_at FROM users
          WHERE org_id = ${session.orgId} AND external_id = ${parsed.externalId}
          ORDER BY created_at ASC
        ` as UserDbRow[]
        rows = r
        total = r.length
      } else {
        const totalRows = await sql`SELECT COUNT(*)::int AS c FROM users WHERE org_id = ${session.orgId}` as Array<{ c: number }>
        total = totalRows[0]?.c ?? 0
        const offset = startIndex - 1
        const r = await sql`
          SELECT id, email, name, is_active, external_id, created_at FROM users
          WHERE org_id = ${session.orgId}
          ORDER BY created_at ASC
          LIMIT ${count} OFFSET ${offset}
        ` as UserDbRow[]
        rows = r
      }

      const resources = rows.map(r => toScimUser(r as ScimUserRow))
      return scimJson(res, 200, {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: total,
        startIndex,
        itemsPerPage: resources.length,
        Resources: resources,
      })
    }

    if (req.method === 'POST') {
      if (!isScimJsonBody(req)) return scimError(res, 415, 'Expected application/scim+json body')
      const body = (req.body ?? {}) as Record<string, unknown>
      const userName = typeof body.userName === 'string' ? body.userName.trim() : ''
      if (!userName) return scimError(res, 400, 'userName is required', 'invalidValue')
      const externalId = typeof body.externalId === 'string' ? body.externalId : null
      const active = body.active === undefined ? true : Boolean(body.active)
      const name = (body.name && typeof body.name === 'object') ? body.name as Record<string, string> : {}
      const emails = Array.isArray(body.emails) ? body.emails as Array<{ value?: string; primary?: boolean }> : []
      const primaryEmail = emails.find(e => e.primary)?.value ?? emails[0]?.value ?? userName
      const emailLower = String(primaryEmail).toLowerCase().trim()
      const fullName = (name.formatted as string) || [name.givenName, name.familyName].filter(Boolean).join(' ').trim() || emailLower

      // Lookup by externalId first (IdP-stable), then by email within org.
      let existing: UserDbRow[] = []
      if (externalId) {
        existing = await sql`
          SELECT id, email, name, is_active, external_id, created_at FROM users
          WHERE org_id = ${session.orgId} AND external_id = ${externalId}
        ` as UserDbRow[]
      }
      if (existing.length === 0) {
        existing = await sql`
          SELECT id, email, name, is_active, external_id, created_at FROM users
          WHERE org_id = ${session.orgId} AND lower(email) = ${emailLower}
        ` as UserDbRow[]
      }

      if (existing.length > 0) {
        // 409 per RFC 7644 §3.3 when uniqueness conflict — Azure AD treats this as "use existing".
        return scimError(res, 409, 'User already exists', 'uniqueness')
      }

      // Hash a random placeholder password — SCIM-managed users sign in via SSO.
      const placeholder = bcrypt.hashSync(crypto.randomBytes(24).toString('base64url'), 10)
      const created = await sql`
        INSERT INTO users (org_id, email, name, password_hash, is_active, external_id, scim_managed)
        VALUES (${session.orgId}, ${emailLower}, ${fullName}, ${placeholder}, ${active}, ${externalId}, true)
        RETURNING id, email, name, is_active, external_id, created_at
      ` as UserDbRow[]

      const newId = created[0].id

      // Assign default role for the org.
      const roleRows = await sql`
        SELECT id FROM roles WHERE org_id = ${session.orgId} AND slug = ${session.defaultRoleSlug} LIMIT 1
      ` as Array<{ id: string }>
      if (roleRows.length > 0) {
        await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${newId}, ${roleRows[0].id}) ON CONFLICT DO NOTHING`
      }

      res.setHeader('Location', `/scim/v2/Users/${newId}`)
      return scimJson(res, 201, toScimUser(created[0] as ScimUserRow))
    }

    return scimError(res, 405, 'Method not allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return scimError(res, 500, message)
  }
}
