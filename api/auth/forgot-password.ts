import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { cors } from '../_auth.js'
import { sendEmail } from '../_email.js'

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
      SELECT id, name, email, password_hash, is_active
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `) as Array<{ id: string; name: string; email: string; password_hash: string | null; is_active: boolean }>

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

    void sendEmail({
      to: user.email,
      subject: 'Reset your Aeiforo password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f1419">
          <h2 style="color:#0F7B6F;margin:0 0 12px">Reset your password</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your Aeiforo password. Click the button below to choose a new one. The link expires in 30 minutes.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#0F7B6F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Reset password</a>
          </p>
          <p style="font-size:12px;color:#666">If you didn't request this, you can safely ignore this email — your password won't change.</p>
          <p style="font-size:12px;color:#666;word-break:break-all">Direct link: ${resetUrl}</p>
        </div>
      `,
      text: `Reset your Aeiforo password: ${resetUrl}\n\nThe link expires in 30 minutes. If you didn't request this, ignore this email.`,
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
