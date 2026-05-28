import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../../_auth.js'
import { authenticateScim, scimJson, scimError } from '../../_scim.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return scimError(res, 405, 'Method not allowed')

  const session = await authenticateScim(req, res)
  if (!session) return

  const now = new Date().toISOString()
  scimJson(res, 200, {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://datatracker.ietf.org/doc/html/rfc7644',
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: 'oauthbearertoken',
        name: 'OAuth Bearer Token',
        description: 'Authentication using a long-lived bearer token issued from the Aeiforo admin console.',
        specUri: 'https://datatracker.ietf.org/doc/html/rfc6750',
        primary: true,
      },
    ],
    meta: { resourceType: 'ServiceProviderConfig', created: now, lastModified: now, location: '/scim/v2/ServiceProviderConfig' },
  })
}
