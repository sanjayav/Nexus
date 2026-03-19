import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  FolderOpen,
  Settings,
  Package,
  FileText,
  ClipboardList,
  TrendingUp,
  ShieldCheck,
  Link2,
  Clock,
  Target,
  Users,
  GitBranch,
  Activity,
  Plug,
  KeyRound,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  // WORKSPACE
  { path: '/executive', label: 'Home', icon: LayoutDashboard, group: 'main' },
  { path: '/workbench', label: 'Workbench', icon: ClipboardList, group: 'main' },
  { path: '/frameworks', label: 'Frameworks', icon: Package, group: 'main' },

  // INSIGHTS
  { path: '/evidence', label: 'Evidence Vault', icon: FolderOpen, group: 'workspace' },
  { path: '/verify', label: 'Verification', icon: ShieldCheck, group: 'workspace' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, group: 'workspace' },
  { path: '/analytics/gaps', label: 'Gap Analysis', icon: Activity, group: 'workspace' },
  { path: '/analytics/benchmark', label: 'Benchmark Lab', icon: TrendingUp, group: 'workspace' },

  // CHAIN
  { path: '/events', label: 'Anchors & Events', icon: Link2, group: 'chain' },
  { path: '/timeline', label: 'Integrity Timeline', icon: Clock, group: 'chain' },
  { path: '/ghg', label: 'GHG Targets', icon: Target, group: 'chain' },
  { path: '/roles', label: 'Roles & DIDs', icon: Users, group: 'chain' },

  // PUBLISH
  { path: '/publish', label: 'Publish', icon: FileText, group: 'publish' },

  // ADMIN
  { path: '/admin', label: 'Admin', icon: Settings, group: 'admin' },
  { path: '/admin/organization', label: 'Organization', icon: GitBranch, group: 'admin' },
  { path: '/iam', label: 'Access & Roles', icon: KeyRound, group: 'admin' },
  { path: '/connectors', label: 'Data Connectors', icon: Plug, group: 'admin' },
]

const groupLabels = {
  main: 'Workspace',
  workspace: 'Insights',
  chain: 'Blockchain',
  publish: 'Report',
  admin: 'Administration',
} as const

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/frameworks') {
      return (
        location.pathname === '/frameworks' ||
        location.pathname === '/modules' ||
        location.pathname.startsWith('/modules/')
      )
    }
    // exact match for /analytics so /analytics/gaps and /analytics/benchmark don't double-highlight
    if (path === '/analytics') {
      return location.pathname === '/analytics'
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const groupedItems = Object.entries(
    navItems.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = []
      acc[item.group].push(item)
      return acc
    }, {} as Record<string, typeof navItems>)
  )

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-dark-surface border-r border-dark-border overflow-y-auto flex flex-col">
      {/* Branding */}
      <div className="p-6 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-900 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20 border border-emerald-500/20">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-100 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
              Nexus
            </h1>
            <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">Enterprise</span>
          </div>
        </div>

        <div className="space-y-1 pl-1">
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Powered by</span>
            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">aeiforo</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Partnered by</span>
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">SmartEsg</span>
          </div>
        </div>

        <div className="h-px w-full bg-dark-border mt-6"></div>
      </div>

      <nav className="p-4 pt-2 flex-1">
        {groupedItems.map(([group, items]) => (
          <div key={group} className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
              {groupLabels[group as keyof typeof groupLabels]}
            </h3>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                        active
                          ? 'bg-accent/10 text-accent border border-accent/30'
                          : 'text-gray-300 hover:bg-dark-bg hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom version indicator */}
      <div className="p-4 flex-shrink-0 border-t border-dark-border">
        <p className="text-[10px] text-gray-600 text-center tracking-wider uppercase">v1.8 · Sprint 0</p>
      </div>
    </aside>
  )
}
