import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    Home, Database, CheckSquare,
    Box, Shield, Bell, Search as SearchIcon,
    ChevronRight,
    Activity, Layers, FileText, BarChart, Focus,
    Calculator, Settings2, Sparkles, LogOut
} from 'lucide-react'
import clsx from 'clsx'
import { useRBAC } from '../contexts/RBACContext'
import { useAuth } from '../auth/AuthContext'

const NAV_GROUPS = [
    {
        label: 'Growth',
        items: [
            { name: 'Emissions Engine', icon: Activity, path: '/carbon', activePattern: '^/carbon' },
            { name: 'Scope 3 Calculator', icon: Calculator, path: '/scope3', activePattern: '^/scope3' },
            { name: 'Materiality (DMA)', icon: Focus, path: '/dma', activePattern: '^/dma' },
            { name: 'AI Studio', icon: Sparkles, path: '/ai', activePattern: '^/ai' },
        ]
    },
    {
        label: 'Overview',
        items: [
            { name: 'Portfolio Overview', icon: Layers, path: '/portfolio', activePattern: '^/portfolio' },
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
            { name: 'Chain Verification', icon: Shield, path: '/verify', activePattern: '^/verify|^/anchors' },
            { name: 'Report Builder', icon: FileText, path: '/publish', activePattern: '^/publish|^/reports' },
        ]
    },
    {
        label: 'Settings',
        items: [
            { name: 'Data Connectors', icon: Activity, path: '/connectors', activePattern: '^/connectors' },
            { name: 'Workflow Config', icon: Settings2, path: '/workflow', activePattern: '^/workflow' },
            { name: 'Access & IAM', icon: Layers, path: '/iam', activePattern: '^/iam' },
        ]
    }
]

export default function UIAppShell({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const { roleDef } = useRBAC()
    const { user, logout } = useAuth()

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    const displayName = user?.name ?? 'User Panel'
    const userInitial = (user?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()

    return (
        // The Background representing white paper waves. Using a CSS pattern + gradients.
        <div className="flex h-screen w-full font-sans overflow-hidden selection:bg-black/30 bg-[#e0e5ec] relative">

            {/* Abstract Background Waves (CSS Simulation) */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(255,255,255,0.8), transparent 25%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.9), transparent 25%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.7), transparent 25%)',
                backgroundSize: '100% 100%'
            }} />
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-white/10 to-white/70 rounded-[100%] blur-[80px] rotate-[-20deg]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-bl from-white/10 to-white/60 rounded-[100%] blur-[100px] rotate-[10deg]" />

            <div className="flex w-full h-full p-6">

                {/* ─── MAIN GLASSMORPHIC CONTAINER ─────────────────────────────────────────────── */}
                <div className="flex flex-1 rounded-[2.5rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative">

                    {/* Inner subtle noise/texture */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

                    {/* ─── SIDEBAR ───────────────────────────────────────────────────────── */}
                    <aside
                        className={clsx(
                            "relative flex flex-col h-full border-r border-black/[0.04] transition-all duration-300 z-50",
                            isSidebarCollapsed ? "w-20" : "w-[260px]"
                        )}
                    >
                        {/* Logo Area */}
                        <div className="h-24 flex items-center px-8">
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-[10px] bg-black flex items-center justify-center shrink-0">
                                    <Box className="w-4 h-4 text-white" />
                                </div>
                                {!isSidebarCollapsed && (
                                    <span className="text-xl font-bold tracking-tight text-black flex items-center">
                                        Nexus<span className="text-emerald-500 ml-1">.</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-none">
                            {NAV_GROUPS.map((group, i) => (
                                <div key={group.label} className={clsx(i !== 0 ? "mt-8" : "", "mb-2")}>
                                    {!isSidebarCollapsed && (
                                        <div className="text-[10px] font-bold tracking-widest text-black/40 uppercase mb-3 px-4">
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
                                                        "group relative flex items-center rounded-2xl transition-all duration-300 font-medium",
                                                        isSidebarCollapsed ? "justify-center p-3 mx-2" : "px-4 py-3 gap-3 mx-1",
                                                        isActive
                                                            ? "bg-black text-white shadow-xl shadow-black/10 scale-[1.02]"
                                                            : "text-black/60 hover:text-black hover:bg-black/5 hover:scale-[1.01]"
                                                    )}
                                                    title={isSidebarCollapsed ? item.name : undefined}
                                                >
                                                    <Icon className={clsx("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "group-hover:text-black")} />
                                                    {!isSidebarCollapsed && (
                                                        <>
                                                            <span className="text-sm">{item.name}</span>
                                                            {item.badge && (
                                                                <span className={clsx("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                                                    isActive ? "bg-white/20 text-white" : "bg-black/10 text-black"
                                                                )}>
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

                        {/* User Profile Snippet (Bottom Left) */}
                        <div className="p-6 border-t border-black/[0.04] mt-auto space-y-3">
                            {!isSidebarCollapsed ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black/5 border border-black/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-black">{userInitial}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-black truncate">{displayName}</div>
                                            <div className="text-xs text-black/50 truncate flex items-center gap-1.5 mt-0.5">
                                                {user?.email ?? roleDef.name}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setCollapsed(true)} className="p-1.5 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition" aria-label="Collapse sidebar">
                                            <ChevronRight className="w-4 h-4 rotate-180" />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-black/70 border border-black/10 bg-white/50 hover:bg-white hover:text-black hover:border-black/20 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Log out
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <button type="button" onClick={() => setCollapsed(false)} className="w-full flex justify-center p-2 rounded-xl text-black/40 hover:bg-black/5 transition" aria-label="Expand sidebar">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="w-full flex justify-center p-2.5 rounded-xl text-black/50 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-colors"
                                        title="Log out"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* ─── MAIN CONTENT AREA ─────────────────────────────────────────────── */}
                    <main className="flex-1 flex flex-col min-w-0 relative z-10">
                        {/* Header */}
                        <header className="h-24 flex flex-shrink-0 items-center justify-between px-10 z-40">

                            {/* Greeting / Dynamic Based on Route maybe */}
                            <div className="flex-1">
                                {location.pathname === '/carbon' || location.pathname === '/dma' ? (
                                    <h1 className="text-2xl font-bold text-black tracking-tight">Hi, {user?.name?.split(' ')[0] ?? 'there'}!</h1>
                                ) : (
                                    <div className="text-lg font-bold text-black opacity-80">Workspace</div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                {/* Multi-tenant Org Switcher */}
                                <select className="hidden sm:block px-4 py-2 bg-white/60 border border-white rounded-full text-xs font-bold text-black/70 focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer">
                                    <option>Aeiforo Green Energy</option>
                                    <option>Asyad Group</option>
                                    <option>Add organization...</option>
                                </select>
                                {/* Create Button (Like the black + Create button in UI) */}
                                <button
                                    onClick={() => navigate('/period/create')}
                                    className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold shadow-lg hover:scale-105 transition-transform"
                                >
                                    <span className="text-lg leading-none mb-0.5">+</span> Create
                                </button>

                                {/* Icon Actions */}
                                <div className="flex gap-2">
                                    <button className="w-10 h-10 bg-white/60 border border-white hover:bg-white rounded-full flex items-center justify-center text-black/60 hover:text-black transition-colors shadow-sm focus:bg-white active:scale-95">
                                        <SearchIcon className="w-4 h-4" />
                                    </button>
                                    <button className="w-10 h-10 bg-white/60 border border-white hover:bg-white rounded-full flex items-center justify-center text-black/60 hover:text-black transition-colors shadow-sm relative focus:bg-white active:scale-95">
                                        <Bell className="w-4 h-4" />
                                        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-black" />
                                    </button>
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="w-10 h-10 rounded-full border border-black/10 overflow-hidden ml-2 shadow-sm bg-black/5 flex items-center justify-center cursor-pointer hover:border-black/30 hover:bg-black/10 transition-colors focus:outline-none active:scale-95"
                                        aria-label="Admin"
                                    >
                                        <span className="text-xs font-bold text-black">{userInitial}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-black/60 border border-black/10 bg-white/60 hover:bg-white hover:text-black hover:border-black/20 transition-colors"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        Log out
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Page Content Scrollable Area */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-black/5 scrollbar-track-transparent">
                            <div className={clsx(
                                "min-h-full",
                                (location.pathname.startsWith('/publish') || location.pathname.includes('/questionnaire')) ? "" : "px-10 pb-10 max-w-[1600px] mx-auto"
                            )}>
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
