import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Box,
  ChevronsUpDown,
  Keyboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useStrings } from '@/lib/i18n'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { useL10n, useMockData, useWorkspace } from '@/features/workspace/WorkspaceContext'
import { REGIONS, WORKSPACES } from '@/config/regions'
import { usePipeline, useWorkspaceSlice } from '@/store/hooks'
import { ease, spring } from '@/components/ui'
import { helpStrings } from '@/components/help/help.strings'
import { usePreferences, type Persona } from '@/store/preferences'
import { NAV_GROUPS } from './navigation'
import { shellStrings } from './shell.strings'

type SidebarProps = {
  collapsed: boolean
  mobile: boolean
  user: { name: string; email: string }
  onSearch: () => void
  onClose?: () => void
  onToggleCollapse?: () => void
  onAdmin: () => void
  onLogout: () => void
  onResetDemo: () => void
  onShortcuts: () => void
}

export default function Sidebar({
  collapsed,
  mobile,
  user,
  onSearch,
  onClose,
  onToggleCollapse,
  onAdmin,
  onLogout,
  onResetDemo,
  onShortcuts,
}: SidebarProps) {
  const s = useStrings(shellStrings)
  const location = useLocation()
  const seed = useMockData()
  const { tasksDone } = useWorkspaceSlice()
  const pipeline = usePipeline()
  const openTasks = seed.moduleTasks.filter(t => !tasksDone.includes(t.id)).length + pipeline.changes_requested + pipeline.submitted
  const isCollapsed = collapsed && !mobile
  // Separate indicator ids so the desktop pill never animates into the mobile drawer.
  const indicatorId = mobile ? 'nav-active-m' : 'nav-active'

  return (
    <div className="flex flex-col h-full">
      <div className={clsx('flex items-center h-14 shrink-0', isCollapsed ? 'justify-center px-2' : 'px-3 gap-2')}>
        <OrgSwitcher collapsed={isCollapsed} />
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
            aria-label={s.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={clsx('pb-2', isCollapsed ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={onSearch}
          className={clsx(
            'w-full h-9 flex items-center gap-2 rounded-[10px] border border-line bg-white text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 transition-colors shadow-card',
            isCollapsed ? 'justify-center' : 'px-2.5',
          )}
          aria-label={s.search}
        >
          <Search className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="text-[13px] flex-1 text-left">{s.search}</span>
              <kbd className="hidden lg:inline text-[10px] font-mono font-medium text-zinc-500 border border-line rounded px-1 py-px">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav className={clsx('flex-1 overflow-y-auto scrollbar-none pb-4', isCollapsed ? 'px-2' : 'px-3')}>
        {NAV_GROUPS.map(group => (
          <div key={group.key} className="mt-4 first:mt-2">
            {isCollapsed ? (
              <div className="mx-auto mb-2 w-4 h-px bg-line" />
            ) : (
              <div className="px-2.5 mb-1 text-[11px] font-medium text-zinc-500">{s.groups[group.key]}</div>
            )}
            <ul className="space-y-px">
              {group.items.map(item => {
                const active = item.match.test(location.pathname)
                const Icon = item.icon
                const label = s.nav[item.key]
                const badge = item.badge === 'tasks' && openTasks > 0 ? openTasks : undefined
                return (
                  <li key={item.key}>
                    <Link
                      to={item.path}
                      title={isCollapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'group relative flex items-center h-9 rounded-lg text-[13.5px] transition-colors',
                        isCollapsed ? 'justify-center' : 'gap-2.5 px-2.5',
                        active ? 'text-zinc-900 font-medium' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/[0.04]',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={indicatorId}
                          transition={spring}
                          className="absolute inset-0 rounded-lg bg-white shadow-card ring-1 ring-zinc-900/[0.06]"
                        />
                      )}
                      <Icon
                        className={clsx(
                          'relative w-[18px] h-[18px] shrink-0',
                          active ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600',
                        )}
                        strokeWidth={active ? 2.1 : 1.8}
                      />
                      {!isCollapsed && <span className="relative truncate">{label}</span>}
                      {badge !== undefined &&
                        (isCollapsed ? (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
                        ) : (
                          <span className="relative ml-auto text-[11px] font-medium tabular min-w-[20px] h-5 px-1.5 rounded-md bg-zinc-900/[0.06] text-zinc-600 flex items-center justify-center">
                            {badge}
                          </span>
                        ))}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={clsx('border-t border-line shrink-0', isCollapsed ? 'p-2 space-y-1' : 'p-3')}>
        <UserMenu
          collapsed={isCollapsed}
          user={user}
          onAdmin={onAdmin}
          onLogout={onLogout}
          onResetDemo={onResetDemo}
          onShortcuts={onShortcuts}
        />
        {!mobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={clsx(
              'flex items-center gap-2 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-900/[0.04] transition-colors text-xs',
              isCollapsed ? 'w-full justify-center' : 'mt-1 w-full px-2.5',
            )}
            aria-label={isCollapsed ? s.expand : s.collapse}
            title={isCollapsed ? s.expand : s.collapse}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" /> {s.collapse}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

const popover = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: { duration: 0.15, ease: ease.out },
}

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const s = useStrings(shellStrings)
  const [open, setOpen] = useState(false)
  const { workspace, setWorkspace } = useWorkspace()
  const t = useL10n()
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))

  return (
    <div ref={ref} className={clsx('relative', !collapsed && 'flex-1 min-w-0')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={s.orgLabel}
        aria-expanded={open}
        className={clsx(
          'flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/[0.04] transition-colors',
          collapsed ? 'p-1.5' : 'w-full p-1.5 pr-2',
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 shadow-sm">
          <Box className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 text-left leading-tight">
              <div className="text-[13px] font-semibold text-zinc-900">
                Nexus<span className="text-brand-500">.</span>
              </div>
              <div className="text-[11px] text-zinc-500 truncate">{t(workspace.name)}</div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 ml-auto shrink-0" />
          </>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            {...popover}
            className="absolute left-0 top-full mt-1 w-64 p-1 bg-white border border-line rounded-xl shadow-pop z-50 origin-top-left"
          >
            <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-zinc-400">{s.orgLabel}</div>
            {WORKSPACES.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWorkspace(w.id)
                  setOpen(false)
                }}
                className={clsx(
                  'w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg',
                  w.id === workspace.id ? 'bg-zinc-100' : 'hover:bg-zinc-50',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className={clsx('text-sm truncate', w.id === workspace.id ? 'text-zinc-900 font-medium' : 'text-zinc-700')}>
                    {t(w.name)}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">{t(w.listing)}</div>
                </div>
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white border border-line text-zinc-600">
                  {t(REGIONS[w.region].label)}
                </span>
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <button type="button" className="w-full flex items-center gap-2 px-2.5 h-9 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50">
              <Plus className="w-4 h-4" /> {s.addOrg}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function UserMenu({
  collapsed,
  user,
  onAdmin,
  onLogout,
  onResetDemo,
  onShortcuts,
}: {
  collapsed: boolean
  user: { name: string; email: string }
  onAdmin: () => void
  onLogout: () => void
  onResetDemo: () => void
  onShortcuts: () => void
}) {
  const s = useStrings(shellStrings)
  const h = useStrings(helpStrings)
  const { textSize, setTextSize, persona, setPersona } = usePreferences()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, () => setOpen(false))
  const initial = (user.name[0] ?? user.email[0] ?? 'U').toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-2.5 rounded-lg hover:bg-zinc-900/[0.04] transition-colors',
          collapsed ? 'justify-center p-1.5' : 'p-1.5',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 text-xs font-semibold">
          {initial}
        </div>
        {!collapsed && (
          <div className="min-w-0 text-left leading-tight flex-1">
            <div className="text-[13px] font-medium text-zinc-900 truncate">{user.name}</div>
            <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
          </div>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            {...popover}
            className="absolute bottom-full left-0 mb-1.5 w-64 p-1 bg-white border border-line rounded-xl shadow-pop z-50 origin-bottom-left"
          >
            <div className="px-2.5 py-2 border-b border-line mb-1">
              <div className="text-[13px] font-medium text-zinc-900 truncate">{user.name}</div>
              <div className="text-xs text-zinc-500 truncate">{user.email}</div>
            </div>
            <div className="px-2.5 pt-1 pb-2 border-b border-line mb-1 space-y-2">
              <div className="text-[11px] font-medium text-zinc-400">{h.display.title}</div>
              <Segmented
                value={textSize}
                onChange={setTextSize}
                options={[
                  { value: 'standard', label: h.display.standard },
                  { value: 'large', label: h.display.large },
                ]}
              />
              <div className="text-[11px] font-medium text-zinc-400 pt-1">{h.display.role}</div>
              <Segmented
                value={persona ?? 'preparer'}
                onChange={(v: Persona) => setPersona(v)}
                options={(['executive', 'preparer', 'reviewer'] as const).map(p => ({ value: p, label: h.display.personas[p] }))}
              />
            </div>
            <MenuItem icon={Settings} onClick={() => (setOpen(false), onAdmin())}>
              {s.adminSettings}
            </MenuItem>
            <MenuItem icon={Keyboard} onClick={() => (setOpen(false), onShortcuts())}>
              {h.shortcuts.title}
            </MenuItem>
            <MenuItem icon={RotateCcw} onClick={() => (setOpen(false), onResetDemo())}>
              {s.resetDemo}
            </MenuItem>
            <MenuItem icon={LogOut} onClick={onLogout} danger>
              {s.logout}
            </MenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: LucideIcon
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm transition-colors',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-zinc-700 hover:bg-zinc-50',
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" className="flex gap-0.5 p-0.5 rounded-lg bg-zinc-900/[0.05]">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 h-7 px-1.5 rounded-md text-[11.5px] font-medium truncate transition-colors',
            value === o.value ? 'bg-white text-zinc-900 shadow-card' : 'text-zinc-500 hover:text-zinc-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
