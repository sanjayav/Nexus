import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './index.js'

export default async function (req: VercelRequest, res: VercelResponse) {
  // Re-route through the index handler with action=iro.
  req.query.action = 'iro'
  return handler(req, res)
}
