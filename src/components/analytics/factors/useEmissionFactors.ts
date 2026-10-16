import { useCallback, useEffect, useState } from 'react'
import { orgStore, type PreferredEmissionFactor } from '../../../lib/orgStore'

export interface EmissionFactorQuery {
  scope?: 1 | 2 | 3
  category?: string
  region?: string
  source?: string
  preferredOnly?: boolean
}

export interface EmissionFactorsState {
  rows: PreferredEmissionFactor[]
  loading: boolean
  error: unknown
  retry: () => void
}

/**
 * useEmissionFactors — `orgStore.listEmissionFactors` with a per-query
 * session cache (several panels on one screen share one request). Failures
 * are not cached and surface as `error` — callers render a StateBoundary
 * error with retry, never a placeholder value.
 */
const cache = new Map<string, Promise<PreferredEmissionFactor[]>>()

function keyOf(q: EmissionFactorQuery): string {
  return JSON.stringify([q.scope ?? null, q.category ?? null, q.region ?? null, q.source ?? null, !!q.preferredOnly])
}

function load(q: EmissionFactorQuery, force: boolean): Promise<PreferredEmissionFactor[]> {
  const k = keyOf(q)
  let p = force ? undefined : cache.get(k)
  if (!p) {
    p = orgStore.listEmissionFactors(q).then(r => (Array.isArray(r) ? r : []))
    cache.set(k, p)
    p.catch(() => cache.delete(k))
  }
  return p
}

/** Drop cached factor lists (after adding or removing a factor). */
export function invalidateEmissionFactors() {
  cache.clear()
}

export default function useEmissionFactors(q: EmissionFactorQuery, enabled = true): EmissionFactorsState {
  const k = keyOf(q)
  const [state, setState] = useState<{ key: string; rows: PreferredEmissionFactor[]; error: unknown; loading: boolean }>({
    key: k, rows: [], error: null, loading: enabled,
  })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    setState(s => ({ key: k, rows: s.key === k ? s.rows : [], error: null, loading: true }))
    load(q, nonce > 0)
      .then(rows => { if (alive) setState({ key: k, rows, error: null, loading: false }) })
      .catch(error => { if (alive) setState({ key: k, rows: [], error: error ?? new Error('Failed'), loading: false }) })
    return () => { alive = false }
    // `q` is captured through its serialised key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, nonce, enabled])

  const retry = useCallback(() => setNonce(n => n + 1), [])
  return { rows: state.rows, loading: state.loading, error: state.error, retry }
}
