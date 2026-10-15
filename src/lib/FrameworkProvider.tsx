import { ReactNode, useState, useCallback, useEffect, useMemo } from 'react'
import {
  FrameworkContext, FRAMEWORKS, DEFAULT_FRAMEWORK_ID, getFramework,
} from './frameworks'
import { useAuth } from '../auth/AuthContext'
import { orgStore } from './orgStore'

/**
 * Live framework state — no localStorage.
 *   - `enabled`  → reads from org_framework_enablement (tenant-wide, admin-controlled)
 *   - `active`   → reads from users.preferred_framework_id (per user, persists across devices)
 *
 * `setActive` and `setEnabled` both write back to Neon. The UI never caches
 * framework choice locally, so switching devices or logging in on a new
 * browser restores the exact same selection.
 */
export function FrameworkProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [enabled, setEnabledState] = useState<string[]>([])

  // Active framework — sourced from the user record.
  const active = useMemo(() => {
    const preferred = user?.preferredFrameworkId
    const fromCatalog = preferred ? getFramework(preferred) : undefined
    if (fromCatalog && fromCatalog.status === 'active') return fromCatalog
    return getFramework(DEFAULT_FRAMEWORK_ID)!
  }, [user?.preferredFrameworkId])

  // On login, fetch the org's enabled-framework list.
  useEffect(() => {
    if (!isAuthenticated) { setEnabledState([]); return }
    let cancelled = false
    ;(async () => {
      try {
        const ids = await orgStore.listEnabledFrameworks()
        if (!cancelled) {
          // Safety net: always include the active framework id so the selector never ends up empty.
          const merged = ids.length > 0 ? ids : [DEFAULT_FRAMEWORK_ID]
          setEnabledState(merged)
        }
      } catch {
        if (!cancelled) setEnabledState([DEFAULT_FRAMEWORK_ID])
      }
    })()
    return () => { cancelled = true }
  }, [isAuthenticated])

  const setActive = useCallback(async (id: string) => {
    const fw = getFramework(id)
    if (!fw || fw.status !== 'active') return
    try {
      await orgStore.setPreferredFramework(id)
      await refreshUser() // pulls fresh user record including the new preferred_framework_id
    } catch { /* ignore — selector will revert on next render */ }
  }, [refreshUser])

  const setEnabled = useCallback(async (ids: string[]) => {
    // Diff against current state → emit enable/disable calls accordingly.
    const current = new Set(enabled)
    const next = new Set(ids)
    const toEnable = [...next].filter(x => !current.has(x))
    const toDisable = [...current].filter(x => !next.has(x))
    try {
      await Promise.all([
        ...toEnable.map(id => orgStore.enableFramework(id)),
        ...toDisable.map(id => orgStore.disableFramework(id)),
      ])
      setEnabledState(ids)
    } catch { /* ignore */ }
  }, [enabled])

  const value = useMemo(() => ({
    active,
    setActive: (id: string) => { void setActive(id) },
    enabled,
    setEnabled: (ids: string[]) => { void setEnabled(ids) },
  }), [active, enabled, setActive, setEnabled])

  return <FrameworkContext.Provider value={value}>{children}</FrameworkContext.Provider>
}

// Keep the full catalog export path consistent
export { FRAMEWORKS }
