import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
    Home, Database, CheckSquare,
    Box, Shield, Settings, Bell, Search as SearchIcon,
    ChevronRight, Command,
    Activity, Layers, FileText, BarChart
} from 'lucide-react'
import clsx from 'clsx'
import { useRBAC } from '../contexts/RBACContext'

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            { name: 'Command Center', icon: Home, path: '/', activePattern: '^/$' },
            { name: 'Analytics', icon: BarChart, path: '/analytics', activePattern: '^/analytics' },
        ]
    },
    {
        label: 'Workspace',
        items: [
            { name: 'Reporting Hub', icon: Box, path: '/modules', activePattern: '^/modules|^/questionnaire' },
            { name: 'Evidence Vault', icon: Database, path: '/evidence', activePattern: '^/evidence' },
            { name: 'Task Inbox', icon: CheckSquare, path: '/tasks', activePattern: '^/tasks', badge: '3' },
        ]
    },
    {
        label: 'Trust Layer',
        items: [
            { name: 'Chain Verification', icon: Shield, path: '/verification', activePattern: '^/verification|^/anchors' },
            { name: 'Report Builder', icon: FileText, path: '/report-builder', activePattern: '^/report-builder' },
        ]
    },
    {
        label: 'Settings',
        items: [
            { name: 'Data Connectors', icon: Activity, path: '/connectors', activePattern: '^/connectors' },
            { name: 'Access & IAM', icon: Layers, path: '/iam', activePattern: '^/iam' },
        ]
    }
]

export default function PremiumAppShell({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const { roleDef } = useRBAC()

    return (
        <div className="flex h-screen w-full bg-[#0A0C10] text-[#E2E8F0] font-sans overflow-hidden selection:bg-accent/30">

            {/* ─── SIDEBAR ───────────────────────────────────────────────────────── */}
            <aside
                className={clsx(
                    "relative flex flex-col h-full bg-[#0D1117] border-r border-white/[0.04] transition-all duration-300 z-50",
                    isSidebarCollapsed ? "w-20" : "w-64"
                )}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center px-4 border-b border-white/[0.04]">
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold tracking-wide text-white scale-y-105 leading-none mb-1">NEXUS</span>
                                <span className="text-[9px] font-medium tracking-widest text-emerald-400 uppercase opacity-80">Enterprise Zero</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* User Context */}
                <div className={clsx("p-4 border-b border-white/[0.02] flex items-center gap-3", isSidebarCollapsed && "justify-center px-0")}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-300">A</span>
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">Asyad Group</div>
                            <div className="text-[10px] text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${roleDef.bgColor.replace('10', '50')}`} />
                                {roleDef.name}
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 scrollbar-none">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className={clsx("mb-6", isSidebarCollapsed ? "px-3" : "px-4")}>
                            {!isSidebarCollapsed && (
                                <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-2 px-2">
                                    {group.label}
                                </div>
                            )}
                            <div className="space-y-1">
                                {group.items.map(item => {
                                    const isActive = new RegExp(item.activePattern).test(location.pathname)
                                    const Icon = item.icon
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className={clsx(
                                                "group relative flex items-center rounded-xl transition-all duration-200",
                                                isSidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2 gap-3",
                                                isActive
                                                    ? "bg-white/[0.06] text-white"
                                                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]"
                                            )}
                                            title={isSidebarCollapsed ? item.name : undefined}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-emerald-400 rounded-r-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                            )}
                                            <Icon className={clsx("w-[18px] h-[18px] shrink-0 transition-colors", isActive ? "text-emerald-400" : "group-hover:text-emerald-400/70")} />
                                            {!isSidebarCollapsed && (
                                                <>
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Collapse Toggle */}
                <div className="p-3 border-t border-white/[0.04]">
                    <button
                        onClick={() => setCollapsed(!isSidebarCollapsed)}
                        className="w-full flex items-center justify-center p-2 rounded-xl text-gray-400 hover:bg-white/[0.04] transition-colors"
                    >
                        <ChevronRight className={clsx("w-4 h-4 transition-transform duration-300", !isSidebarCollapsed && "rotate-180")} />
                    </button>
                </div>
            </aside>

            {/* ─── MAIN CONTENT AREA ─────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Glowing orb background effect */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />

                {/* Header */}
                <header className="h-16 flex flex-shrink-0 items-center justify-between px-6 border-b border-white/[0.04] backdrop-blur-md bg-[#0A0C10]/80 z-40">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Global Search */}
                        <div className="relative group max-w-sm w-full hidden md:block">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search modules, evidence, tasks..."
                                className="block w-full pl-10 pr-12 py-1.5 bg-[#0D1117] border border-white/5 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-white"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <div className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                                    <Command className="w-3 h-3" /> K
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Environment Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                            <span className="text-[11px] font-medium text-gray-300 tracking-wide">zkEVM Connected</span>
                        </div>

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#0A0C10]" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Page Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
