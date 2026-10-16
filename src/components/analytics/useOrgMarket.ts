import { useCallback, useEffect, useState } from 'react'
import { orgSettings, type OrgMarket, type OrgSettingsResponse } from '../../lib/api'
import { orgStore } from '../../lib/orgStore'

/**
 * useOrgMarket — the organisation's market context for region-aware screens
 * (analytics, materiality, calculators, guided setup).
 *
 *   const m = useOrgMarket()
 *   m.isCn          market === 'cn'
 *   m.cnSse         CN-SSE topic mapping applies (cn-sse enabled OR market cn)
 *   m.enabled       enabled framework ids
 *   m.aiEnabled     AI drafting/narratives allowed for this org
 *
 * Both requests are cached for the session (one fetch shared by every
 * consumer) and fail soft: a missing /org-settings endpoint resolves to the
 * global defaults, never an error screen.
 */
export interface OrgMarketState {
  loading: boolean
  market: OrgMarket
  isCn: boolean
  cnSse: boolean
  enabled: string[]
  settings: OrgSettingsResponse | null
  aiEnabled: boolean
  aiDisabledReason: 'deployment' | 'organisation' | null
  refresh: () => void
}

interface Snapshot {
  settings: OrgSettingsResponse | null
  enabled: string[]
}

let cache: Promise<Snapshot> | null = null

function load(force = false): Promise<Snapshot> {
  if (!cache || force) {
    cache = Promise.all([
      orgSettings.get().catch(() => null),
      orgStore.listEnabledFrameworks().catch(() => [] as string[]),
    ]).then(([settings, enabled]) => ({ settings, enabled: Array.isArray(enabled) ? enabled : [] }))
  }
  return cache
}

/** Drop the cached snapshot (call after saving market settings or enabling frameworks). */
export function invalidateOrgMarket() {
  cache = null
}

export const CN_FRAMEWORKS = ['cn-sse', 'cn-csds', 'hkex-esg'] as const

export default function useOrgMarket(): OrgMarketState {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    load(tick > 0).then(s => { if (alive) setSnap(s) })
    return () => { alive = false }
  }, [tick])

  const refresh = useCallback(() => setTick(n => n + 1), [])
  const market: OrgMarket = snap?.settings?.settings?.market === 'cn' ? 'cn' : 'global'
  const enabled = snap?.enabled ?? []
  const ai = snap?.settings?.ai
  return {
    loading: snap == null,
    market,
    isCn: market === 'cn',
    cnSse: market === 'cn' || enabled.includes('cn-sse'),
    enabled,
    settings: snap?.settings ?? null,
    // Unknown (settings unavailable) → treat as enabled; the AI endpoint itself
    // reports "not configured" truthfully.
    aiEnabled: ai ? ai.enabled : true,
    aiDisabledReason: ai?.disabled_reason ?? null,
    refresh,
  }
}
