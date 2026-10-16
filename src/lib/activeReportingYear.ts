import { useCallback, useEffect, useState } from 'react'

/**
 * The caller org's open reporting year — the `reporting_year_id` every
 * data_value write must carry. Resolved server-side by
 * GET /api/reporting-year/active (read-only; never creates a year).
 *
 * Replaces the old hard-coded ACTIVE_REPORTING_YEAR_ID (the demo org's
 * FY2026 year), which made every tenant write into the demo org's year.
 *
 * NOTE: lives outside src/lib/api.ts on purpose (that module is owned by a
 * parallel workstream). Fold it into `nexus` there when convenient.
 */
export interface ActiveReportingYear {
  id: string
  year: number
  status: string
}

export type ActiveReportingYearState =
  | { kind: 'loading' }
  | { kind: 'ready'; year: ActiveReportingYear }
  /** The org has no open reporting year — show the Reporting Periods empty state. */
  | { kind: 'none'; message: string }
  | { kind: 'error'; error: string }

type Settled = Exclude<ActiveReportingYearState, { kind: 'loading' }>

// One in-flight / settled lookup per session token, so moving between
// questions doesn't refetch. `reload()` drops it.
let cache: { token: string | null; promise: Promise<Settled> } | null = null

function readToken(): string | null {
  try { return localStorage.getItem('aeiforo_token') } catch { return null }
}

async function request(token: string | null): Promise<Settled> {
  try {
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/reporting-year/active', { headers })
    const body = await res.json().catch(() => ({})) as Partial<ActiveReportingYear> & { error?: string; code?: string }
    if (res.ok && typeof body.id === 'string') {
      return { kind: 'ready', year: { id: body.id, year: Number(body.year), status: String(body.status ?? '') } }
    }
    if (res.status === 404) return { kind: 'none', message: body.error ?? '' }
    return { kind: 'error', error: body.error ?? `API error ${res.status}` }
  } catch (err: unknown) {
    return { kind: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}

export function fetchActiveReportingYear(force = false): Promise<Settled> {
  const token = readToken()
  if (force || !cache || cache.token !== token) {
    const promise = request(token)
    cache = { token, promise }
    // Only pin a found year. A failed lookup — or "no year yet", which ends as
    // soon as an admin creates a reporting period — is re-asked next time.
    void promise.then(r => { if (r.kind !== 'ready' && cache?.promise === promise) cache = null })
  }
  return cache.promise
}

export function useActiveReportingYear(): ActiveReportingYearState & { reload: () => void } {
  const [state, setState] = useState<ActiveReportingYearState>({ kind: 'loading' })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    void fetchActiveReportingYear(nonce > 0).then(r => { if (!cancelled) setState(r) })
    return () => { cancelled = true }
  }, [nonce])

  const reload = useCallback(() => setNonce(n => n + 1), [])
  return { ...state, reload }
}
