import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, Menu, Plus, Search } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/features/auth/AuthContext'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { useStrings } from '@/lib/i18n'
import { Toaster, toast } from '@/lib/hooks/useToast'
import { useReportingActions } from '@/store/hooks'
import { TEXT_ZOOM, usePreferences } from '@/store/preferences'
import WelcomeDialog from '@/components/help/WelcomeDialog'
import ShortcutsDialog, { useGlobalShortcuts } from '@/components/help/ShortcutsDialog'
import { Button, Dialog, ease, softSpring } from '@/components/ui'
import CommandPalette from './CommandPalette'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationCenter from './NotificationCenter'
import Sidebar from './Sidebar'
import { EXTRA_ROUTES, FULL_BLEED, NAV_GROUPS } from './navigation'
import { shellStrings } from './shell.strings'

export default function AppShell({ children }: { children: ReactNode }) {
  const s = useStrings(shellStrings)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { workspace } = useWorkspace()
  const { resetWorkspace } = useReportingActions()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const { helpOpen, setHelpOpen } = useGlobalShortcuts()
  const zoom = TEXT_ZOOM[usePreferences(p => p.textSize)]

  // Large text scales the whole document (portals included); the shell
  // compensates its viewport height so nothing overflows.
  useEffect(() => {
    document.body.style.zoom = zoom === 1 ? '' : String(zoom)
    return () => {
      document.body.style.zoom = ''
    }
  }, [zoom])

  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const crumbs = useMemo(() => {
    const path = location.pathname
    const extra = EXTRA_ROUTES.find(r => r.match.test(path))
    if (extra) return extra.parent ? [s.nav[extra.parent], s.routes[extra.key]] : [s.routes[extra.key]]
    for (const g of NAV_GROUPS) {
      const item = g.items.find(i => i.match.test(path))
      if (item) return [s.groups[g.key], s.nav[item.key]]
    }
    return [s.home]
  }, [location.pathname, s])

  const paletteItems = useMemo(
    () => [
      ...NAV_GROUPS.flatMap(g => g.items.map(i => ({ label: s.nav[i.key], group: s.groups[g.key], icon: i.icon, path: i.path }))),
      { label: s.create, group: s.home, icon: Plus, path: '/period/create' },
    ],
    [s],
  )

  const shellUser = { name: user?.name ?? 'User', email: user?.email ?? '' }
  const sidebarProps = {
    user: shellUser,
    onSearch: () => setPaletteOpen(true),
    onAdmin: () => navigate('/admin'),
    onLogout: () => {
      logout()
      navigate('/login', { replace: true })
    },
    onResetDemo: () => setResetOpen(true),
    onShortcuts: () => setHelpOpen(true),
  }

  return (
    <div className="flex w-full bg-canvas overflow-hidden" style={{ height: `calc(100dvh / ${zoom})` }}>
      <motion.aside
        className="hidden lg:block shrink-0 border-r border-line bg-[#F1F1ED] overflow-hidden"
        animate={{ width: collapsed ? 64 : 248 }}
        transition={{ duration: 0.22, ease: ease.out }}
        initial={false}
      >
        <Sidebar {...sidebarProps} collapsed={collapsed} mobile={false} onToggleCollapse={() => setCollapsed(c => !c)} />
      </motion.aside>

      <AnimatePresence>
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[284px] max-w-[85vw] bg-[#F1F1ED] shadow-pop"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={softSpring}
            >
              <Sidebar {...sidebarProps} collapsed={false} mobile onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 canvas-depth">
        <header className="h-14 shrink-0 flex items-center gap-2 px-3 sm:px-6 border-b border-line bg-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-canvas/70 z-30">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
            aria-label={s.openMenu}
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-sm">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0 hidden sm:block" />}
                <span
                  className={clsx('truncate', i === crumbs.length - 1 ? 'text-zinc-900 font-medium' : 'text-zinc-500 hidden sm:inline')}
                >
                  {c}
                </span>
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
              aria-label={s.search}
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <LanguageSwitcher />
            <NotificationCenter />
            <Button variant="primary" icon={Plus} className="ml-1" onClick={() => navigate('/period/create')} aria-label={s.create}>
              <span className="hidden sm:inline">{s.create}</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <motion.div
            key={`${workspace.id}:${location.pathname}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: ease.out }}
            className={clsx(
              'min-h-full',
              !FULL_BLEED.test(location.pathname) && 'px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] mx-auto',
            )}
          >
            {children}
          </motion.div>
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        placeholder={s.searchPlaceholder}
        empty={s.noResults}
        items={paletteItems}
        onSelect={path => {
          setPaletteOpen(false)
          navigate(path)
        }}
      />

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={s.resetDemoTitle}
        description={s.resetDemoBody}
        footer={
          <>
            <Button onClick={() => setResetOpen(false)}>{s.cancel}</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetWorkspace()
                setResetOpen(false)
                toast(s.resetDone)
              }}
            >
              {s.resetConfirm}
            </Button>
          </>
        }
      />
      <WelcomeDialog />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toaster />
    </div>
  )
}
