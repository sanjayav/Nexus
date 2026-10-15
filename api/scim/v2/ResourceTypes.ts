import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../../_auth.js'
import { authenticateScim, scimJson, scimError } from '../../_scim.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return scimError(res, 405, 'Method not allowed')

  const session = await authenticateScim(req, res)
  if (!session) return

  const userType = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
    id: 'User',
    name: 'User',
    endpoint: '/Users',
    description: 'User Account',
    schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
    meta: { resourceType: 'ResourceType', location: '/scim/v2/ResourceTypes/User' },
  }

  scimJson(res, 200, {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    Resources: [userType],
    startIndex: 1,
    itemsPerPage: 1,
  })
}
