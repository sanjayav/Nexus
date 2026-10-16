import { getDb, type Sql } from './_db.js'
import { sendEmail } from './_email.js'
import { sendImNotifications, loadOrgImConfig, hasAnyChannel } from './_notifyChannels.js'
import { t, hasMessage, translateLegacyPhrase, intlTag, type Locale, type MessageParams } from './_i18n.js'
import { resolveRecipientLocale } from './_orgSettings.js'

export {
  sendImNotifications,
  sendDingTalk,
  sendFeishu,
  sendWeCom,
  imChannelConfigFromEnv,
  imChannelConfigForOrg,
  loadOrgImConfig,
} from './_notifyChannels.js'
export type { ImChannel, ImChannelConfig, ImMessage, ImSendResult } from './_notifyChannels.js'

// Single entry point: writes a notification row AND fires an email, plus any
// China group-bot channels (DingTalk / Feishu / WeCom). IM config comes from
// the org's own webhooks (org_notify_channels, /api/org-webhooks) first and
// falls back to the env vars + NOTIFY_IM_ORG_IDS allow-list — see
// _notifyChannels.ts loadOrgImConfig().
//
// Language: subject/body/email chrome are rendered in the RECIPIENT's locale
// (users.locale → org market default → en; api/_orgSettings.ts). Callers
// should pass `message: { key, params }` (keys in api/_i18n.ts); legacy
// callers passing fixed English `subject`/`body` still work — known phrases
// are translated, anything else is sent as given.
//
// Recipients without an email address (e.g. WeCom/DingTalk-provisioned
// users) still get the in-app row and IM delivery; only email is skipped.
// `recipient_email` is NOT NULL in the existing schema, so '' is stored and
// the in-app list matches such rows by recipient_user_id.

export interface NotifyMessage {
  /** Prefix in api/_i18n.ts; `<key>.subject` and `<key>.body` are rendered. */
  key: string
  /**
   * Interpolation values. A string value of the form '$t:<key>' is itself
   * translated (e.g. due: '$t:common.tbd').
   */
  params?: MessageParams
  /** Per-locale overrides merged over `params`, e.g. { zh: { item: line_item_zh } }. */
  paramsByLocale?: Partial<Record<Locale, MessageParams>>
  /** Use `<key>.<bodyVariant>` instead of `<key>.body` (e.g. 'body_due'). */
  bodyVariant?: string
}

function resolveParams(m: NotifyMessage, locale: Locale): MessageParams {
  const merged: MessageParams = { ...(m.params ?? {}), ...(m.paramsByLocale?.[locale] ?? {}) }
  for (const [k, v] of Object.entries(merged)) {
    if (typeof v === 'string' && v.startsWith('$t:')) merged[k] = t(locale, v.slice(3))
  }
  return merged
}

export interface NotifyArgs {
  orgId: string
  userId?: string | null
  /** Optional: users without email still get in-app + IM notifications. */
  toEmail?: string | null
  kind: string
  /** English fallback / legacy text. Ignored when `message` renders. */
  subject: string
  body?: string
  route?: string                     // relative path e.g. /my-tasks
  relatedAssignmentId?: string | null
  message?: NotifyMessage
}

export interface RenderedNotification {
  subject: string
  body?: string
  messageKey: string | null
}

/** Render subject/body for `locale`. Pure — exported for tests. */
export function renderNotification(args: Pick<NotifyArgs, 'subject' | 'body' | 'message'>, locale: Locale): RenderedNotification {
  const m = args.message
  if (m && hasMessage(`${m.key}.subject`)) {
    const params = resolveParams(m, locale)
    const subject = t(locale, `${m.key}.subject`, params)
    const bodyKey = `${m.key}.${m.bodyVariant ?? 'body'}`
    const body = hasMessage(bodyKey) ? t(locale, bodyKey, params) : args.body
    return { subject, body: body || undefined, messageKey: m.key }
  }
  return {
    subject: translateLegacyPhrase(args.subject, locale),
    body: args.body != null ? translateLegacyPhrase(args.body, locale) : undefined,
    messageKey: null,
  }
}

/** Email HTML in the recipient's language. Pure — exported for tests. */
export function renderNotificationEmail(r: { subject: string; body?: string }, link: string, locale: Locale): { html: string; text: string } {
  const lang = intlTag(locale)
  const font = locale === 'zh'
    ? "-apple-system, system-ui, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif"
    : '-apple-system, system-ui, sans-serif'
  const html = `
    <div lang="${lang}" style="font-family: ${font}; max-width: 560px; padding: 24px; background: #f7faf9;">
      <div style="background: white; border-radius: 12px; padding: 28px; border: 1px solid #e6f0ee;">
        <div style="font-size: 18px; font-weight: 600; color: #064e3b; margin-bottom: 8px;">${escapeHtml(r.subject)}</div>
        ${r.body ? `<div style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.5;">${escapeHtml(r.body)}</div>` : ''}
        <a href="${escapeHtml(link)}" style="display: inline-block; padding: 10px 18px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">${escapeHtml(t(locale, 'email.cta'))}</a>
      </div>
      <div style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 16px;">${escapeHtml(t(locale, 'email.footer'))}</div>
    </div>
  `
  const text = `${r.subject}${r.body ? '\n\n' + r.body : ''}\n\n${link}`
  return { html, text }
}

export async function notify(args: NotifyArgs, deps: { sql?: Sql } = {}): Promise<void> {
  const toEmail = (args.toEmail ?? '').trim()
  if (!toEmail && !args.userId) return
  const sql = deps.sql ?? getDb()
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173'
  const fullLink = args.route ? `${baseUrl}${args.route}` : baseUrl

  let locale: Locale = 'en'
  try {
    locale = await resolveRecipientLocale(sql, { orgId: args.orgId, userId: args.userId, email: toEmail || null })
  } catch {
    locale = 'en'
  }
  const rendered = renderNotification(args, locale)

  // IM group bots: per-org webhooks first, env fallback. Best-effort.
  const im = await loadOrgImConfig(sql, args.orgId, args.kind).catch(() => ({ source: 'none' as const, config: {} }))
  const imJob = hasAnyChannel(im.config)
    ? sendImNotifications(
        { title: rendered.subject, body: rendered.body, link: fullLink, linkLabel: t(locale, 'im.link_label') },
        im.config,
      )
    : Promise.resolve([])

  let result: { ok: boolean; error?: string } = { ok: false }
  if (toEmail) {
    const { html, text } = renderNotificationEmail(rendered, fullLink, locale)
    result = await sendEmail({ to: toEmail, subject: rendered.subject, html, text })
  }

  // Group-bot delivery never affects the email result or the notification
  // row; failures are logged only.
  for (const r of await imJob) {
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.error(`[notify] ${r.channel} failed:`, r.error)
    }
  }

  const emailSentAt = result.ok ? new Date().toISOString() : null
  const emailError = toEmail ? (result.error ?? null) : null
  const params = args.message?.params ? JSON.stringify(args.message.params) : null
  try {
    try {
      await sql`
        INSERT INTO notifications
          (org_id, recipient_user_id, recipient_email, kind, subject, body, route,
           related_assignment_id, email_sent_at, email_error, message_key, params, locale)
        VALUES
          (${args.orgId}, ${args.userId ?? null}, ${toEmail.toLowerCase()},
           ${args.kind}, ${rendered.subject}, ${rendered.body ?? null}, ${args.route ?? null},
           ${args.relatedAssignmentId ?? null}, ${emailSentAt}, ${emailError},
           ${rendered.messageKey}, ${params}::jsonb, ${locale})
      `
    } catch (err: unknown) {
      // message_key / params / locale not migrated yet (api/_cnSchema.ts) —
      // fall back to the original column set.
      if (!/column|does not exist/i.test(err instanceof Error ? err.message : String(err))) throw err
      await sql`
        INSERT INTO notifications
          (org_id, recipient_user_id, recipient_email, kind, subject, body, route,
           related_assignment_id, email_sent_at, email_error)
        VALUES
          (${args.orgId}, ${args.userId ?? null}, ${toEmail.toLowerCase()},
           ${args.kind}, ${rendered.subject}, ${rendered.body ?? null}, ${args.route ?? null},
           ${args.relatedAssignmentId ?? null}, ${emailSentAt}, ${emailError})
      `
    }
  } catch (err: unknown) {
    // Don't crash the caller — the email side already happened (or failed loudly).
    // eslint-disable-next-line no-console
    console.error('[notify] insert failed:', err instanceof Error ? err.message : err)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
}
