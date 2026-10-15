import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './index.js'

export default async function (req: VercelRequest, res: VercelResponse) {
  req.query.action = 'finalize'
  return handler(req, res)
}
