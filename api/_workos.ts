import { WorkOS } from '@workos-inc/node'

/**
 * Lazy-initialised WorkOS client. Returns null when WORKOS_API_KEY is unset
 * so SSO endpoints can respond with a graceful 503 rather than crashing.
 *
 * Required env vars (set in Vercel project settings for both Production + Preview):
 *   - WORKOS_API_KEY      Server-side API key from WorkOS dashboard
 *   - WORKOS_CLIENT_ID    OAuth client id (a.k.a. "WorkOS Project ID")
 *   - WORKOS_REDIRECT_URI Optional override; otherwise derived from APP_BASE_URL
 *   - APP_BASE_URL        Public origin, e.g. https://demo.aeiforo.com
 */
let client: WorkOS | null = null

export function getWorkOS(): WorkOS | null {
  const key = process.env.WORKOS_API_KEY
  if (!key) return null
  if (!client) client = new WorkOS(key)
  return client
}

export function getRedirectUri(): string {
  return (
    process.env.WORKOS_REDIRECT_URI
    ?? `${process.env.APP_BASE_URL ?? 'http://localhost:5173'}/api/auth/sso/callback`
  )
}

export function getClientId(): string | null {
  return process.env.WORKOS_CLIENT_ID ?? null
}

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:5173'
}

/**
 * Shared response when SSO env vars are missing. Keeps endpoint code tidy.
 */
export function ssoUnavailable(): { status: 503; body: { error: string } } {
  return {
    status: 503,
    body: { error: 'SSO is not configured on this deployment. Set WORKOS_API_KEY and WORKOS_CLIENT_ID.' },
  }
}
