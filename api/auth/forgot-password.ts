import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { cors } from '../_auth.js'
import { sendEmail, renderPasswordResetEmail } from '../_email.js'
import { resolveLocale } from '../_i18n.js'
import { loadOrgSettings } from '../_orgSettings.js'

const forgotSchema = z.object({
  email: z.string().email().max(320),
})

/**
 * POST /api/auth/forgot-password
 * Always returns 200 {ok:true} regardless of whether the email exists, to
 * prevent user-enumeration. If the user exists and has a password (SSO users
 * are skipped), generate a single-use token, hash it, store with 30-min
 * expiry, and email the link to the user.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body: { email: string }
  try {
    body = forgotSchema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const email = body.email.toLowerCase().trim()
  const sql = getDb()

  try {
    const users = (await sql`
      SELECT id, org_id, name, email, password_hash, is_active,
             to_jsonb(users) ->> 'locale' AS locale
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `) as Array<{ id: string; org_id: string | null; name: string; email: string; password_hash: string | null; is_active: boolean; locale: string | null }>

    // Generic OK response — never reveal whether the email is registered.
    const okResponse = () => res.status(200).json({ ok: true })

    if (users.length === 0) return okResponse()
    const user = users[0]

    // SSO users have no password to reset — they delegate to the IdP.
    if (!user.password_hash || user.password_hash.length === 0) return okResponse()

    // Generate the raw token (sent in the email) and store its SHA-256 hash.
    const rawToken = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Invalidate any prior unused tokens so only the newest is honourable.
    await sql`
      UPDATE password_resets
      SET used_at = now()
      WHERE user_id = ${user.id} AND used_at IS NULL
    `

    await sql`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, now() + interval '30 minutes')
    `

    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173'
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`

    // SECURITY TRADE-OFF — anti-enumeration:
    //   We always return 200 from this endpoint regardless of whether the
    //   email exists OR whether the email service is configured, so an
    //   attacker can't probe the system to discover valid accounts.
    //   When RESEND_API_KEY is unset the user-visible UX is "we sent you
    //   an email" but no email is actually dispatched — admins MUST be
    //   able to spot this misconfiguration via `/api/health` (which
    //   exposes integrations.email.configured) and the server log line
    //   below. Do NOT return 503 here.
    if (!process.env.RESEND_API_KEY) {
      const maskedEmail = user.email.replace(/(.{2}).*(@.*)/, '$1***$2')
      // eslint-disable-next-line no-console
      console.warn(
        '[forgot-password] RESEND_API_KEY not set — password-reset email NOT sent for',
        maskedEmail,
        '(token stored, link only available via support).',
      )
    }

    // Recipient's language: users.locale → Accept-Language → org market → en.
    const market = user.org_id ? (await loadOrgSettings(sql, user.org_id)).market : 'global'
    const locale = resolveLocale({ userLocale: user.locale, acceptLanguage: req.headers['accept-language'], market })
    void sendEmail({
      to: user.email,
      ...renderPasswordResetEmail(locale, { name: user.name, resetUrl }),
    }).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[forgot-password] email send failed:', err instanceof Error ? err.message : err)
    })

    return okResponse()
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[forgot-password] error:', err instanceof Error ? err.message : err)
    // Still return 200 to avoid leaking failures.
    return res.status(200).json({ ok: true })
  }
}
