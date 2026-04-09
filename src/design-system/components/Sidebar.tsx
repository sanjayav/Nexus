import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  ArrowUpFromLine,
  CheckSquare,
  FileText,
  BarChart3,
  Building2,
  Users,
  BookOpen,
  Atom,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { canAccessRoute } from '../../lib/rbac'

const navGroups = [
  {
    label: 'Core Modules',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/data', label: 'Data collection', icon: ArrowUpFromLine },
      { path: '/calculators', label: 'Calculators', icon: Calculator },
      { path: '/questionnaires', label: 'Reporting frameworks', icon: ClipboardList },
      { path: '/workflow', label: 'Workflow', icon: CheckSquare },
      { path: '/reports', label: 'Reports', icon: FileText },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { path: '/admin/org', label: 'Structure', icon: Building2 },
      { path: '/admin/users', label: 'Users & roles', icon: Users },
    ],
  },
  {
    label: 'Reference Data',
    items: [
      { path: '/admin/ef-library', label: 'EF library', icon: BookOpen },
      { path: '/admin/gwp', label: 'GWP values', icon: Atom },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/admin/audit', label: 'Audit trail', icon: Shield },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const roleLabels: Record<string, string> = {
  PA: 'Platform Admin',
  TL: 'Team Lead',
  FM: 'Facility Mgr',
  SO: 'Source Owner',
  AUD: 'Auditor',
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { user, permissions } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'U'
  const displayRole = user?.roleNames?.[0] ?? roleLabels[user?.role ?? ''] ?? user?.role

  return (
    <aside
      className={`
        ${collapsed ? 'w-[68px]' : 'w-[252px]'} flex-shrink-0 flex flex-col h-screen sticky top-0
        bg-[var(--bg-inverse)] text-white
        transition-all duration-300 ease-[var(--ease-out-expo)]
        border-r border-white/[0.06]
      `}
    >
      {/* ── Logo ── */}
      <div className={`h-[64px] flex items-center ${collapsed ? 'justify-center px-0' : 'px-5'} flex-shrink-0`}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-900/30">
              <Leaf className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="leading-none">
              <span className="text-[15px] font-display font-bold tracking-[-0.02em] block text-white">
                Aeiforo
              </span>
              <span className="text-[10px] text-white/35 font-medium mt-0.5 block">
                Carbon & ESG
              </span>
            </div>
          </div>
        ) : (
          <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[var(--accent-teal)] to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Leaf className="w-[18px] h-[18px] text-white" />
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'} py-4 space-y-6`}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 px-3 mb-1.5 select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-[2px]">
              {group.items.filter(item => canAccessRoute(permissions, item.path)).map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/')
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`
                      group relative flex items-center gap-3 rounded-lg text-[13px] font-medium
                      transition-all duration-200
                      ${collapsed ? 'justify-center h-10 w-full' : 'px-3 h-9'}
                      ${isActive
                        ? 'bg-white/[0.1] text-white nav-active-glow'
                        : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--accent-teal)] animate-slide-in" />
                    )}
                    <Icon className={`w-[17px] h-[17px] flex-shrink-0 transition-colors ${isActive ? 'text-[var(--accent-teal)]' : 'group-hover:text-white/70'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom area ── */}
      <div className={`flex-shrink-0 border-t border-white/[0.06] ${collapsed ? 'px-2' : 'px-3'} py-3 space-y-2`}>
        {/* Help */}
        {!collapsed && (
          <button className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-medium text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-all cursor-pointer">
            <HelpCircle className="w-[17px] h-[17px] flex-shrink-0" />
            <span>Help & Docs</span>
          </button>
        )}

        {/* User card */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg bg-white/[0.04]`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-teal)] to-emerald-500 flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 shadow-sm">
            {firstName[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/80 truncate">{user?.name}</p>
              <p className="text-[10px] text-white/30 truncate">{displayRole}</p>
            </div>
          )}
        </div>

        {/* Collapse */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center h-8 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all cursor-pointer"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>
    </aside>
  )
}
