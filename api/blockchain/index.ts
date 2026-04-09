import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'crypto'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list blockchain records for org
  if (req.method === 'GET') {
    const { record_type, status, facility_name } = req.query as Record<string, string | undefined>

    try {
      const rows = await sql`
        SELECT *
        FROM blockchain_records
        WHERE org_id = ${token.org}
          AND (${record_type || null}::text IS NULL OR record_type = ${record_type || null})
          AND (${status || null}::text IS NULL OR status = ${status || null})
          AND (${facility_name || null}::text IS NULL OR facility_name ILIKE '%' || ${facility_name || ''} || '%')
        ORDER BY block_number DESC
      `
      return res.status(200).json(rows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create a new blockchain record (simulated)
  if (req.method === 'POST') {
    const { record_type, reference_id, facility_name, event_type, metadata } = req.body ?? {}

    if (!record_type) return res.status(400).json({ error: 'record_type is required' })

    try {
      // Get the most recent record for chain linking
      const latest = await sql`
        SELECT data_hash, block_number
        FROM blockchain_records
        WHERE org_id = ${token.org}
        ORDER BY block_number DESC
        LIMIT 1
      `

      const previousHash = latest.length > 0
        ? latest[0].data_hash
        : '0x' + '0'.repeat(64)

      const blockNumber = latest.length > 0
        ? Number(latest[0].block_number) + 1
        : 21300000

      const dataHash = '0x' + crypto.randomBytes(32).toString('hex')
      const transactionHash = '0x' + crypto.randomBytes(32).toString('hex')
      const verifierDid = 'did:ethr:0x' + crypto.randomBytes(20).toString('hex')

      const created = await sql`
        INSERT INTO blockchain_records (
          org_id, record_type, reference_id, facility_name, event_type,
          data_hash, previous_hash, block_number, transaction_hash, verifier_did,
          metadata, status
        ) VALUES (
          ${token.org}, ${record_type}, ${reference_id || null}, ${facility_name || null}, ${event_type || null},
          ${dataHash}, ${previousHash}, ${blockNumber}, ${transactionHash}, ${verifierDid},
          ${metadata ? JSON.stringify(metadata) : null}::jsonb, 'submitted'
        )
        RETURNING *
      `
      return res.status(201).json(created[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
