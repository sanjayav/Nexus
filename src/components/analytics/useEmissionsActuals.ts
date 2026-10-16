import { useCallback, useEffect, useState } from 'react'
import { analytics as analyticsApi, type AnalyticsData } from '../../lib/api'
import type { QuestionAssignment } from '../../lib/orgStore'
import type { YearValue } from './targetGap'

/**
 * Yearly Scope 1/2/3 actuals for target tracking.
 *
 * Source of truth, in order:
 *   1. /api/analytics `emissionsHistory` (server totals from activity data)
 *   2. approved GRI 305-1/2/3 assignment values for the current reporting
 *      year (fills the current year when the server has no row for it yet)
 *
 * Nothing is invented: years without data stay absent.
 */
export interface ScopeYear { year: number; scope1: number; scope2: number; scope3: number }

export function approvedScopeTotals(assignments: QuestionAssignment[]) {
  const sum = (prefix: string) => assignments
    .filter(a => a.status === 'approved' && a.gri_code?.startsWith(prefix) && a.value != null && Number.isFinite(Number(a.value)))
    .reduce((s, a) => s + Number(a.value), 0)
  return { scope1: sum('305-1'), scope2: sum('305-2'), scope3: sum('305-3') }
}

export function actualsFor(history: ScopeYear[], scopes: Array<1 | 2 | 3>): YearValue[] {
  return history.map(h => ({
    year: h.year,
    value: (scopes.includes(1) ? h.scope1 : 0) + (scopes.includes(2) ? h.scope2 : 0) + (scopes.includes(3) ? h.scope3 : 0),
  })).filter(v => v.value > 0)
}

export default function useEmissionsActuals(assignments: QuestionAssignment[] | null, currentYear = new Date().getFullYear()) {
  const [server, setServer] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    analyticsApi.get()
      .then(d => setServer(d))
      .catch(e => { setError(e); setServer(null) })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const history: ScopeYear[] = (server?.emissionsHistory ?? [])
    .map(h => ({ year: Number(h.year), scope1: Number(h.scope1) || 0, scope2: Number(h.scope2) || 0, scope3: Number(h.scope3) || 0 }))
    .filter(h => Number.isFinite(h.year))

  if (assignments && !history.some(h => h.year === currentYear)) {
    const cur = approvedScopeTotals(assignments)
    if (cur.scope1 + cur.scope2 + cur.scope3 > 0) history.push({ year: currentYear, ...cur })
  }
  history.sort((a, b) => a.year - b.year)

  return { history, facilities: server?.facilityComparison ?? [], loading, error, reload: load }
}
