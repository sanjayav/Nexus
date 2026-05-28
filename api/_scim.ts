import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { getDb } from './_db.js'

export interface ScimSession {
  orgId: string
  tokenId: string
  defaultRoleSlug: string
}

export async function authenticateScim(req: VercelRequest, res: VercelResponse): Promise<ScimSession | null> {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="SCIM"')
    res.setHeader('Content-Type', 'application/scim+json')
    res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Missing bearer token',
      status: '401',
    })
    return null
  }
  const raw = auth.slice(7).trim()
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const sql = getDb()
  const rows = await sql`
    SELECT id, org_id, default_role_slug FROM scim_tokens
    WHERE token_hash = ${hash} AND is_active = true
  ` as Array<{ id: string; org_id: string; default_role_slug: string }>
  if (rows.length === 0) {
    res.setHeader('Content-Type', 'application/scim+json')
    res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Invalid SCIM token',
      status: '401',
    })
    return null
  }
  await sql`UPDATE scim_tokens SET last_used_at = now() WHERE id = ${rows[0].id}`
  return { orgId: rows[0].org_id, tokenId: rows[0].id, defaultRoleSlug: rows[0].default_role_slug || 'viewer' }
}

export function scimError(res: VercelResponse, status: number, detail: string, scimType?: string) {
  res.setHeader('Content-Type', 'application/scim+json')
  res.status(status).json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    detail,
    status: String(status),
    ...(scimType ? { scimType } : {}),
  })
}

export function scimJson(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/scim+json')
  res.status(status).json(body)
}

export interface ScimUserRow {
  id: string
  email: string
  name: string
  is_active: boolean
  external_id: string | null
  created_at: string | Date
}

export function toScimUser(u: ScimUserRow) {
  const parts = (u.name ?? '').split(' ').filter(Boolean)
  const given = parts[0] ?? ''
  const family = parts.slice(1).join(' ')
  const created = u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at)
  const obj: Record<string, unknown> = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: u.id,
    userName: u.email,
    name: { givenName: given, familyName: family, formatted: u.name },
    emails: [{ value: u.email, primary: true, type: 'work' }],
    active: u.is_active,
    meta: {
      resourceType: 'User',
      created,
      lastModified: created,
      location: `/scim/v2/Users/${u.id}`,
    },
  }
  if (u.external_id) obj.externalId = u.external_id
  return obj
}

export function isScimJsonBody(req: VercelRequest): boolean {
  const ct = (req.headers['content-type'] ?? '').toString().toLowerCase()
  return ct.includes('application/scim+json') || ct.includes('application/json')
}
