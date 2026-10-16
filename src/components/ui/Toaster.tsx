import { Toaster as Sonner } from 'sonner'
import { useEffect, useState } from 'react'
import { ConfirmHost } from './ConfirmSheet'
import { useIsBelowLg } from '../../lib/breakpoints'

/**
 * AppToaster — mounted ONCE (App.tsx). Hosts the sonner toast stack, styled
 * with Nexus tokens (`.nx-toast` in index.css), and the imperative
 * <ConfirmHost/> behind `useConfirm()`.
 *
 * Fire toasts through `components/ui/toast` (`notify.success(…, { undo })`)
 * or the older `lib/toast` helpers — both land here.
 */
export default function AppToaster() {
  const mode = useResolvedMode()
  const isMobile = useIsBelowLg()
  return (
    <>
      <Sonner
        theme={mode}
        position={isMobile ? 'top-center' : 'bottom-right'}
        closeButton
        visibleToasts={4}
        gap={10}
        offset={20}
        toastOptions={{ className: 'nx-toast', duration: 5000 }}
      />
      <ConfirmHost />
    </>
  )
}

/** Reads the resolved colour mode from <html data-color-mode> (no provider needed). */
function useResolvedMode(): 'light' | 'dark' {
  const read = () =>
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-color-mode') === 'dark' ? 'dark' : 'light') as
      | 'light'
      | 'dark'
  const [mode, setMode] = useState(read)
  useEffect(() => {
    const obs = new MutationObserver(() => setMode(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] })
    return () => obs.disconnect()
  }, [])
  return mode
}
