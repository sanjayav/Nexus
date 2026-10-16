/**
 * China IM group-bot notification channels: DingTalk (钉钉), Feishu (飞书) and
 * WeCom (企业微信) custom-robot webhooks.
 *
 * Two configuration sources (see loadOrgImConfig):
 *   1. Per-org rows in `org_notify_channels` (api/_cnSchema.ts), managed by
 *      admins through /api/org-webhooks. URL + secret are stored encrypted
 *      (api/_crypto.ts). When an org has ANY row, the rows are authoritative
 *      for that org (a disabled row is not overridden by env).
 *   2. Fallback for orgs with no rows: the env vars below, unchanged — still
 *      gated by NOTIFY_IM_ORG_IDS and NOTIFY_IM_KINDS.
 * A channel with no configuration is simply skipped. Nothing here throws —
 * every sender returns { ok, error? } like sendEmail().
 *
 *   DINGTALK_WEBHOOK_URL   https://oapi.dingtalk.com/robot/send?access_token=…
 *   DINGTALK_WEBHOOK_SECRET  optional — "加签" secret (SEC…); enables HMAC signing
 *   FEISHU_WEBHOOK_URL     https://open.feishu.cn/open-apis/bot/v2/hook/…
 *   FEISHU_WEBHOOK_SECRET  optional — "签名校验" secret; enables signing
 *   WECOM_WEBHOOK_URL      https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…
 *   NOTIFY_IM_ORG_IDS      REQUIRED for any IM delivery — comma-separated org
 *                          ids whose notifications may go to these group bots,
 *                          or "*" for single-tenant deployments. A webhook URL
 *                          is a destination (one group chat), unlike the
 *                          email API key, so without this allow-list a
 *                          multi-tenant deployment would leak every org's
 *                          notifications into one chat. Unset ⇒ IM disabled.
 *   NOTIFY_IM_KINDS        optional — comma-separated notification kinds to
 *                          forward to group bots (default: all kinds)
 *
 * The payload builders and signers are pure functions so they can be unit
 * tested without network access (src/test/unit/notify-channels.test.ts).
 */
import { createHmac } from 'node:crypto'
import { decrypt } from './_crypto.js'
import type { Sql } from './_db.js'

export type ImChannel = 'dingtalk' | 'feishu' | 'wecom'

export interface ImMessage {
  title: string
  body?: string
  /** Absolute URL to open in Nexus. */
  link?: string
  /** Link text in the recipient org's language (default: Chinese). */
  linkLabel?: string
}

export interface ImChannelConfig {
  dingtalk?: { webhookUrl: string; secret?: string }
  feishu?: { webhookUrl: string; secret?: string }
  wecom?: { webhookUrl: string }
}

export interface ImSendResult {
  channel: ImChannel
  ok: boolean
  error?: string
}

const LINK_LABEL = '在 Nexus 中查看'

/** Only post to the vendors' official robot endpoints (defence against a
 *  mis-set env var turning notify() into an open HTTP client). */
const ALLOWED_HOSTS: Record<ImChannel, string[]> = {
  dingtalk: ['oapi.dingtalk.com'],
  feishu: ['open.feishu.cn', 'open.larksuite.com'],
  wecom: ['qyapi.weixin.qq.com'],
}

export function isAllowedWebhook(channel: ImChannel, url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && ALLOWED_HOSTS[channel].includes(u.hostname)
  } catch {
    return false
  }
}

// ─── DingTalk ────────────────────────────────────────────────────────────

/**
 * DingTalk "加签" signature: Base64(HmacSHA256(key = secret,
 * message = `${timestampMs}\n${secret}`)), URL-encoded, passed as
 * `&timestamp=…&sign=…` on the webhook URL. Timestamp is milliseconds and
 * must be within 1 hour of DingTalk server time.
 */
export function signDingTalk(secret: string, timestampMs: number): string {
  const stringToSign = `${timestampMs}\n${secret}`
  const b64 = createHmac('sha256', secret).update(stringToSign, 'utf8').digest('base64')
  return encodeURIComponent(b64)
}

/** Appends timestamp + sign to the webhook URL when a secret is configured. */
export function buildDingTalkUrl(webhookUrl: string, secret?: string, nowMs: number = Date.now()): string {
  if (!secret) return webhookUrl
  const sep = webhookUrl.includes('?') ? '&' : '?'
  return `${webhookUrl}${sep}timestamp=${nowMs}&sign=${signDingTalk(secret, nowMs)}`
}

export function buildDingTalkPayload(msg: ImMessage) {
  const lines = [`#### ${msg.title}`]
  if (msg.body) lines.push('', msg.body)
  if (msg.link) lines.push('', `[${msg.linkLabel ?? LINK_LABEL}](${msg.link})`)
  return {
    msgtype: 'markdown' as const,
    markdown: { title: msg.title, text: lines.join('\n') },
  }
}

// ─── Feishu ──────────────────────────────────────────────────────────────

/**
 * Feishu custom-bot signature: Base64(HmacSHA256(key = `${timestampSec}\n${secret}`,
 * message = "")). Timestamp is SECONDS and is sent in the body alongside `sign`.
 */
export function signFeishu(secret: string, timestampSec: number): string {
  const key = `${timestampSec}\n${secret}`
  return createHmac('sha256', key).update('', 'utf8').digest('base64')
}

export function buildFeishuPayload(msg: ImMessage, secret?: string, nowSec: number = Math.floor(Date.now() / 1000)) {
  const content: Array<Array<{ tag: 'text'; text: string } | { tag: 'a'; text: string; href: string }>> = []
  if (msg.body) content.push([{ tag: 'text', text: msg.body }])
  if (msg.link) content.push([{ tag: 'a', text: msg.linkLabel ?? LINK_LABEL, href: msg.link }])
  const payload: {
    msg_type: 'post'
    content: { post: { zh_cn: { title: string; content: typeof content } } }
    timestamp?: string
    sign?: string
  } = {
    msg_type: 'post',
    content: { post: { zh_cn: { title: msg.title, content } } },
  }
  if (secret) {
    payload.timestamp = String(nowSec)
    payload.sign = signFeishu(secret, nowSec)
  }
  return payload
}

// ─── WeCom ───────────────────────────────────────────────────────────────

/** WeCom robot markdown content is capped at 4096 UTF-8 bytes. */
export const WECOM_MARKDOWN_MAX_BYTES = 4096

function truncateUtf8(s: string, maxBytes: number): string {
  const enc = new TextEncoder()
  if (enc.encode(s).length <= maxBytes) return s
  let out = ''
  let bytes = 0
  const ellipsis = '…'
  const budget = maxBytes - enc.encode(ellipsis).length
  for (const ch of s) {
    const b = enc.encode(ch).length
    if (bytes + b > budget) break
    out += ch
    bytes += b
  }
  return out + ellipsis
}

export function buildWeComPayload(msg: ImMessage) {
  const lines = [`**${msg.title}**`]
  if (msg.body) lines.push(msg.body)
  if (msg.link) lines.push(`[${msg.linkLabel ?? LINK_LABEL}](${msg.link})`)
  return {
    msgtype: 'markdown' as const,
    markdown: { content: truncateUtf8(lines.join('\n'), WECOM_MARKDOWN_MAX_BYTES) },
  }
}

// ─── Transport ───────────────────────────────────────────────────────────

/** All three APIs answer HTTP 200 with an error code in the body. */
export function interpretImResponse(channel: ImChannel, body: unknown): { ok: boolean; error?: string } {
  const b = (body ?? {}) as Record<string, unknown>
  if (channel === 'feishu') {
    const code = b.code ?? b.StatusCode
    if (code === 0) return { ok: true }
    return { ok: false, error: `feishu ${String(code)}: ${String(b.msg ?? b.StatusMessage ?? 'unknown error')}` }
  }
  if (b.errcode === 0) return { ok: true }
  return { ok: false, error: `${channel} ${String(b.errcode)}: ${String(b.errmsg ?? 'unknown error')}` }
}

async function postJson(channel: ImChannel, url: string, payload: unknown, timeoutMs = 10_000): Promise<ImSendResult> {
  if (!isAllowedWebhook(channel, url)) {
    return { channel, ok: false, error: `${channel} webhook URL is not an official ${channel} robot endpoint` }
  }
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { channel, ok: false, error: `${channel} HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    const json = await res.json().catch(() => null)
    return { channel, ...interpretImResponse(channel, json) }
  } catch (err: unknown) {
    return { channel, ok: false, error: err instanceof Error ? err.message : `${channel} send failed` }
  } finally {
    clearTimeout(t)
  }
}

export function sendDingTalk(cfg: NonNullable<ImChannelConfig['dingtalk']>, msg: ImMessage): Promise<ImSendResult> {
  return postJson('dingtalk', buildDingTalkUrl(cfg.webhookUrl, cfg.secret), buildDingTalkPayload(msg))
}

export function sendFeishu(cfg: NonNullable<ImChannelConfig['feishu']>, msg: ImMessage): Promise<ImSendResult> {
  return postJson('feishu', cfg.webhookUrl, buildFeishuPayload(msg, cfg.secret))
}

export function sendWeCom(cfg: NonNullable<ImChannelConfig['wecom']>, msg: ImMessage): Promise<ImSendResult> {
  return postJson('wecom', cfg.webhookUrl, buildWeComPayload(msg))
}

/** Reads channel config from env vars; channels without a URL are omitted. */
export function imChannelConfigFromEnv(env: Record<string, string | undefined> = process.env): ImChannelConfig {
  const cfg: ImChannelConfig = {}
  if (env.DINGTALK_WEBHOOK_URL) cfg.dingtalk = { webhookUrl: env.DINGTALK_WEBHOOK_URL, secret: env.DINGTALK_WEBHOOK_SECRET || undefined }
  if (env.FEISHU_WEBHOOK_URL) cfg.feishu = { webhookUrl: env.FEISHU_WEBHOOK_URL, secret: env.FEISHU_WEBHOOK_SECRET || undefined }
  if (env.WECOM_WEBHOOK_URL) cfg.wecom = { webhookUrl: env.WECOM_WEBHOOK_URL }
  return cfg
}

/**
 * Channel config for one org: the env channels, but only when the org is in
 * NOTIFY_IM_ORG_IDS (or that is "*"). Returns {} otherwise.
 */
export function imChannelConfigForOrg(orgId: string, env: Record<string, string | undefined> = process.env): ImChannelConfig {
  const raw = env.NOTIFY_IM_ORG_IDS?.trim()
  if (!raw) return {}
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!allowed.includes('*') && !allowed.includes(orgId)) return {}
  return imChannelConfigFromEnv(env)
}

/** NOTIFY_IM_KINDS filter — unset/empty forwards every kind. */
export function shouldForwardKind(kind: string, env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.NOTIFY_IM_KINDS?.trim()
  if (!raw) return true
  return raw.split(',').map(s => s.trim()).filter(Boolean).includes(kind)
}

/**
 * Fan a message out to every configured group-bot channel in parallel.
 * Never throws; returns one result per configured channel ([] when none).
 */
export async function sendImNotifications(msg: ImMessage, cfg: ImChannelConfig = imChannelConfigFromEnv()): Promise<ImSendResult[]> {
  const jobs: Promise<ImSendResult>[] = []
  if (cfg.dingtalk) jobs.push(sendDingTalk(cfg.dingtalk, msg))
  if (cfg.feishu) jobs.push(sendFeishu(cfg.feishu, msg))
  if (cfg.wecom) jobs.push(sendWeCom(cfg.wecom, msg))
  if (jobs.length === 0) return []
  return Promise.all(jobs)
}

// ─── Per-org configuration (org_notify_channels) ─────────────────────────

export const IM_CHANNELS = ['dingtalk', 'feishu', 'wecom'] as const satisfies readonly ImChannel[]

export interface OrgChannelRow {
  channel: ImChannel
  webhook_url_enc: string
  secret_enc: string | null
  enabled: boolean
  kinds: string[] | null
}

/** Display form of a webhook URL that never reveals the token: host + last 4. */
export function maskWebhookUrl(url: string): string {
  try {
    const u = new URL(url)
    const token = u.searchParams.get('access_token') ?? u.searchParams.get('key') ?? u.pathname.split('/').filter(Boolean).pop() ?? ''
    return `${u.hostname}/…${token.slice(-4)}`
  } catch {
    return '…'
  }
}

/** Does a row's `kinds` filter allow this notification kind? (null/empty = all) */
export function rowForwardsKind(kinds: string[] | null | undefined, kind: string): boolean {
  if (!kinds || kinds.length === 0) return true
  return kinds.includes(kind)
}

/**
 * Build an ImChannelConfig from an org's rows: enabled rows whose kind filter
 * matches. Rows that fail to decrypt are skipped (logged), never thrown.
 */
export function imConfigFromOrgRows(
  rows: OrgChannelRow[],
  kind: string | null,
  decryptFn: (b64: string) => string = decrypt,
): ImChannelConfig {
  const cfg: ImChannelConfig = {}
  for (const r of rows) {
    if (!r.enabled) continue
    if (kind !== null && !rowForwardsKind(r.kinds, kind)) continue
    let webhookUrl: string
    let secret: string | undefined
    try {
      webhookUrl = decryptFn(r.webhook_url_enc)
      secret = r.secret_enc ? decryptFn(r.secret_enc) : undefined
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error(`[notifyChannels] cannot decrypt ${r.channel} webhook:`, err instanceof Error ? err.message : err)
      continue
    }
    if (r.channel === 'dingtalk') cfg.dingtalk = { webhookUrl, secret }
    else if (r.channel === 'feishu') cfg.feishu = { webhookUrl, secret }
    else if (r.channel === 'wecom') cfg.wecom = { webhookUrl }
  }
  return cfg
}

export function hasAnyChannel(cfg: ImChannelConfig): boolean {
  return Boolean(cfg.dingtalk || cfg.feishu || cfg.wecom)
}

/**
 * Resolve the IM channels for one notification of `kind` in `orgId`:
 * per-org rows first; env vars (NOTIFY_IM_ORG_IDS / NOTIFY_IM_KINDS
 * semantics) only when the org has no rows at all.
 */
export async function loadOrgImConfig(
  sql: Sql,
  orgId: string,
  kind: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ source: 'org' | 'env' | 'none'; config: ImChannelConfig }> {
  let rows: OrgChannelRow[] = []
  try {
    rows = (await sql`
      SELECT channel, webhook_url_enc, secret_enc, enabled, kinds
      FROM org_notify_channels WHERE org_id = ${orgId}
    `) as OrgChannelRow[]
  } catch {
    rows = [] // table not migrated yet → env fallback
  }
  if (rows.length > 0) {
    const config = imConfigFromOrgRows(rows, kind)
    return { source: hasAnyChannel(config) ? 'org' : 'none', config }
  }
  const envCfg = imChannelConfigForOrg(orgId, env)
  if (hasAnyChannel(envCfg) && shouldForwardKind(kind, env)) return { source: 'env', config: envCfg }
  return { source: 'none', config: {} }
}
