import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../../_auth.js'
import { authenticateScim, scimJson, scimError } from '../../_scim.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return scimError(res, 405, 'Method not allowed')

  const session = await authenticateScim(req, res)
  if (!session) return

  const userSchema = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
    id: 'urn:ietf:params:scim:schemas:core:2.0:User',
    name: 'User',
    description: 'User Account',
    attributes: [
      { name: 'userName', type: 'string', multiValued: false, required: true, caseExact: false,
        mutability: 'readWrite', returned: 'default', uniqueness: 'server' },
      { name: 'externalId', type: 'string', multiValued: false, required: false, caseExact: false,
        mutability: 'readWrite', returned: 'default' },
      { name: 'active', type: 'boolean', multiValued: false, required: false,
        mutability: 'readWrite', returned: 'default' },
      { name: 'name', type: 'complex', multiValued: false, required: false,
        subAttributes: [
          { name: 'formatted', type: 'string', required: false, mutability: 'readWrite', returned: 'default' },
          { name: 'givenName', type: 'string', required: false, mutability: 'readWrite', returned: 'default' },
          { name: 'familyName', type: 'string', required: false, mutability: 'readWrite', returned: 'default' },
        ],
        mutability: 'readWrite', returned: 'default' },
      { name: 'emails', type: 'complex', multiValued: true, required: false,
        subAttributes: [
          { name: 'value', type: 'string', required: true },
          { name: 'primary', type: 'boolean', required: false },
          { name: 'type', type: 'string', required: false },
        ],
        mutability: 'readWrite', returned: 'default' },
    ],
    meta: { resourceType: 'Schema', location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User' },
  }

  scimJson(res, 200, {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    Resources: [userSchema],
    startIndex: 1,
    itemsPerPage: 1,
  })
}
