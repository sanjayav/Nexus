import { useState } from 'react'
import clsx from 'clsx'
import {
    Users, Shield, Key, Activity, Plus, Search,
    CheckCircle2, XCircle,
    Lock, AlertTriangle, Eye, Edit2,
    Link2, Clock, Check, X, Info, Sparkles
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Permission =
    | 'dashboard.view' | 'dashboard.export'
    | 'questionnaire.view' | 'questionnaire.edit' | 'questionnaire.submit' | 'questionnaire.configure'
    | 'evidence.view' | 'evidence.upload' | 'evidence.delete'
    | 'approval.view' | 'approval.review' | 'approval.approve'
    | 'report.view' | 'report.build' | 'report.publish' | 'report.anchor'
    | 'analytics.view' | 'analytics.export'
    | 'admin.users' | 'admin.org' | 'admin.chain' | 'admin.billing'
    | 'audit.view' | 'chain.verify'

type RoleId = 'platform_admin' | 'org_admin' | 'framework_owner' | 'data_contributor' | 'reviewer' | 'approver' | 'external_auditor' | 'read_only'

interface Role {
    id: RoleId
    name: string
    description: string
    color: string
    bgColor: string
    borderColor: string
    userCount: number
    isSystem: boolean
    permissions: Permission[]
}

interface User {
    id: string
    name: string
    email: string
    role: RoleId
    did: string
    vcHash: string
    vcIssued: string
    lastActive: string
    status: 'active' | 'pending' | 'suspended'
    modules: string[]
}

// ─── Permission Groups ────────────────────────────────────────────────────────

const permissionGroups: { group: string; icon: string; perms: { id: Permission; label: string; risk: 'low' | 'medium' | 'high' }[] }[] = [
    {
        group: 'Dashboards & Analytics', icon: '📊',
        perms: [
            { id: 'dashboard.view', label: 'View Dashboards', risk: 'low' },
            { id: 'dashboard.export', label: 'Export Data', risk: 'low' },
            { id: 'analytics.view', label: 'View Analytics', risk: 'low' },
            { id: 'analytics.export', label: 'Export Analytics', risk: 'low' },
        ],
    },
    {
        group: 'Questionnaire', icon: '📝',
        perms: [
            { id: 'questionnaire.view', label: 'View Responses', risk: 'low' },
            { id: 'questionnaire.edit', label: 'Edit & Fill', risk: 'medium' },
            { id: 'questionnaire.submit', label: 'Submit for Review', risk: 'medium' },
            { id: 'questionnaire.configure', label: 'Configure Schema', risk: 'high' },
        ],
    },
    {
        group: 'Evidence', icon: '📁',
        perms: [
            { id: 'evidence.view', label: 'View Evidence', risk: 'low' },
            { id: 'evidence.upload', label: 'Upload Evidence', risk: 'medium' },
            { id: 'evidence.delete', label: 'Delete Evidence', risk: 'high' },
        ],
    },
    {
        group: 'Review & Approvals', icon: '✅',
        perms: [
            { id: 'approval.view', label: 'View Submissions', risk: 'low' },
            { id: 'approval.review', label: 'Comment & Review', risk: 'medium' },
            { id: 'approval.approve', label: 'Approve / Reject', risk: 'high' },
        ],
    },
    {
        group: 'Reports & Publishing', icon: '📄',
        perms: [
            { id: 'report.view', label: 'View Reports', risk: 'low' },
            { id: 'report.build', label: 'Build Reports', risk: 'medium' },
            { id: 'report.publish', label: 'Publish Reports', risk: 'high' },
            { id: 'report.anchor', label: 'Anchor to Chain', risk: 'high' },
        ],
    },
    {
        group: 'Blockchain & Verification', icon: '⛓️',
        perms: [
            { id: 'chain.verify', label: 'Verify Proofs', risk: 'low' },
            { id: 'audit.view', label: 'View Audit Trail', risk: 'low' },
        ],
    },
    {
        group: 'Administration', icon: '⚙️',
        perms: [
            { id: 'admin.users', label: 'Manage Users & Roles', risk: 'high' },
            { id: 'admin.org', label: 'Configure Organization', risk: 'high' },
            { id: 'admin.chain', label: 'Chain Configuration', risk: 'high' },
            { id: 'admin.billing', label: 'Billing & Licensing', risk: 'high' },
        ],
    },
]

const ALL_PERMS: Permission[] = permissionGroups.flatMap(g => g.perms.map(p => p.id))

// ─── Roles Data ───────────────────────────────────────────────────────────────

const initialRoles: Role[] = [
    { id: 'platform_admin', name: 'Platform Admin', description: 'Full system access including billing and org management', color: 'text-rose-600', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20', userCount: 2, isSystem: true, permissions: ALL_PERMS },
    { id: 'org_admin', name: 'Org Admin', description: 'Full org scope: user management, configuration, all modules', color: 'text-orange-600', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', userCount: 3, isSystem: true, permissions: ALL_PERMS.filter(p => !p.startsWith('admin.billing')) },
    { id: 'framework_owner', name: 'Framework Owner', description: 'Owns one or more reporting frameworks; configures, assigns, reviews', color: 'text-violet-600', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', userCount: 4, isSystem: false, permissions: ['dashboard.view', 'dashboard.export', 'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit', 'questionnaire.configure', 'evidence.view', 'evidence.upload', 'approval.view', 'approval.review', 'report.view', 'report.build', 'analytics.view', 'analytics.export', 'audit.view', 'chain.verify'] },
    { id: 'data_contributor', name: 'Data Contributor', description: 'Fills questionnaire responses and uploads supporting evidence', color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', userCount: 18, isSystem: false, permissions: ['dashboard.view', 'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit', 'evidence.view', 'evidence.upload', 'approval.view', 'report.view', 'analytics.view'] },
    { id: 'reviewer', name: 'Reviewer', description: 'Reviews submissions, adds comments, requests changes', color: 'text-cyan-600', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', userCount: 12, isSystem: false, permissions: ['dashboard.view', 'dashboard.export', 'questionnaire.view', 'evidence.view', 'approval.view', 'approval.review', 'report.view', 'analytics.view', 'audit.view'] },
    { id: 'approver', name: 'Approver', description: 'Signs off submissions with DID/VC; approval recorded on-chain', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', userCount: 8, isSystem: false, permissions: ['dashboard.view', 'dashboard.export', 'questionnaire.view', 'evidence.view', 'approval.view', 'approval.review', 'approval.approve', 'report.view', 'report.build', 'analytics.view', 'analytics.export', 'audit.view', 'chain.verify'] },
    { id: 'external_auditor', name: 'External Auditor', description: 'Read-only access plus on-chain proof verification rights', color: 'text-amber-600', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', userCount: 5, isSystem: false, permissions: ['dashboard.view', 'questionnaire.view', 'evidence.view', 'approval.view', 'report.view', 'analytics.view', 'audit.view', 'chain.verify'] },
    { id: 'read_only', name: 'Read Only', description: 'View-only access to dashboards and published reports', color: 'text-black/60', bgColor: 'bg-black/5', borderColor: 'border-black/10', userCount: 22, isSystem: false, permissions: ['dashboard.view', 'report.view', 'analytics.view'] },
]

const initialUsers: User[] = [
    { id: 'u1', name: 'Layla Al-Rashid', email: 'layla@asyad.om', role: 'platform_admin', did: 'did:nexus:0xA1B2', vcHash: '0xvc9f...32ab', vcIssued: '2025-01-15', lastActive: '2 min ago', status: 'active', modules: ['GRI', 'MSX', 'IFRS S1', 'IFRS S2'] },
    { id: 'u2', name: 'Ahmed Al-Balushi', email: 'ahmed@asyad.om', role: 'org_admin', did: 'did:nexus:0xC3D4', vcHash: '0xvc7a...19bc', vcIssued: '2025-01-15', lastActive: '1 hr ago', status: 'active', modules: ['GRI', 'MSX'] },
    { id: 'u3', name: 'Sana Sharma', email: 'sana@asyad.in', role: 'approver', did: 'did:nexus:0xE5F6', vcHash: '0xvc4c...88de', vcIssued: '2025-02-01', lastActive: '3 hrs ago', status: 'active', modules: ['GRI', 'IFRS S1'] },
    { id: 'u4', name: 'Marcus Weber', email: 'marcus@asyad.de', role: 'framework_owner', did: 'did:nexus:0xG7H8', vcHash: '0xvc2e...45ff', vcIssued: '2025-02-10', lastActive: 'Yesterday', status: 'active', modules: ['IFRS S2'] },
    { id: 'u5', name: 'Priya Menon', email: 'priya@asyad.in', role: 'data_contributor', did: 'did:nexus:0xI9J0', vcHash: '0xvc1a...72ca', vcIssued: '2025-03-01', lastActive: '4 hrs ago', status: 'active', modules: ['GRI'] },
    { id: 'u6', name: 'Kevin Lam', email: 'kevin@pwc.com', role: 'external_auditor', did: 'did:nexus:0xK1L2', vcHash: '0xvc6b...31ea', vcIssued: '2025-02-20', lastActive: '3 days ago', status: 'active', modules: ['GRI', 'MSX', 'IFRS S1', 'IFRS S2'] },
    { id: 'u7', name: 'Fatima Malik', email: 'fatima@asyad.om', role: 'reviewer', did: 'did:nexus:0xM3N4', vcHash: '0xvc8d...09fa', vcIssued: '2025-03-05', lastActive: '6 hrs ago', status: 'active', modules: ['MSX', 'IFRS S2'] },
    { id: 'u8', name: "James O'Brien", email: 'james@asyad.ie', role: 'reviewer', did: '—', vcHash: '—', vcIssued: '—', lastActive: 'Never', status: 'pending', modules: [] },
]

type Tab = 'users' | 'roles' | 'matrix' | 'audit'

export default function IAMCenter() {
    const [tab, setTab] = useState<Tab>('users')
    const [roles, setRoles] = useState<Role[]>(initialRoles)
    const [users, setUsers] = useState<User[]>(initialUsers)
    const [search, setSearch] = useState('')
    const [selectedRole, setSelectedRole] = useState<RoleId | null>(null)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showGrantModal, setShowGrantModal] = useState<User | null>(null)
    const [vcIssueing, setVcIssuing] = useState<string | null>(null)
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'data_contributor' as RoleId, modules: [] as string[] })

    const getRoleById = (id: RoleId) => roles.find(r => r.id === id)!

    const filteredUsers = users.filter(u =>
        (u.name + u.email + u.role).toLowerCase().includes(search.toLowerCase()) &&
        (selectedRole ? u.role === selectedRole : true)
    )

    const issueVC = (userId: string) => {
        setVcIssuing(userId)
        setTimeout(() => {
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, status: 'active' as const, vcHash: `0xvc${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`, vcIssued: new Date().toISOString().split('T')[0], did: `did:nexus:0x${Math.random().toString(16).slice(2, 8).toUpperCase()}` }
                    : u
            ))
            setVcIssuing(null)
        }, 2000)
    }

    const togglePermission = (roleId: RoleId, perm: Permission) => {
        setRoles(prev => prev.map(r => {
            if (r.id !== roleId || r.id === 'platform_admin') return r
            const has = r.permissions.includes(perm)
            return { ...r, permissions: has ? r.permissions.filter(p => p !== perm) : [...r.permissions, perm] }
        }))
    }

    const riskBadge = (risk: 'low' | 'medium' | 'high') => ({
        low: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        medium: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
        high: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    }[risk])

    const statusBadge = (status: User['status']) => ({
        active: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
        suspended: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    }[status])

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'roles', label: 'Roles', icon: Shield },
        { id: 'matrix', label: 'Permission Matrix', icon: Key },
        { id: 'audit', label: 'Access Audit', icon: Activity },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between bg-white/60 backdrop-blur-xl border border-black/5 p-8 rounded-[2rem] shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-black tracking-tight mb-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                            <Shield className="w-5 h-5 text-indigo-600" />
                        </div>
                        Identity & Access Management
                    </h1>
                    <p className="text-sm font-medium text-black/60 leading-relaxed">Enterprise RBAC with DID/VC-signed role assignments anchored on-chain</p>
                </div>
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] transition-transform">
                    <Plus className="w-4 h-4" /> Invite User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', value: users.length, sub: `${users.filter(u => u.status === 'active').length} active`, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    { label: 'Roles Defined', value: roles.length, sub: `${roles.filter(r => !r.isSystem).length} custom`, color: 'text-violet-600', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                    { label: 'VCs Issued', value: users.filter(u => u.vcHash !== '—').length, sub: 'on-chain anchored', color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Pending Onboarding', value: users.filter(u => u.status === 'pending').length, sub: 'awaiting DID+VC', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                ].map(s => (
                    <div key={s.label} className={`bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border ${s.border} shadow-sm relative overflow-hidden group hover:shadow-md transition-all`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 ${s.bg} rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-110 transition-transform`} />
                        <div className="relative">
                            <div className={`inline-flex p-2.5 rounded-xl ${s.bg} mb-4 shadow-inner`}>
                                <Shield className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div className="text-3xl font-bold text-black mb-1">{s.value}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/50">{s.sub}</div>
                            <div className="text-xs font-bold text-black mt-2">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Callout */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 shadow-sm flex items-start gap-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 shadow-inner z-10">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="z-10">
                    <p className="text-sm font-bold text-black mb-1.5 uppercase tracking-widest">Why blockchain-native IAM matters for ESG</p>
                    <p className="text-xs font-medium text-black/60 leading-relaxed">
                        Traditional ESG platforms store approvals in a centralized DB — any admin can silently alter records.
                        Nexus issues a <strong className="text-indigo-600">Verifiable Credential (VC)</strong> for every role assignment and approval action.
                        Each VC is signed with the user's <strong className="text-indigo-600">DID</strong>, hashed, and anchored on <strong className="text-indigo-600">zkEVM</strong>.
                        Regulators can independently verify who approved what, when — without trusting Nexus's servers.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-black/5 w-fit shadow-sm">
                {tabs.map(t => {
                    const Icon = t.icon
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)} className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all', tab === t.id ? 'bg-indigo-500/10 text-indigo-600 shadow-sm border border-indigo-500/10' : 'text-black/50 hover:text-black hover:bg-black/5')}>
                            <Icon className="w-4 h-4" />{t.label}
                        </button>
                    )
                })}
            </div>

            {/* ── USERS TAB ── */}
            {tab === 'users' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-white/60 p-2 border border-black/5 backdrop-blur-xl rounded-[1.5rem] shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Search users by name, email, or role..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-black/5 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner" />
                        </div>
                        <select value={selectedRole ?? ''} onChange={e => setSelectedRole((e.target.value as RoleId) || null)} className="px-4 py-3 rounded-xl bg-white border border-black/5 text-xs font-bold uppercase tracking-widest text-black/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer shadow-inner">
                            <option value="">All Roles</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-black/5 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black/5 bg-black/[0.02]">
                                    {['User', 'Role', 'Modules', 'DID / VC', 'Status', 'Last Active', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-6 py-4 text-[10px] font-bold text-black/40 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => {
                                    const role = getRoleById(user.role)
                                    return (
                                        <tr key={user.id} className="border-b border-black/5 hover:bg-black/[0.02] transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl ${role.bgColor} ${role.borderColor} border flex items-center justify-center text-sm font-bold ${role.color} shadow-inner`}>
                                                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-black">{user.name}</div>
                                                        <div className="text-[10px] font-bold tracking-widest text-black/40 uppercase mt-0.5">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${role.bgColor} ${role.borderColor} ${role.color}`}>{role.name}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.modules.length === 0 ? <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">None</span> : user.modules.map(m => (
                                                        <span key={m} className="px-2 py-1 bg-white border border-black/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-black/60 shadow-sm">{m}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {user.vcHash === '—' ? (
                                                    <button onClick={() => issueVC(user.id)} disabled={vcIssueing === user.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-colors disabled:opacity-50 shadow-sm">
                                                        {vcIssueing === user.id ? <><div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />Issuing...</> : <><Link2 className="w-3.5 h-3.5" />Issue VC</>}
                                                    </button>
                                                ) : (
                                                    <div>
                                                        <div className="font-mono text-[10px] text-black/50 font-medium">{user.did}</div>
                                                        <div className="font-mono text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-500/5 px-2 py-0.5 rounded inline-block">{user.vcHash}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusBadge(user.status)}`}>{user.status}</span>
                                            </td>
                                            <td className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-black/40">
                                                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{user.lastActive}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setShowGrantModal(user)} title="Edit Role" className="p-2 rounded-xl bg-white hover:bg-black/5 border border-black/5 text-black/40 hover:text-indigo-600 transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                                    <button title="View Activity" className="p-2 rounded-xl bg-white hover:bg-black/5 border border-black/5 text-black/40 hover:text-black transition-all shadow-sm"><Eye className="w-4 h-4" /></button>
                                                    <button title="Suspend" className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-black/5 text-black/40 hover:text-rose-600 transition-all shadow-sm"><Lock className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── ROLES TAB ── */}
            {tab === 'roles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map(role => (
                        <div key={role.id} className={`bg-white rounded-[2rem] p-6 border ${role.borderColor} shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 ${role.bgColor} rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-125 transition-transform`} />
                            <div className="relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1.5 rounded-xl ${role.bgColor} border ${role.borderColor} shadow-inner`}>
                                            <span className={`text-[10px] uppercase tracking-widest font-bold ${role.color}`}>{role.name}</span>
                                        </div>
                                        {role.isSystem && <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-black/5 border border-black/10 text-black/50 uppercase tracking-widest">System</span>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-black leading-none">{role.userCount}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-black/40 mt-1">users</div>
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-black/50 mb-6 leading-relaxed min-h-[40px]">{role.description}</p>
                                <div className="flex items-end justify-between">
                                    <div className="flex flex-wrap gap-1.5 max-w-[70%]">
                                        {role.permissions.slice(0, 3).map(p => <span key={p} className="px-2 py-1 bg-black/[0.02] border border-black/5 rounded-lg text-[9px] uppercase tracking-widest text-black/40 font-bold shadow-inner">{p.split('.')[1]}</span>)}
                                        {role.permissions.length > 3 && <span className="px-2 py-1 bg-black/[0.02] border border-black/5 rounded-lg text-[9px] uppercase tracking-widest text-black/60 font-bold shadow-inner">+{role.permissions.length - 3}</span>}
                                    </div>
                                    <button onClick={() => setTab('matrix')} className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${role.color} hover:opacity-80 transition-opacity`}>
                                        <Key className="w-3 h-3" /> Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── MATRIX TAB ── */}
            {tab === 'matrix' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-white/60 p-4 border border-black/5 backdrop-blur-xl rounded-[1.5rem] shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Info className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs font-medium text-black/60">Click any cell to toggle a permission. System roles (<span className="text-rose-600 font-bold">Platform Admin</span>) are immutable.</span>
                        <div className="ml-auto flex gap-3 text-[10px] font-bold uppercase tracking-widest">
                            {(['low', 'medium', 'high'] as const).map(r => <span key={r} className={`px-2.5 py-1 rounded-full border ${riskBadge(r)} capitalize shadow-sm`}>{r} risk</span>)}
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-black/5 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-black/5 bg-black/[0.02]">
                                        <th className="sticky left-0 bg-white/95 backdrop-blur z-10 text-left px-6 py-5 text-[10px] uppercase tracking-widest text-black/40 font-bold min-w-[200px] border-r border-black/5">Permission Entity</th>
                                        {roles.map(r => (
                                            <th key={r.id} className={`px-4 py-5 text-center min-w-[120px] ${r.color} font-bold align-top border-r border-black/[0.02] last:border-0`}>
                                                <div className="text-[11px] uppercase tracking-widest">{r.name.split(' ')[0]}</div>
                                                <div className="text-black/40 font-medium text-[9px] uppercase tracking-widest mt-1">{r.name.split(' ').slice(1).join(' ')}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {permissionGroups.map(group => (
                                        <>
                                            <tr key={`g-${group.group}`} className="bg-black/[0.03]">
                                                <td colSpan={roles.length + 1} className="px-6 py-3 text-[10px] font-bold text-black/60 uppercase tracking-widest">{group.icon} {group.group}</td>
                                            </tr>
                                            {group.perms.map(perm => (
                                                <tr key={perm.id} className="border-t border-black/5 hover:bg-black/[0.01] transition-colors">
                                                    <td className="sticky left-0 bg-white z-10 px-6 py-4 border-r border-black/5 shadow-[4px_0_10px_rgba(0,0,0,0.01)]">
                                                        <div className="flex items-center justify-between gap-3 mb-1.5">
                                                            <span className="text-black font-mono font-bold text-[10px]">{perm.id}</span>
                                                            <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-widest ${riskBadge(perm.risk)}`}>{perm.risk}</span>
                                                        </div>
                                                        <div className="text-[11px] font-medium text-black/50">{perm.label}</div>
                                                    </td>
                                                    {roles.map(role => {
                                                        const hasPerm = role.permissions.includes(perm.id)
                                                        const isLocked = role.id === 'platform_admin'
                                                        return (
                                                            <td key={role.id} className="px-4 py-4 text-center border-r border-black/[0.02] last:border-0">
                                                                <button onClick={() => !isLocked && togglePermission(role.id, perm.id)} disabled={isLocked}
                                                                    className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all shadow-sm',
                                                                        hasPerm
                                                                            ? isLocked ? 'bg-emerald-50 border border-emerald-200 cursor-not-allowed' : 'bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 hover:scale-105'
                                                                            : isLocked ? 'bg-black/5 border border-black/10 cursor-not-allowed opacity-50' : 'bg-white border border-black/10 hover:border-emerald-300 hover:bg-emerald-50'
                                                                    )}>
                                                                    {hasPerm ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-black/20" />}
                                                                </button>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AUDIT TAB ── */}
            {tab === 'audit' && (
                <div className="space-y-4">
                    {[
                        { actor: 'Layla Al-Rashid', action: 'Issued VC to Kevin Lam (External Auditor)', time: '2 min ago', type: 'issue', did: 'did:nexus:0xA1B2', txHash: '0x1a2b3c...', severity: 'info' },
                        { actor: 'Layla Al-Rashid', action: 'Role changed: Priya Menon → Data Contributor', time: '1 hr ago', type: 'grant', did: 'did:nexus:0xA1B2', txHash: '0x4d5e6f...', severity: 'info' },
                        { actor: 'System', action: 'Permission matrix updated: Reviewer role — removed evidence.upload', time: '3 hrs ago', type: 'revoke', did: 'system', txHash: '0x7g8h9i...', severity: 'warning' },
                        { actor: "Ahmed Al-Balushi", action: "Invited James O'Brien as Reviewer", time: '1 day ago', type: 'invite', did: 'did:nexus:0xC3D4', txHash: '—', severity: 'info' },
                        { actor: 'Layla Al-Rashid', action: 'VC Revoked: Former contractor DID:nexus:0xOLD1', time: '3 days ago', type: 'revoke', did: 'did:nexus:0xA1B2', txHash: '0xrev001...', severity: 'danger' },
                        { actor: 'System', action: 'Periodic VC validity audit — all 7 VCs valid', time: '5 days ago', type: 'audit', did: 'system', txHash: '0xaudit...', severity: 'info' },
                    ].map((entry, i) => (
                        <div key={i} className="bg-white/60 backdrop-blur-xl border border-black/5 rounded-[1.5rem] p-5 flex items-start gap-5 hover:bg-white hover:shadow-md transition-all shadow-sm">
                            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner', entry.severity === 'danger' ? 'bg-rose-50' : entry.severity === 'warning' ? 'bg-amber-50' : 'bg-indigo-50')}>
                                {entry.type === 'issue' ? <Link2 className={`w-5 h-5 ${entry.severity === 'danger' ? 'text-rose-500' : entry.severity === 'warning' ? 'text-amber-500' : 'text-indigo-500'}`} /> :
                                    entry.type === 'revoke' ? <XCircle className="w-5 h-5 text-rose-500" /> :
                                        entry.type === 'grant' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                                            <Activity className="w-5 h-5 text-indigo-500" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-black">{entry.action}</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Actor: <span className="text-black/60">{entry.actor}</span></span>
                                    <span className="text-black/20 text-xs">•</span>
                                    <span className="font-mono text-[10px] font-bold text-black/50 bg-black/5 px-2 py-0.5 rounded">{entry.did}</span>
                                    {entry.txHash !== '—' && <><span className="text-black/20 text-xs">•</span><span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{entry.txHash}</span></>}
                                </div>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-black/40 flex-shrink-0 bg-black/[0.02] px-3 py-1.5 rounded-lg border border-black/5 flex items-center gap-1.5"><Clock className="w-3 h-3" />{entry.time}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── INVITE MODAL ── */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-black/5 rounded-[2rem] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-black flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-indigo-600" />
                                </div>
                                Invite New User
                            </h2>
                            <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:text-black hover:bg-black/10 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-6">
                            <div><label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Full Name</label><input value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} type="text" className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl text-black font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner" placeholder="e.g. Jane Smith" /></div>
                            <div><label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Work Email</label><input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} type="email" className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl text-black font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner" placeholder="jane@company.com" /></div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2">Assign Role</label>
                                <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value as RoleId }))} className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl text-black font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner cursor-pointer">
                                    {roles.filter(r => r.id !== 'platform_admin').map(r => <option key={r.id} value={r.id}>{r.name} — {r.description.slice(0, 50)}...</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3">Module Access</label>
                                <div className="flex gap-3 flex-wrap">
                                    {['GRI', 'MSX', 'IFRS S1', 'IFRS S2'].map(m => (
                                        <button key={m} onClick={() => setInviteForm(p => ({ ...p, modules: p.modules.includes(m) ? p.modules.filter(x => x !== m) : [...p.modules, m] }))} className={clsx('px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all shadow-sm', inviteForm.modules.includes(m) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-black/10 text-black/50 hover:border-black/30 hover:text-black')}>{m}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3 shadow-inner mt-2">
                                <Link2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <p className="text-xs font-medium text-emerald-800 leading-relaxed">A <strong className="text-emerald-900">DID</strong> will be auto-generated and a <strong className="text-emerald-900">Verifiable Credential</strong> issued on first login. The role assignment is anchored on-chain immediately.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setShowInviteModal(false)} className="flex-1 px-6 py-4 rounded-xl border border-black/10 text-black/60 hover:text-black hover:bg-black/5 text-[10px] font-bold uppercase tracking-widest transition-colors font-semibold">Cancel</button>
                            <button onClick={() => { if (inviteForm.name && inviteForm.email) { setUsers(prev => [...prev, { id: `u${Date.now()}`, name: inviteForm.name, email: inviteForm.email, role: inviteForm.role, did: '—', vcHash: '—', vcIssued: '—', lastActive: 'Never', status: 'pending', modules: inviteForm.modules }]); setInviteForm({ name: '', email: '', role: 'data_contributor', modules: [] }); setShowInviteModal(false) } }} className="flex-1 px-6 py-4 rounded-xl bg-indigo-500 text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-transform">
                                Send Invite
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ROLE CHANGE MODAL ── */}
            {showGrantModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-black/5 rounded-[2rem] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-black">Edit Access<br /><span className="text-sm font-medium text-black/50 mt-1 block">{showGrantModal.name}</span></h2>
                            <button onClick={() => setShowGrantModal(null)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:text-black hover:bg-black/10 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3">Current Role</label>
                                <div className={`px-4 py-3 rounded-xl ${getRoleById(showGrantModal.role).bgColor} border ${getRoleById(showGrantModal.role).borderColor} shadow-inner inline-flex`}>
                                    <span className={`text-xs font-bold uppercase tracking-widest ${getRoleById(showGrantModal.role).color}`}>{getRoleById(showGrantModal.role).name}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-3">Reassign to Role</label>
                                <select className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl text-black font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner cursor-pointer" defaultValue={showGrantModal.role} onChange={e => setUsers(prev => prev.map(u => u.id === showGrantModal.id ? { ...u, role: e.target.value as RoleId } : u))}>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 shadow-inner">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <p className="text-xs font-medium text-amber-800 leading-relaxed">Role change will revoke the existing VC and issue a new one. The old VC revocation is anchored on-chain with a timestamp.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setShowGrantModal(null)} className="flex-1 px-6 py-4 rounded-xl border border-black/10 text-black/60 hover:text-black hover:bg-black/5 text-[10px] font-bold uppercase tracking-widest transition-colors font-semibold">Cancel</button>
                            <button onClick={() => { issueVC(showGrantModal.id); setShowGrantModal(null) }} className="flex-1 px-6 py-4 rounded-xl bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-transform">
                                Save & Re-issue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
