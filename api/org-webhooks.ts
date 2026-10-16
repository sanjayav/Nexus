import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from './_auth.js'
import { getDb } from './_db.js'
import { audit, auditIp } from './_audit.js'
import { encrypt } from './_crypto.js'
import { t } from './_i18n.js'
import { resolveRequestLocale } from './_orgSettings.js'
import {
  IM_CHANNELS,
  isAllowedWebhook,
  maskWebhookUrl,
  imConfigFromOrgRows,
  imChannelConfigForOrg,
  sendImNotifications,
  type ImChannel,
  type OrgChannelRow,
} from './_notifyChannels.js'

/**
 * Per-org IM group-bot webhooks (DingTalk / Feishu / WeCom). All routes need
 * permission admin.org. URLs and secrets are write-only: responses carry a
 * masked `webhook_hint` and `has_secret`, never the stored values.
 *
 *   GET    /api/org-webhooks
 *            → { channels: OrgWebhook[], env_fallback_active: boolean }
 *   POST   /api/org-webhooks
 *            { channel, webhook_url, secret?, label?, enabled?, kinds? }
 *            Upsert — one row per (org, channel).                → 201 { channel: OrgWebhook }
 *   PUT    /api/org-webhooks?id=<uuid>
 *            { webhook_url?, secret? (null clears), label?, enabled?, kinds? (null = all) }
 *   DELETE /api/org-webhooks?id=<uuid>
 *   POST   /api/org-webhooks?action=test&id=<uuid>
 *            Sends a test message in the caller's language and records
 *            last_test_at / last_test_ok / last_test_error. → { ok, error? }
 *
 * Once an org has any row, notify() uses only the org's rows; the env vars
 * (NOTIFY_IM_ORG_IDS allow-list) apply only to orgs with no rows.
 */

const kindsSchema = z.array(z.string().min(1).max(64)).max(50).nullable()
const urlSchema = z.string().trim().url().max(1000)
const secretSchema = z.string().trim().min(1).max(500)

const createSchema = z.object({
  channel: z.enum(IM_CHANNELS),
  webhook_url: urlSchema,
  secret: secretSchema.nullable().optional(),
  label: z.string().trim().max(120).nullable().optional(),
  enabled: z.boolean().optional(),
  kinds: kindsSchema.optional(),
}).strict()

const updateSchema = z.object({
  webhook_url: urlSchema.optional(),
  secret: secretSchema.nullable().optional(),
  label: z.string().trim().max(120).nullable().optional(),
  enabled: z.boolean().optional(),
  kinds: kindsSchema.optional(),
}).strict()

const idSchema = z.string().uuid()

type StoredRow = OrgChannelRow & {
  id: string
  label: string | null
  webhook_hint: string | null
  last_test_at: string | null
  last_test_ok: boolean | null
  last_test_error: string | null
  created_at: string
  updated_at: string
}

export function publicWebhook(r: StoredRow) {
  return {
    id: r.id,
    channel: r.channel,
    label: r.label,
    webhook_hint: r.webhook_hint,
    has_secret: Boolean(r.secret_enc),
    enabled: r.enabled,
    kinds: r.kinds,
    last_test_at: r.last_test_at,
    last_test_ok: r.last_test_ok,
    last_test_error: r.last_test_error,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

function validateChannelInput(channel: ImChannel, url: string | undefined, secret: string | null | undefined): string | null {
  if (url !== undefined && !isAllowedWebhook(channel, url)) {
    return `webhook_url must be an official ${channel} robot endpoint (https)`
  }
  if (channel === 'wecom' && secret) return 'WeCom group robots do not support a signing secret'
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const tok = await requirePermission(req, res, 'admin.org')
  if (!tok) return
  const sql = getDb()
  const orgId = tok.org
  const actorUserId = tok.sub.startsWith('apikey:') ? null : tok.sub
  const ip = auditIp(req)

  try {
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds,
               last_test_at, last_test_ok, last_test_error, created_at, updated_at
        FROM org_notify_channels WHERE org_id = ${orgId}
        ORDER BY channel
      `) as StoredRow[]
      const envActive = rows.length === 0 && Object.keys(imChannelConfigForOrg(orgId)).length > 0
      return res.status(200).json({ channels: rows.map(publicWebhook), env_fallback_active: envActive })
    }

    const action = String(req.query.action ?? (req.body as { action?: string } | undefined)?.action ?? '')

    if (req.method === 'POST' && action === 'test') {
      const id = String(req.query.id ?? (req.body as { id?: string } | undefined)?.id ?? '')
      if (!idSchema.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
      const rows = (await sql`
        SELECT id, channel, webhook_url_enc, secret_enc, enabled, kinds
        FROM org_notify_channels WHERE id = ${id} AND org_id = ${orgId}
      `) as OrgChannelRow[]
      if (rows.length === 0) return res.status(404).json({ error: 'Webhook not found' })
      const row = rows[0]
      const locale = await resolveRequestLocale(sql, req, tok)
      const orgRows = (await sql`SELECT name FROM organisations WHERE id = ${orgId}`) as Array<{ name: string }>
      // Test the row even if disabled — admins verify before switching on.
      const cfg = imConfigFromOrgRows([{ ...row, enabled: true, kinds: null }], null)
      const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173'
      const results = await sendImNotifications({
        title: t(locale, 'notify.webhook_test.subject'),
        body: t(locale, 'notify.webhook_test.body', { channel: t(locale, `im.channel.${row.channel}`), org: orgRows[0]?.name ?? '' }),
        link: `${baseUrl}/settings`,
        linkLabel: t(locale, 'im.link_label'),
      }, cfg)
      const r = results[0] ?? { channel: row.channel, ok: false, error: 'Webhook could not be decrypted' }
      await sql`
        UPDATE org_notify_channels
        SET last_test_at = now(), last_test_ok = ${r.ok}, last_test_error = ${r.ok ? null : (r.error ?? 'failed').slice(0, 500)}
        WHERE id = ${id} AND org_id = ${orgId}
      `
      await audit({ orgId, userId: actorUserId, action: 'org_webhook.test', resourceType: 'org_notify_channel', resourceId: id, details: { channel: row.channel, ok: r.ok }, ip })
      return res.status(200).json({ ok: r.ok, error: r.ok ? undefined : r.error })
    }

    if (req.method === 'POST') {
      const parsed = createSchema.safeParse(req.body ?? {})
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      const b = parsed.data
      const invalid = validateChannelInput(b.channel, b.webhook_url, b.secret)
      if (invalid) return res.status(400).json({ error: invalid })
      const rows = (await sql`
        INSERT INTO org_notify_channels
          (org_id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds, created_by, updated_by)
        VALUES
          (${orgId}, ${b.channel}, ${b.label ?? null}, ${encrypt(b.webhook_url)}, ${maskWebhookUrl(b.webhook_url)},
           ${b.secret ? encrypt(b.secret) : null}, ${b.enabled ?? true}, ${b.kinds ?? null}, ${tok.sub}, ${tok.sub})
        ON CONFLICT (org_id, channel) DO UPDATE SET
          label = EXCLUDED.label,
          webhook_url_enc = EXCLUDED.webhook_url_enc,
          webhook_hint = EXCLUDED.webhook_hint,
          secret_enc = EXCLUDED.secret_enc,
          enabled = EXCLUDED.enabled,
          kinds = EXCLUDED.kinds,
          last_test_at = NULL, last_test_ok = NULL, last_test_error = NULL,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by
        RETURNING id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds,
                  last_test_at, last_test_ok, last_test_error, created_at, updated_at
      `) as StoredRow[]
      await audit({ orgId, userId: actorUserId, action: 'org_webhook.upsert', resourceType: 'org_notify_channel', resourceId: rows[0].id, details: { channel: b.channel, enabled: b.enabled ?? true, has_secret: Boolean(b.secret), kinds: b.kinds ?? null }, ip })
      return res.status(201).json({ channel: publicWebhook(rows[0]) })
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const id = String(req.query.id ?? '')
      if (!idSchema.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
      const parsed = updateSchema.safeParse(req.body ?? {})
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      const b = parsed.data
      const current = (await sql`
        SELECT id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds
        FROM org_notify_channels WHERE id = ${id} AND org_id = ${orgId}
      `) as StoredRow[]
      if (current.length === 0) return res.status(404).json({ error: 'Webhook not found' })
      const cur = current[0]
      const invalid = validateChannelInput(cur.channel, b.webhook_url, b.secret)
      if (invalid) return res.status(400).json({ error: invalid })
      const urlEnc = b.webhook_url !== undefined ? encrypt(b.webhook_url) : cur.webhook_url_enc
      const hint = b.webhook_url !== undefined ? maskWebhookUrl(b.webhook_url) : cur.webhook_hint
      const secretEnc = b.secret === undefined ? cur.secret_enc : (b.secret ? encrypt(b.secret) : null)
      const rows = (await sql`
        UPDATE org_notify_channels SET
          label = ${b.label !== undefined ? b.label : cur.label},
          webhook_url_enc = ${urlEnc},
          webhook_hint = ${hint},
          secret_enc = ${secretEnc},
          enabled = ${b.enabled ?? cur.enabled},
          kinds = ${b.kinds !== undefined ? b.kinds : cur.kinds},
          updated_at = now(),
          updated_by = ${tok.sub}
        WHERE id = ${id} AND org_id = ${orgId}
        RETURNING id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds,
                  last_test_at, last_test_ok, last_test_error, created_at, updated_at
      `) as StoredRow[]
      await audit({
        orgId, userId: actorUserId, action: 'org_webhook.update', resourceType: 'org_notify_channel', resourceId: id,
        details: {
          channel: cur.channel,
          fields: Object.keys(b),
          url_changed: b.webhook_url !== undefined,
          secret_changed: b.secret !== undefined,
        },
        ip,
      })
      return res.status(200).json({ channel: publicWebhook(rows[0]) })
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id ?? '')
      if (!idSchema.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
      const rows = (await sql`
        DELETE FROM org_notify_channels WHERE id = ${id} AND org_id = ${orgId} RETURNING channel
      `) as Array<{ channel: string }>
      if (rows.length === 0) return res.status(404).json({ error: 'Webhook not found' })
      await audit({ orgId, userId: actorUserId, action: 'org_webhook.delete', resourceType: 'org_notify_channel', resourceId: id, details: { channel: rows[0].channel }, ip })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
