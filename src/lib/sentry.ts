import * as Sentry from '@sentry/react'

/**
 * Sentry is fully opt-in. When `VITE_SENTRY_DSN` is unset (most local
 * builds, demo deploys, previews) every export here is a no-op — no init,
 * no network traffic, no console noise. Set the env var in the hosting
 * provider to start ingesting events.
 */
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

let initialised = false

export function initSentry() {
  if (!dsn) return
  if (initialised) return
  initialised = true

  // Session replay is best-effort. If the installed @sentry/react version
  // doesn't ship `replayIntegration` (older majors) we just skip it rather
  // than crashing the app — console.warn so the operator sees why their
  // replay panel is empty.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sentryAny = Sentry as unknown as { replayIntegration?: (opts: unknown) => unknown }
  const integrations: unknown[] = []
  if (typeof sentryAny.replayIntegration === 'function') {
    try {
      integrations.push(sentryAny.replayIntegration({
        // Mask all text + media by default — sustainability data is sensitive.
        maskAllText: true,
        blockAllMedia: true,
      }))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[sentry] replayIntegration() threw — replay disabled:', err)
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[sentry] replayIntegration not available on installed SDK — replay disabled')
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      // 1% baseline, 100% on error: cheap insight into normal sessions but
      // a full replay whenever something blows up. Tune via env vars later
      // if we want different prod/staging rates without a redeploy.
      replaysSessionSampleRate: 0.01,
      replaysOnErrorSampleRate: 1.0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      integrations: integrations as any,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sentry] init failed — telemetry disabled:', err)
  }
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!dsn) return
  Sentry.captureException(err, { extra: context })
}

/**
 * Attach the authenticated user to all subsequent events. Called from
 * AuthContext after login / refresh. Pass `null` to clear on logout.
 *
 * No-op when DSN is unset — safe to call unconditionally.
 */
export function setUserContext(user: { id?: string; email: string } | null) {
  if (!dsn) return
  try {
    if (user === null) {
      Sentry.setUser(null)
    } else {
      Sentry.setUser({ id: user.id, email: user.email })
    }
  } catch {
    // never let telemetry plumbing break auth
  }
}
