import { t, intlTag, type Locale } from './_i18n.js'

// Thin Resend wrapper. Logs + returns soft error when key not set, so callers
// can still record the attempt without crashing the request.

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Nexus <notifications@aeiforo.local>'
  if (!key) {
    // eslint-disable-next-line no-console
    console.log('[email] (no RESEND_API_KEY) would send:', payload.subject, '→', payload.to)
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

// ─── Localised templates ────────────────────────────────────────────────


function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/** Password-reset email in the user's language (api/auth/forgot-password.ts). */
export function renderPasswordResetEmail(locale: Locale, args: { name: string; resetUrl: string }): Omit<EmailPayload, 'to'> {
  const url = esc(args.resetUrl)
  return {
    subject: t(locale, 'email.password_reset.subject'),
    html: `
        <div lang="${intlTag(locale)}" style="font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f1419">
          <h2 style="color:#0F7B6F;margin:0 0 12px">${esc(t(locale, 'email.password_reset.heading'))}</h2>
          <p>${esc(t(locale, 'email.password_reset.greeting', { name: args.name }))}</p>
          <p>${esc(t(locale, 'email.password_reset.intro'))}</p>
          <p style="margin:24px 0">
            <a href="${url}" style="display:inline-block;background:#0F7B6F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${esc(t(locale, 'email.password_reset.cta'))}</a>
          </p>
          <p style="font-size:12px;color:#666">${esc(t(locale, 'email.password_reset.ignore'))}</p>
          <p style="font-size:12px;color:#666;word-break:break-all">${esc(t(locale, 'email.password_reset.direct_link', { url: args.resetUrl }))}</p>
        </div>
      `,
    text: t(locale, 'email.password_reset.text', { url: args.resetUrl }),
  }
}
