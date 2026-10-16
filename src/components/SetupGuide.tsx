import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SetupChecklist from './onboarding/SetupChecklist'
import useSetupProgress, { isSetupOwner as canOwnSetup } from './onboarding/useSetupProgress'

/**
 * SetupGuide — the sidebar entry point of the one guided setup
 * (`components/onboarding`). Thin wrapper kept so the Sidebar import does
 * not change; the checklist model, copy and styling live in
 * `useSetupProgress` + `SetupChecklist`.
 *
 * Visible to setup owners only, once they have made some progress and until
 * every step is done (or they dismiss it). A brand-new workspace stays
 * clean — the /welcome wizard and the My Day card carry the first step.
 */
const DISMISS_KEY = 'aeiforo_setup_dismissed'
const HIDDEN_ON = new Set(['/welcome', '/onboarding', '/', '/my-day', '/dashboard'])

export default function SetupGuide({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // Only platform_admin and group_sustainability_officer (and admin) see this
  const isSetupOwner = canOwnSetup(user)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const progress = useSetupProgress(isSetupOwner && !dismissed)

  // /welcome is the full guided setup and My Day carries the setup card —
  // no second copy in the sidebar there.
  if (!isSetupOwner || dismissed || HIDDEN_ON.has(pathname)) return null
  if (progress.loading || progress.error || progress.isDone || progress.completed === 0) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return <SetupChecklist progress={progress} variant={collapsed ? 'collapsed' : 'sidebar'} onDismiss={collapsed ? undefined : dismiss} />
}
