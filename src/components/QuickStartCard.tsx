import { useState } from 'react'
import SetupChecklist from './onboarding/SetupChecklist'
import useSetupProgress from './onboarding/useSetupProgress'

/**
 * QuickStartCard — thin wrapper over the one guided setup
 * (`components/onboarding`). It used to be a separate three-step card with
 * its own hard-coded routes; it now renders the real-state checklist card
 * and disappears once every step is done or the user dismisses it.
 *
 * Prefer `<SetupChecklist progress={useSetupProgress()} />` in new code.
 */
const STORAGE_KEY = 'aeiforo_quickstart_dismissed_v1'

export default function QuickStartCard() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })
  const progress = useSetupProgress(!dismissed)
  if (dismissed || progress.error || progress.isDone) return null

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }
  return <SetupChecklist progress={progress} variant="card" onDismiss={dismiss} />
}
