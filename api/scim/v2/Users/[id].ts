import type { VercelRequest, VercelResponse } from '@vercel/node'
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const session = await authenticateScim(req, res)
  if (!session) return

  const id = (req.query.id as string | undefined) ?? ''
  if (!UUID_RE.test(id)) return scimError(res, 404, 'User not found')

  const sql = getDb()

  try {
    const fetchUser = async (): Promise<UserDbRow | null> => {
      const rows = await sql`
        SELECT id, email, name, is_active, external_id, created_at FROM users
        WHERE id = ${id} AND org_id = ${session.orgId}
      ` as UserDbRow[]
      return rows[0] ?? null
    }

    const current = await fetchUser()
    if (!current) return scimError(res, 404, 'User not found')

    if (req.method === 'GET') {
      return scimJson(res, 200, toScimUser(current as ScimUserRow))
    }

    if (req.method === 'PUT') {
      if (!isScimJsonBody(req)) return scimError(res, 415, 'Expected application/scim+json body')
      const body = (req.body ?? {}) as Record<string, unknown>
      const userName = typeof body.userName === 'string' ? body.userName.trim() : current.email
      const active = body.active === undefined ? current.is_active : Boolean(body.active)
      const name = (body.name && typeof body.name === 'object') ? body.name as Record<string, string> : {}
      const externalId = body.externalId === undefined ? current.external_id : (body.externalId as string | null)
      const fullName = (name.formatted as string)
        || [name.givenName, name.familyName].filter(Boolean).join(' ').trim()
        || current.name
      const emailLower = String(userName).toLowerCase()

      const updated = await sql`
        UPDATE users
        SET email = ${emailLower}, name = ${fullName}, is_active = ${active}, external_id = ${externalId}
        WHERE id = ${id} AND org_id = ${session.orgId}
        RETURNING id, email, name, is_active, external_id, created_at
      ` as UserDbRow[]
      return scimJson(res, 200, toScimUser(updated[0] as ScimUserRow))
    }

    if (req.method === 'PATCH') {
      if (!isScimJsonBody(req)) return scimError(res, 415, 'Expected application/scim+json body')
      const body = (req.body ?? {}) as Record<string, unknown>
      const ops = Array.isArray(body.Operations) ? body.Operations as Array<Record<string, unknown>> : []
      if (ops.length === 0) return scimError(res, 400, 'Operations required', 'invalidSyntax')

      let email = current.email
      let name = current.name
      let active = current.is_active
      let externalId = current.external_id

      // Split current name once for partial updates.
      const parts = (current.name ?? '').split(' ').filter(Boolean)
      let given = parts[0] ?? ''
      let family = parts.slice(1).join(' ')

      for (const op of ops) {
        const opType = String(op.op ?? '').toLowerCase()
        const path = typeof op.path === 'string' ? op.path : ''
        const value = op.value

        if (opType !== 'replace' && opType !== 'add') {
          return scimError(res, 400, `Unsupported op: ${opType}`, 'invalidSyntax')
        }

        // No-path replace with an object value — apply each field.
        if (!path && value && typeof value === 'object') {
          const v = value as Record<string, unknown>
          if (typeof v.active === 'boolean') active = v.active
          if (typeof v.userName === 'string') email = v.userName.toLowerCase()
          if (typeof v.externalId === 'string') externalId = v.externalId
          if (v.name && typeof v.name === 'object') {
            const n = v.name as Record<string, string>
            if (typeof n.givenName === 'string') given = n.givenName
            if (typeof n.familyName === 'string') family = n.familyName
            if (typeof n.formatted === 'string') name = n.formatted
          }
          continue
        }

        switch (path) {
          case 'active':
            if (typeof value === 'boolean') active = value
            else if (typeof value === 'string') active = value.toLowerCase() === 'true'
            break
          case 'userName':
            if (typeof value === 'string') email = value.toLowerCase()
            break
          case 'externalId':
            if (typeof value === 'string') externalId = value
            else if (value === null) externalId = null
            break
          case 'name.givenName':
            if (typeof value === 'string') given = value
            break
          case 'name.familyName':
            if (typeof value === 'string') family = value
            break
          case 'name':
            if (value && typeof value === 'object') {
              const n = value as Record<string, string>
              if (typeof n.givenName === 'string') given = n.givenName
              if (typeof n.familyName === 'string') family = n.familyName
              if (typeof n.formatted === 'string') name = n.formatted
            }
            break
          case 'emails':
            if (Array.isArray(value)) {
              const arr = value as Array<{ value?: string; primary?: boolean }>
              const primary = arr.find(e => e.primary)?.value ?? arr[0]?.value
              if (primary) email = String(primary).toLowerCase()
            }
            break
          default:
            return scimError(res, 400, `Unsupported PatchOp path: ${path}`, 'invalidSyntax')
        }
      }

      const composed = [given, family].filter(Boolean).join(' ').trim() || name

      const updated = await sql`
        UPDATE users
        SET email = ${email}, name = ${composed}, is_active = ${active}, external_id = ${externalId}
        WHERE id = ${id} AND org_id = ${session.orgId}
        RETURNING id, email, name, is_active, external_id, created_at
      ` as UserDbRow[]
      return scimJson(res, 200, toScimUser(updated[0] as ScimUserRow))
    }

    if (req.method === 'DELETE') {
      await sql`UPDATE users SET is_active = false WHERE id = ${id} AND org_id = ${session.orgId}`
      res.setHeader('Content-Type', 'application/scim+json')
      return res.status(204).end()
    }

    return scimError(res, 405, 'Method not allowed')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return scimError(res, 500, message)
  }
}
