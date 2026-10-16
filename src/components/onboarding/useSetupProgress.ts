import { useCallback, useEffect, useMemo, useState } from 'react'
import { orgStore } from '../../lib/orgStore'
import useOrgMarket, { CN_FRAMEWORKS } from '../analytics/useOrgMarket'

/**
 * The one guided-setup model. Every step is checked against real workspace
 * state — nothing is ticked because a user clicked "next". The sidebar
 * widget, the My Day checklist card and the /welcome hub all read this.
 *
 * China-market workspaces (market = cn, or a CN framework enabled) get three
 * extra steps: confirm Market & compliance, enable an exchange framework
 * (CN-SSE / CN-CSDS / HKEX ESG) and use MEE emission factors.
 */
export type SetupStepKey =
  | 'org_tree' | 'market' | 'frameworks' | 'factors' | 'users'
  | 'materiality' | 'targets' | 'period' | 'assign' | 'publish'

export interface SetupStep {
  key: SetupStepKey
  route: string
  done: boolean
  /** CN-specific step (shown with an exchange badge). */
  cn?: boolean
  /** Counts shown as context ("3 entities"). */
  count?: number
}

interface Snapshot {
  entities: number
  members: number
  assignments: number
  targets: number
  topics: number
  periods: number
  published: number
  meeFactors: number
}

let cache: { at: number; p: Promise<Snapshot> } | null = null
const TTL = 30_000

function loadSnapshot(force = false, cn = false): Promise<Snapshot> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.p
  const len = (p: Promise<unknown[]>) => p.then(r => (Array.isArray(r) ? r.length : 0)).catch(() => 0)
  const p = Promise.all([
    // The org tree decides wizard vs hub — a failure here must surface as an
    // error, never as an "empty workspace".
    orgStore.listEntities().then(r => (Array.isArray(r) ? r.length : 0)),
    len(orgStore.listMembers()),
    len(orgStore.listAssignments()),
    len(orgStore.listTargets()),
    len(orgStore.listMaterialTopics()),
    len(orgStore.listPeriods()),
    len(orgStore.listPublishedReports()),
    cn
      ? orgStore.listEmissionFactors({ region: 'CN', preferredOnly: true })
        .then(r => (Array.isArray(r) ? r.filter(f => /MEE|生态环境部|GB\/T/i.test(f.source ?? '')).length : 0))
        .catch(() => 0)
      : Promise.resolve(0),
  ]).then(([entities, members, assignments, targets, topics, periods, published, meeFactors]) => ({
    entities, members, assignments, targets, topics, periods, published, meeFactors,
  }))
  cache = { at: Date.now(), p }
  p.catch(() => { if (cache?.p === p) cache = null })
  return p
}

/** Setup owners see the setup checklist (sidebar widget + My Day card). */
export function isSetupOwner(user: { roles?: string[] } | null | undefined): boolean {
  const role = (user?.roles ?? [])[0] ?? ''
  return role === 'platform_admin' || role === 'group_sustainability_officer' || role === 'admin'
}

/** Drop the cached snapshot (after seeding demo data or finishing the wizard). */
export function invalidateSetup() {
  cache = null
}

export default function useSetupProgress(enabled = true) {
  const market = useOrgMarket()
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [nonce, setNonce] = useState(0)
  const cn = market.isCn || market.enabled.some(f => (CN_FRAMEWORKS as readonly string[]).includes(f))

  useEffect(() => {
    if (!enabled || market.loading) return
    let alive = true
    setError(null)
    loadSnapshot(nonce > 0, cn).then(s => { if (alive) setSnap(s) }).catch(e => { if (alive) setError(e) })
    return () => { alive = false }
  }, [enabled, market.loading, cn, nonce])

  const refresh = useCallback(() => { invalidateSetup(); market.refresh(); setNonce(n => n + 1) }, [market])

  const steps: SetupStep[] = useMemo(() => {
    if (!snap) return []
    const enabledCn = market.enabled.some(f => (CN_FRAMEWORKS as readonly string[]).includes(f))
    const list: SetupStep[] = [
      { key: 'org_tree', route: '/onboarding', done: snap.entities >= 2, count: snap.entities },
      ...(cn ? [{ key: 'market' as const, route: '/settings?tab=market', done: !!market.settings?.stored && market.isCn, cn: true }] : []),
      {
        key: 'frameworks',
        route: '/settings?tab=frameworks',
        done: cn ? enabledCn : market.enabled.length >= 1,
        cn,
        count: market.enabled.length,
      },
      ...(cn ? [{ key: 'factors' as const, route: '/data/ef-library', done: snap.meeFactors > 0, cn: true, count: snap.meeFactors }] : []),
      { key: 'users', route: '/admin/users', done: snap.members >= 2, count: snap.members },
      { key: 'materiality', route: '/admin/materiality', done: snap.topics >= 1, count: snap.topics },
      { key: 'targets', route: '/admin/targets', done: snap.targets >= 1, count: snap.targets },
      { key: 'period', route: '/admin/periods', done: snap.periods >= 1, count: snap.periods },
      { key: 'assign', route: '/admin/assignments', done: snap.assignments >= 1, count: snap.assignments },
      { key: 'publish', route: '/reports', done: snap.published >= 1, count: snap.published },
    ]
    return list
  }, [snap, cn, market.enabled, market.settings, market.isCn])

  const completed = steps.filter(s => s.done).length
  const total = steps.length
  return {
    loading: !snap && !error,
    error,
    steps,
    completed,
    total,
    pct: total ? Math.round((completed / total) * 100) : 0,
    next: steps.find(s => !s.done) ?? null,
    isDone: total > 0 && completed === total,
    isEmptyWorkspace: !!snap && snap.entities === 0,
    cn,
    market,
    refresh,
  }
}
