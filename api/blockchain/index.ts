import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'crypto'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'
import { emitAuditEvent, getPlatformRole } from '../_workflow.js'
import { verifyChain } from '../_hashChain.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // ═══════════════════════════════════════════
  // GET dispatcher — SRD §16.3 views
  // ═══════════════════════════════════════════
  if (req.method === 'GET') {
    const { view, data_value_id } = req.query as Record<string, string | undefined>

    // Nexus: full audit-event trail for a data value
    if (view === 'trail') {
      if (!data_value_id) return res.status(400).json({ error: 'data_value_id required' })
      try {
        const events = await sql`
          SELECT ae.*, u.name AS actor_name, u.email AS actor_email
          FROM audit_event ae
          LEFT JOIN users u ON u.id = ae.actor_user_id
          WHERE ae.data_value_id = ${data_value_id}
          ORDER BY ae.timestamp ASC
        `
        return res.status(200).json(events)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // Nexus: latest hash for a data value
    if (view === 'hash') {
      if (!data_value_id) return res.status(400).json({ error: 'data_value_id required' })
      try {
        const rows = await sql`
          SELECT value_hash, status FROM data_value WHERE id = ${data_value_id}
        `
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
        return res.status(200).json(rows[0])
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // Verify the org's chain integrity
    if (view === 'verify') {
      try {
        const report = await verifyChain(sql, token.org)
        return res.status(200).json(report)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // External anchor history (OpenTimestamps receipts)
    if (view === 'anchors') {
      const rows = await sql`
        SELECT id, tip_hash, tip_block_number, anchor_method, calendar_url,
               receipt_size, status, error_message, anchored_at, confirmed_at, bitcoin_block_height
        FROM chain_anchors
        WHERE org_id = ${token.org}
        ORDER BY anchored_at DESC
        LIMIT 50
      `
      return res.status(200).json(rows)
    }

    // Download the raw .ots receipt for external verification
    if (view === 'anchor-receipt') {
      const { anchor_id } = req.query as Record<string, string | undefined>
      if (!anchor_id) return res.status(400).json({ error: 'anchor_id required' })
      const rows = await sql`SELECT tip_hash, receipt FROM chain_anchors WHERE id = ${anchor_id} AND org_id = ${token.org}` as Array<{ tip_hash: string; receipt: Buffer | null }>
      if (rows.length === 0 || !rows[0].receipt) return res.status(404).json({ error: 'Receipt not found' })
      res.setHeader('Content-Type', 'application/vnd.opentimestamps.v1')
      res.setHeader('Content-Disposition', `attachment; filename="${rows[0].tip_hash.slice(2, 18)}.ots"`)
      res.status(200).end(Buffer.from(rows[0].receipt))
      return
    }

    // Legacy: list blockchain_records (pre-Nexus API)
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

  // ═══════════════════════════════════════════
  // POST dispatcher — SRD §16.3 actions
  // ═══════════════════════════════════════════
  if (req.method === 'POST') {
    const { action } = req.body ?? {}

    // Anchor the current chain tip via OpenTimestamps. POSTs the tip's 32-byte digest
    // to a public OTS calendar (a.pool.opentimestamps.org), receives a partial receipt,
    // stores it as bytea. Receipt is "pending" until confirmed in a Bitcoin block (~1-6h).
    if (action === 'anchor-tip') {
      try {
        // 1. Get current chain tip
        const tipRows = await sql`
          SELECT data_hash, block_number FROM blockchain_records
          WHERE org_id = ${token.org}
          ORDER BY block_number DESC LIMIT 1
        ` as Array<{ data_hash: string; block_number: number }>
        if (tipRows.length === 0) return res.status(400).json({ error: 'Chain is empty — nothing to anchor' })
        const tipHex = tipRows[0].data_hash.startsWith('0x') ? tipRows[0].data_hash.slice(2) : tipRows[0].data_hash
        const tipBlock = tipRows[0].block_number

        // 2. Guard: skip if the same tip was already anchored recently (< 60s)
        const recent = await sql`
          SELECT id FROM chain_anchors WHERE org_id = ${token.org} AND tip_hash = ${tipRows[0].data_hash} AND anchored_at > now() - interval '1 minute'
        ` as Array<{ id: string }>
        if (recent.length > 0) {
          return res.status(200).json({ ok: true, alreadyAnchored: true, anchor_id: recent[0].id })
        }

        // 3. Submit to OTS calendar
        const calendarUrl = 'https://a.pool.opentimestamps.org/digest'
        const digest = Buffer.from(tipHex, 'hex')
        if (digest.length !== 32) {
          return res.status(400).json({ error: `Tip hash must be 32 bytes, got ${digest.length}` })
        }
        const otsRes = await fetch(calendarUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.opentimestamps.v1',
            'Content-Type': 'application/vnd.opentimestamps.v1',
            'User-Agent': 'aeiforo-esg-platform/1.0',
          },
          body: digest,
        })
        if (!otsRes.ok) {
          await sql`
            INSERT INTO chain_anchors (org_id, tip_hash, tip_block_number, calendar_url, status, error_message)
            VALUES (${token.org}, ${tipRows[0].data_hash}, ${tipBlock}, ${calendarUrl}, 'failed', ${`HTTP ${otsRes.status}`})
          `
          return res.status(502).json({ error: `OTS calendar returned HTTP ${otsRes.status}` })
        }
        const receipt = Buffer.from(await otsRes.arrayBuffer())

        const created = await sql`
          INSERT INTO chain_anchors (org_id, tip_hash, tip_block_number, calendar_url, receipt, receipt_size, status)
          VALUES (${token.org}, ${tipRows[0].data_hash}, ${tipBlock}, ${calendarUrl}, ${receipt}, ${receipt.length}, 'pending')
          RETURNING id, anchored_at
        ` as Array<{ id: string; anchored_at: string }>

        return res.status(201).json({
          ok: true,
          anchor_id: created[0].id,
          tip_hash: tipRows[0].data_hash,
          tip_block: tipBlock,
          receipt_size: receipt.length,
          anchored_at: created[0].anchored_at,
          status: 'pending',
          note: 'Submitted to OpenTimestamps calendar. Partial receipt stored. Full Bitcoin confirmation typically 1-6 hours.',
        })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Anchor failed' })
      }
    }

    // Nexus: emit an audit event hash-chained to a data_value
    if (action === 'emit') {
      const { data_value_id, event_type, comment } = req.body ?? {}
      if (!data_value_id || !event_type) return res.status(400).json({ error: 'data_value_id and event_type required' })
      try {
        const platformRole = await getPlatformRole(sql, token.sub)
        const result = await emitAuditEvent(sql, {
          dataValueId: data_value_id,
          eventType: event_type,
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: null,
          comment,
        })
        return res.status(201).json(result)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // Named actions must be matched above. If an `action` is given but unrecognised,
    // reject it cleanly instead of falling through to the legacy `create` path.
    if (action) {
      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    // Legacy: create a blockchain_records row (pre-Nexus API, no `action` in body)
    const { record_type, reference_id, facility_name, event_type, metadata } = req.body ?? {}
    if (!record_type) return res.status(400).json({ error: 'record_type is required' })

    try {
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
