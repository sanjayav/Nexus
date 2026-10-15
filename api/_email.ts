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
