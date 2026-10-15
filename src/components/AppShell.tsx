import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Sidebar from '../design-system/components/Sidebar'
import TopBar from '../design-system/components/TopBar'
import PageTransition from './PageTransition'
import CommandPalette, { useCommandPalette, useThemeBoot, useTrackRecentNav } from './CommandPalette'
import { useIsBelowLg } from '../lib/breakpoints'

// Expose the command palette opener to any descendant (the TopBar search button uses it).
const PaletteCtx = createContext<() => void>(() => {})
export const useOpenPalette = () => useContext(PaletteCtx)

// Mobile drawer context — TopBar's hamburger toggles this; the drawer's nav
// links close it on navigation. Kept separate from the desktop `collapsed`
// state so the two never bleed into each other.
interface MobileNavCtx {
  /** True on < 1024px viewports (the tier where the sidebar lives in a drawer). */
  isMobile: boolean
  /** Drawer visibility. Always false on desktop. */
  open: boolean
  setOpen: (next: boolean) => void
}
const MobileNavContext = createContext<MobileNavCtx>({ isMobile: false, open: false, setOpen: () => {} })
export const useMobileNav = () => useContext(MobileNavContext)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [open, openPalette, closePalette] = useCommandPalette()
  const isBelowLg = useIsBelowLg()
  const location = useLocation()
  useThemeBoot()
  useTrackRecentNav()

  // Close the drawer on any route change so tapping a nav link feels natural.
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // If the viewport grows back to desktop, force-close the drawer so it
  // doesn't leave a stale overlay sitting around.
  useEffect(() => { if (!isBelowLg) setMobileOpen(false) }, [isBelowLg])

  // Body scroll lock while the drawer is open — prevents the page from
  // ghost-scrolling behind the overlay on iOS Safari.
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  // ESC closes the drawer.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <PaletteCtx.Provider value={openPalette}>
      <MobileNavContext.Provider value={{ isMobile: isBelowLg, open: mobileOpen, setOpen: setMobileOpen }}>
        {/* WCAG 2.4.1 — bypass blocks. Visible only when focused via keyboard. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-[var(--color-brand)] focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
          {/* Desktop sidebar — always present at lg+. */}
          {!isBelowLg && (
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          )}

          {/* Mobile drawer — overlay sidebar at < lg. */}
          <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0 relative">
            <TopBar />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 overflow-y-auto relative focus:outline-none"
            >
              <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 max-w-[1440px] mx-auto">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
          <CommandPalette open={open} onClose={closePalette} />
        </div>
      </MobileNavContext.Provider>
    </PaletteCtx.Provider>
  )
}

/**
 * MobileDrawer — slides the same `<Sidebar>` in from the left as an overlay
 * on viewports below lg. Backdrop dims the rest of the page; click backdrop,
 * tap any nav link, or hit ESC to close. Focus is trapped while open so
 * tabbing through the drawer doesn't leak to the page underneath.
 */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)

  // Save the originating focus + focus the first focusable in the drawer on open.
  useEffect(() => {
    if (!open) return
    lastFocusRef.current = (document.activeElement as HTMLElement) ?? null
    requestAnimationFrame(() => {
      const node = drawerRef.current
      if (!node) return
      const first = node.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea',
      )
      first?.focus()
    })
    return () => {
      // Return focus to the trigger when closing — usually the hamburger.
      lastFocusRef.current?.focus?.()
    }
  }, [open])

  // Simple focus trap: cycle Tab/Shift+Tab inside the drawer.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const node = drawerRef.current
    if (!node) return
    const focusables = Array.from(
      node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea',
      ),
    ).filter(el => !el.hasAttribute('disabled'))
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            aria-hidden="true"
          />
          <motion.div
            key="drawer"
            id="mobile-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onKeyDown={onKeyDown}
            className="fixed top-0 left-0 bottom-0 z-50 w-[280px] max-w-[85vw] lg:hidden shadow-2xl"
          >
            {/* Reuse the existing Sidebar component — same nav, same RBAC, same
                badges. Force the expanded variant since the drawer always has
                width to spare. */}
            <Sidebar collapsed={false} onToggle={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
