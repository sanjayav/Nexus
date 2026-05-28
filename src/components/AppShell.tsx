import { useState, createContext, useContext } from 'react'
import Sidebar from '../design-system/components/Sidebar'
import TopBar from '../design-system/components/TopBar'
import PageTransition from './PageTransition'
import CommandPalette, { useCommandPalette, useThemeBoot } from './CommandPalette'

// Expose the command palette opener to any descendant (the TopBar search button uses it).
const PaletteCtx = createContext<() => void>(() => {})
export const useOpenPalette = () => useContext(PaletteCtx)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [open, openPalette, closePalette] = useCommandPalette()
  useThemeBoot()

  return (
    <PaletteCtx.Provider value={openPalette}>
      {/* WCAG 2.4.1 — bypass blocks. Visible only when focused via keyboard. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-[var(--color-brand)] focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <TopBar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto relative focus:outline-none"
          >
            <div className="px-8 py-7 max-w-[1440px] mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
        <CommandPalette open={open} onClose={closePalette} />
      </div>
    </PaletteCtx.Provider>
  )
}
