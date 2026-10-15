import { getDb } from './_db.js'
import { sendEmail } from './_email.js'

// Single entry point: writes a notification row AND fires an email.
// Existing column names (recipient_user_id, recipient_email, kind, subject, body,
// route, related_assignment_id) are preserved; email_sent_at / email_error are
// additive columns ensured in setup.ts.

export interface NotifyArgs {
  orgId: string
  userId?: string | null
  toEmail: string
  kind: string
  subject: string
  body?: string
  route?: string                     // relative path e.g. /my-tasks
  relatedAssignmentId?: string | null
}

export async function notify(args: NotifyArgs): Promise<void> {
  if (!args.toEmail) return
  const sql = getDb()
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173'
  const fullLink = args.route ? `${baseUrl}${args.route}` : baseUrl

  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; padding: 24px; background: #f7faf9;">
      <div style="background: white; border-radius: 12px; padding: 28px; border: 1px solid #e6f0ee;">
        <div style="font-size: 18px; font-weight: 600; color: #064e3b; margin-bottom: 8px;">${escapeHtml(args.subject)}</div>
        ${args.body ? `<div style="font-size: 14px; color: #475569; margin-bottom: 20px; line-height: 1.5;">${escapeHtml(args.body)}</div>` : ''}
        <a href="${fullLink}" style="display: inline-block; padding: 10px 18px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Open Nexus</a>
      </div>
      <div style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 16px;">Nexus — Sustainability Intelligence Platform · by Aeiforo</div>
    </div>
  `

  const result = await sendEmail({
    to: args.toEmail,
    subject: args.subject,
    html,
    text: `${args.subject}${args.body ? '\n\n' + args.body : ''}\n\n${fullLink}`,
  })

  try {
    await sql`
      INSERT INTO notifications
        (org_id, recipient_user_id, recipient_email, kind, subject, body, route,
         related_assignment_id, email_sent_at, email_error)
      VALUES
        (${args.orgId}, ${args.userId ?? null}, ${args.toEmail.toLowerCase()},
         ${args.kind}, ${args.subject}, ${args.body ?? null}, ${args.route ?? null},
         ${args.relatedAssignmentId ?? null},
         ${result.ok ? new Date().toISOString() : null}, ${result.error ?? null})
    `
  } catch (err: unknown) {
    // Don't crash the caller — the email side already happened (or failed loudly).
    // eslint-disable-next-line no-console
    console.error('[notify] insert failed:', err instanceof Error ? err.message : err)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
}
