/**
 * Central integration-status hook.
 *
 * Fetches `/api/health` once per session (5-minute cache) and surfaces a
 * boolean flag per optional integration so the UI can gate buttons + show
 * "ask your admin to set XXX_API_KEY" affordances instead of letting users
 * click a button that silently fails server-side.
 *
 * Cache is module-level for instant hydration on second use, and mirrored to
 * sessionStorage so a hard reload doesn't refetch immediately.
 */
import { useEffect, useState } from 'react'

export interface IntegrationStatus {
  email: boolean       // Resend configured
  sso: boolean         // WorkOS configured
  ai: boolean          // Anthropic configured
  realtime: boolean    // Liveblocks configured
  sentry: boolean
  euRegion: boolean
  apacRegion: boolean
  loading: boolean
  error: string | null
}

const CACHE_KEY = 'aeiforo_integration_status_v1'
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 min

interface CacheEntry { status: IntegrationStatus; at: number }
let cached: CacheEntry | null = null

const defaultStatus: IntegrationStatus = {
  email: false,
  sso: false,
  ai: false,
  realtime: false,
  sentry: false,
  euRegion: false,
  apacRegion: false,
  loading: true,
  error: null,
}

function readSessionCache(): IntegrationStatus | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(CACHE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as CacheEntry
    if (Date.now() - parsed.at < CACHE_TTL_MS) return parsed.status
  } catch {
    /* ignore corrupt cache */
  }
  return null
}

export function useIntegrationStatus(): IntegrationStatus {
  const [status, setStatus] = useState<IntegrationStatus>(() => {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.status
    const session = readSessionCache()
    if (session) {
      cached = { status: session, at: Date.now() }
      return session
    }
    return defaultStatus
  })

  useEffect(() => {
    if (!status.loading) return
    let cancelled = false
    fetch('/api/health')
      .then(r => r.json())
      .then((h: { integrations?: Record<string, { configured?: boolean }> }) => {
        if (cancelled) return
        const integ = h.integrations ?? {}
        const next: IntegrationStatus = {
          email: !!integ.email?.configured,
          sso: !!integ.sso?.configured,
          ai: !!integ.ai?.configured,
          realtime: !!integ.realtime?.configured,
          sentry: !!integ.sentry?.configured,
          euRegion: !!integ.euRegion?.configured,
          apacRegion: !!integ.apacRegion?.configured,
          loading: false,
          error: null,
        }
        setStatus(next)
        cached = { status: next, at: Date.now() }
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached))
        } catch {
          /* ignore quota/private-mode errors */
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStatus(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'unreachable' }))
      })
    return () => { cancelled = true }
  }, [status.loading])

  return status
}

/**
 * Test-only: clear the module-level cache so a fresh render fetches again.
 * Not exposed in production usage.
 */
export function __resetIntegrationStatusCache() {
  cached = null
  try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}
