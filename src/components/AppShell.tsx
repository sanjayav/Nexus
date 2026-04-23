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
      <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <TopBar />
          <main className="flex-1 overflow-y-auto relative">
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
