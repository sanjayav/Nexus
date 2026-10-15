import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'
import {
    Users, Shield, Key, Activity, Plus, Search,
    CheckCircle2, XCircle, UserPlus, BadgeCheck,
    Lock, AlertTriangle, Eye, Edit2,
    Link2, Clock, Check, X, Info, Sparkles, Loader2,
} from 'lucide-react'
import { fmt, useFormat, useStrings, LOCALES } from '../i18n'
import { iamCenterStrings } from '../i18n/pages/iamCenter'
import { useLanguage } from '../contexts/LanguageContext'
import { PageHeader, Card, Button, Badge, StatCard, Tabs, EmptyState, Field, inputClass, tableClass, Tone } from '../components/ui'

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
type Risk = 'low' | 'medium' | 'high'
/** Relative time: amount + unit in the past, or null for "never". */
type Ago = { n: number; unit: Intl.RelativeTimeFormatUnit } | null

interface Role {
    id: RoleId
    dot: string
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
    lastActive: Ago
    status: 'active' | 'pending' | 'suspended'
    modules: string[]
}

// ─── Permission groups ────────────────────────────────────────────────────────

type GroupId = 'dashboards' | 'questionnaire' | 'evidence' | 'approvals' | 'reports' | 'chain' | 'admin'

const permissionGroups: { id: GroupId; perms: { id: Permission; risk: Risk }[] }[] = [
    { id: 'dashboards', perms: [{ id: 'dashboard.view', risk: 'low' }, { id: 'dashboard.export', risk: 'low' }, { id: 'analytics.view', risk: 'low' }, { id: 'analytics.export', risk: 'low' }] },
    { id: 'questionnaire', perms: [{ id: 'questionnaire.view', risk: 'low' }, { id: 'questionnaire.edit', risk: 'medium' }, { id: 'questionnaire.submit', risk: 'medium' }, { id: 'questionnaire.configure', risk: 'high' }] },
    { id: 'evidence', perms: [{ id: 'evidence.view', risk: 'low' }, { id: 'evidence.upload', risk: 'medium' }, { id: 'evidence.delete', risk: 'high' }] },
    { id: 'approvals', perms: [{ id: 'approval.view', risk: 'low' }, { id: 'approval.review', risk: 'medium' }, { id: 'approval.approve', risk: 'high' }] },
    { id: 'reports', perms: [{ id: 'report.view', risk: 'low' }, { id: 'report.build', risk: 'medium' }, { id: 'report.publish', risk: 'high' }, { id: 'report.anchor', risk: 'high' }] },
    { id: 'chain', perms: [{ id: 'chain.verify', risk: 'low' }, { id: 'audit.view', risk: 'low' }] },
    { id: 'admin', perms: [{ id: 'admin.users', risk: 'high' }, { id: 'admin.org', risk: 'high' }, { id: 'admin.chain', risk: 'high' }, { id: 'admin.billing', risk: 'high' }] },
]

const ALL_PERMS: Permission[] = permissionGroups.flatMap(g => g.perms.map(p => p.id))
const RISK_TONE: Record<Risk, Tone> = { low: 'success', medium: 'warning', high: 'danger' }
const STATUS_TONE: Record<User['status'], Tone> = { active: 'success', pending: 'warning', suspended: 'danger' }

// ─── Roles & users ────────────────────────────────────────────────────────────

const initialRoles: Role[] = [
    { id: 'platform_admin', dot: 'bg-rose-500', userCount: 2, isSystem: true, permissions: ALL_PERMS },
    { id: 'org_admin', dot: 'bg-orange-500', userCount: 3, isSystem: true, permissions: ALL_PERMS.filter(p => !p.startsWith('admin.billing')) },
    { id: 'framework_owner', dot: 'bg-violet-500', userCount: 4, isSystem: false, permissions: ['dashboard.view', 'dashboard.export', 'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit', 'questionnaire.configure', 'evidence.view', 'evidence.upload', 'approval.view', 'approval.review', 'report.view', 'report.build', 'analytics.view', 'analytics.export', 'audit.view', 'chain.verify'] },
    { id: 'data_contributor', dot: 'bg-sky-500', userCount: 18, isSystem: false, permissions: ['dashboard.view', 'questionnaire.view', 'questionnaire.edit', 'questionnaire.submit', 'evidence.view', 'evidence.upload', 'approval.view', 'report.view', 'analytics.view'] },
    { id: 'reviewer', dot: 'bg-cyan-500', userCount: 12, isSystem: false, permissions: ['dashboard.view', 'dashboard.export', 'questionnaire.view', 'evidence.view', 'approval.view', 'approval.review', 'report.view', 'analytics.view', 'audit.view'] },
    { id: 'approver', dot: 'bg-emerald-500', userCount: 8, isSystem: false, permissions: ['dashboard.view', 'dashboard.export', 'questionnaire.view', 'evidence.view', 'approval.view', 'approval.review', 'approval.approve', 'report.view', 'report.build', 'analytics.view', 'analytics.export', 'audit.view', 'chain.verify'] },
    { id: 'external_auditor', dot: 'bg-amber-500', userCount: 5, isSystem: false, permissions: ['dashboard.view', 'questionnaire.view', 'evidence.view', 'approval.view', 'report.view', 'analytics.view', 'audit.view', 'chain.verify'] },
    { id: 'read_only', dot: 'bg-zinc-400', userCount: 22, isSystem: false, permissions: ['dashboard.view', 'report.view', 'analytics.view'] },
]

const initialUsers: User[] = [
    { id: 'u1', name: 'Layla Al-Rashid', email: 'layla@asyad.om', role: 'platform_admin', did: 'did:nexus:0xA1B2', vcHash: '0xvc9f...32ab', vcIssued: '2025-01-15', lastActive: { n: 2, unit: 'minute' }, status: 'active', modules: ['GRI', 'MSX', 'IFRS S1', 'IFRS S2'] },
    { id: 'u2', name: 'Ahmed Al-Balushi', email: 'ahmed@asyad.om', role: 'org_admin', did: 'did:nexus:0xC3D4', vcHash: '0xvc7a...19bc', vcIssued: '2025-01-15', lastActive: { n: 1, unit: 'hour' }, status: 'active', modules: ['GRI', 'MSX'] },
    { id: 'u3', name: 'Sana Sharma', email: 'sana@asyad.in', role: 'approver', did: 'did:nexus:0xE5F6', vcHash: '0xvc4c...88de', vcIssued: '2025-02-01', lastActive: { n: 3, unit: 'hour' }, status: 'active', modules: ['GRI', 'IFRS S1'] },
    { id: 'u4', name: 'Marcus Weber', email: 'marcus@asyad.de', role: 'framework_owner', did: 'did:nexus:0xG7H8', vcHash: '0xvc2e...45ff', vcIssued: '2025-02-10', lastActive: { n: 1, unit: 'day' }, status: 'active', modules: ['IFRS S2'] },
    { id: 'u5', name: 'Priya Menon', email: 'priya@asyad.in', role: 'data_contributor', did: 'did:nexus:0xI9J0', vcHash: '0xvc1a...72ca', vcIssued: '2025-03-01', lastActive: { n: 4, unit: 'hour' }, status: 'active', modules: ['GRI'] },
    { id: 'u6', name: 'Kevin Lam', email: 'kevin@pwc.com', role: 'external_auditor', did: 'did:nexus:0xK1L2', vcHash: '0xvc6b...31ea', vcIssued: '2025-02-20', lastActive: { n: 3, unit: 'day' }, status: 'active', modules: ['GRI', 'MSX', 'IFRS S1', 'IFRS S2'] },
    { id: 'u7', name: 'Fatima Malik', email: 'fatima@asyad.om', role: 'reviewer', did: 'did:nexus:0xM3N4', vcHash: '0xvc8d...09fa', vcIssued: '2025-03-05', lastActive: { n: 6, unit: 'hour' }, status: 'active', modules: ['MSX', 'IFRS S2'] },
    { id: 'u8', name: "James O'Brien", email: 'james@asyad.ie', role: 'reviewer', did: '—', vcHash: '—', vcIssued: '—', lastActive: null, status: 'pending', modules: [] },
]

// Action text is in the dictionary (`auditActions`), matched by index.
const auditLog: { actor: string | null; ago: Ago; type: 'issue' | 'grant' | 'revoke' | 'invite' | 'audit'; did: string; txHash: string; severity: 'info' | 'warning' | 'danger' }[] = [
    { actor: 'Layla Al-Rashid', ago: { n: 2, unit: 'minute' }, type: 'issue', did: 'did:nexus:0xA1B2', txHash: '0x1a2b3c...', severity: 'info' },
    { actor: 'Layla Al-Rashid', ago: { n: 1, unit: 'hour' }, type: 'grant', did: 'did:nexus:0xA1B2', txHash: '0x4d5e6f...', severity: 'info' },
    { actor: null, ago: { n: 3, unit: 'hour' }, type: 'revoke', did: 'system', txHash: '0x7g8h9i...', severity: 'warning' },
    { actor: 'Ahmed Al-Balushi', ago: { n: 1, unit: 'day' }, type: 'invite', did: 'did:nexus:0xC3D4', txHash: '—', severity: 'info' },
    { actor: 'Layla Al-Rashid', ago: { n: 3, unit: 'day' }, type: 'revoke', did: 'did:nexus:0xA1B2', txHash: '0xrev001...', severity: 'danger' },
    { actor: null, ago: { n: 5, unit: 'day' }, type: 'audit', did: 'system', txHash: '0xaudit...', severity: 'info' },
]

const MODULES = ['GRI', 'MSX', 'IFRS S1', 'IFRS S2']

type Tab = 'users' | 'roles' | 'matrix' | 'audit'

// ─── Local UI ─────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, closeLabel, children, footer }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; closeLabel: string; children: ReactNode; footer: ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-surface border border-line rounded-card shadow-pop max-h-[calc(100vh-2rem)] flex flex-col">
                <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-line">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
                        {subtitle && <p className="text-[13px] text-zinc-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="w-8 px-0 -mr-1" aria-label={closeLabel} onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">{children}</div>
                <div className="px-5 sm:px-6 py-4 border-t border-line flex justify-end gap-2">{footer}</div>
            </div>
        </div>,
        document.body,
    )
}

function RoleTag({ role, label }: { role: Role; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium whitespace-nowrap">
            <span className={clsx('w-1.5 h-1.5 rounded-full', role.dot)} />
            {label}
        </span>
    )
}

function Callout({ tone, icon: Icon, children }: { tone: 'info' | 'success' | 'warning'; icon: React.ElementType; children: ReactNode }) {
    const styles = {
        info: 'bg-zinc-50 border-line text-zinc-600 [&_svg]:text-zinc-500',
        success: 'bg-emerald-50/60 border-emerald-200/70 text-emerald-900 [&_svg]:text-emerald-600',
        warning: 'bg-amber-50/70 border-amber-200/70 text-amber-900 [&_svg]:text-amber-600',
    }[tone]
    return (
        <div className={clsx('flex items-start gap-3 rounded-xl border p-3.5 text-[13px] leading-relaxed', styles)}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{children}</div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IAMCenter() {
    const s = useStrings(iamCenterStrings)
    const f = useFormat()
    const { locale } = useLanguage()
    const rtf = useMemo(() => new Intl.RelativeTimeFormat(LOCALES.find(l => l.code === locale)!.intl, { numeric: 'auto' }), [locale])
    const ago = (a: Ago) => (a ? rtf.format(-a.n, a.unit) : s.never)

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
    const roleName = (id: RoleId) => s.roles[id].name

    const filteredUsers = users.filter(u =>
        (u.name + u.email + u.role + roleName(u.role)).toLowerCase().includes(search.toLowerCase()) &&
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

    const sendInvite = () => {
        if (!inviteForm.name || !inviteForm.email) return
        setUsers(prev => [...prev, { id: `u${Date.now()}`, name: inviteForm.name, email: inviteForm.email, role: inviteForm.role, did: '—', vcHash: '—', vcIssued: '—', lastActive: null, status: 'pending', modules: inviteForm.modules }])
        setInviteForm({ name: '', email: '', role: 'data_contributor', modules: [] })
        setShowInviteModal(false)
    }

    const activeCount = users.filter(u => u.status === 'active').length

    return (
        <div>
            <PageHeader
                title={s.title}
                description={s.description}
                actions={<Button variant="primary" icon={UserPlus} onClick={() => setShowInviteModal(true)}>{s.inviteUser}</Button>}
            />

            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard label={s.stats.totalUsers} icon={Users} value={f.number(users.length)} deltaLabel={fmt(s.stats.activeSub, { count: activeCount })} />
                    <StatCard label={s.stats.roles} icon={Shield} value={f.number(roles.length)} deltaLabel={fmt(s.stats.customSub, { count: roles.filter(r => !r.isSystem).length })} />
                    <StatCard label={s.stats.vcs} icon={BadgeCheck} value={f.number(users.filter(u => u.vcHash !== '—').length)} deltaLabel={s.stats.vcsSub} />
                    <StatCard label={s.stats.pending} icon={Clock} value={f.number(users.filter(u => u.status === 'pending').length)} deltaLabel={s.stats.pendingSub} />
                </div>

                {/* Callout */}
                <Card className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-zinc-900">{s.calloutTitle}</h3>
                        <p className="text-[13px] text-zinc-600 leading-relaxed mt-1 max-w-4xl">{s.calloutBody}</p>
                    </div>
                </Card>

                <Tabs
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: 'users', label: <><Users className="w-3.5 h-3.5" />{s.tabs.users}</>, count: users.length },
                        { value: 'roles', label: <><Shield className="w-3.5 h-3.5" />{s.tabs.roles}</>, count: roles.length },
                        { value: 'matrix', label: <><Key className="w-3.5 h-3.5" />{s.tabs.matrix}</> },
                        { value: 'audit', label: <><Activity className="w-3.5 h-3.5" />{s.tabs.audit}</> },
                    ]}
                />

                {/* ── Users ── */}
                {tab === 'users' && (
                    <Card>
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <div className="relative flex-1 sm:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder={s.searchPlaceholder} aria-label={s.searchLabel} className={inputClass + ' pl-9'} />
                            </div>
                            <select value={selectedRole ?? ''} onChange={e => setSelectedRole((e.target.value as RoleId) || null)} aria-label={s.roleFilterLabel} className={inputClass + ' sm:w-48 cursor-pointer'}>
                                <option value="">{s.allRoles}</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{roleName(r.id)}</option>)}
                            </select>
                        </div>

                        {filteredUsers.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title={s.noUsersTitle}
                                description={s.noUsersBody}
                                action={<Button size="sm" onClick={() => { setSearch(''); setSelectedRole(null) }}>{s.clearFilters}</Button>}
                            />
                        ) : (
                            <div className={tableClass.wrap}>
                                <table className={tableClass.table}>
                                    <thead>
                                        <tr>
                                            {[s.th.user, s.th.role, s.th.modules, s.th.didVc, s.th.status, s.th.lastActive].map(h => (
                                                <th key={h} className={tableClass.th}>{h}</th>
                                            ))}
                                            <th className={tableClass.th + ' text-right'}>{s.th.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map(user => {
                                            const role = getRoleById(user.role)
                                            return (
                                                <tr key={user.id} className={tableClass.tr}>
                                                    <td className={tableClass.td}>
                                                        <div className="flex items-center gap-3 min-w-[200px]">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium text-zinc-900">{user.name}</div>
                                                                <div className="text-xs text-zinc-500">{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={tableClass.td}><RoleTag role={role} label={roleName(role.id)} /></td>
                                                    <td className={tableClass.td}>
                                                        <div className="flex flex-wrap gap-1 min-w-[140px]">
                                                            {user.modules.length === 0
                                                                ? <span className="text-xs text-zinc-400">{s.none}</span>
                                                                : user.modules.map(m => <span key={m} className="px-1.5 h-5 inline-flex items-center rounded border border-line text-[11px] text-zinc-600 whitespace-nowrap">{m}</span>)}
                                                        </div>
                                                    </td>
                                                    <td className={tableClass.td}>
                                                        {user.vcHash === '—' ? (
                                                            <Button size="sm" icon={vcIssueing === user.id ? Loader2 : Link2} disabled={vcIssueing === user.id} onClick={() => issueVC(user.id)} className={vcIssueing === user.id ? '[&_svg]:animate-spin' : ''}>
                                                                {vcIssueing === user.id ? s.issuing : s.issueVc}
                                                            </Button>
                                                        ) : (
                                                            <div className="whitespace-nowrap">
                                                                <div className="font-mono text-xs text-zinc-500">{user.did}</div>
                                                                <div className="font-mono text-xs text-zinc-900 mt-0.5">{user.vcHash}</div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className={tableClass.td}><Badge tone={STATUS_TONE[user.status]} dot>{s.userStatus[user.status]}</Badge></td>
                                                    <td className={tableClass.td + ' whitespace-nowrap text-[13px] text-zinc-500'}>{ago(user.lastActive)}</td>
                                                    <td className={tableClass.td}>
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={s.editRole} title={s.editRole} onClick={() => setShowGrantModal(user)}><Edit2 className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={s.viewActivity} title={s.viewActivity}><Eye className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="sm" className="w-8 px-0 hover:text-rose-600" aria-label={s.suspend} title={s.suspend}><Lock className="w-4 h-4" /></Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── Roles ── */}
                {tab === 'roles' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {roles.map(role => (
                            <Card key={role.id} className="flex flex-col">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={clsx('w-2 h-2 rounded-full shrink-0', role.dot)} />
                                        <h3 className="text-[15px] font-semibold text-zinc-900 truncate">{roleName(role.id)}</h3>
                                        {role.isSystem && <Badge tone="neutral">{s.system}</Badge>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-lg font-semibold text-zinc-900 leading-none tabular">{f.number(role.userCount)}</div>
                                        <div className="text-xs text-zinc-500 mt-1">{s.users}</div>
                                    </div>
                                </div>
                                <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">{s.roles[role.id].description}</p>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {role.permissions.slice(0, 3).map(p => <span key={p} className="px-1.5 h-5 inline-flex items-center rounded bg-zinc-100 text-[11px] text-zinc-600">{s.perms[p]}</span>)}
                                    {role.permissions.length > 3 && <span className="px-1.5 h-5 inline-flex items-center rounded bg-zinc-100 text-[11px] text-zinc-500 tabular">+{role.permissions.length - 3}</span>}
                                </div>
                                <div className="mt-auto pt-4 border-t border-line flex items-center justify-between">
                                    <span className="text-xs text-zinc-500 tabular">{fmt(s.permissionsCount, { count: role.permissions.length })}</span>
                                    <Button variant="ghost" size="sm" icon={Key} onClick={() => setTab('matrix')} className="-mr-2">{s.editPermissions}</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* ── Matrix ── */}
                {tab === 'matrix' && (
                    <Card padded={false}>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 sm:px-6 py-4 border-b border-line">
                            <div className="flex items-start gap-2 text-[13px] text-zinc-600 flex-1">
                                <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                                <span>{s.matrixHint}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {(['low', 'medium', 'high'] as const).map(r => <Badge key={r} tone={RISK_TONE[r]} dot>{s.risk[r]}</Badge>)}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="sticky left-0 z-10 bg-zinc-50 text-left text-xs font-medium text-zinc-500 px-5 sm:px-6 py-3 border-b border-r border-line min-w-[220px]">{s.permissionEntity}</th>
                                        {roles.map(r => (
                                            <th key={r.id} className="px-3 py-3 text-center text-xs font-medium text-zinc-700 border-b border-line bg-zinc-50/60 min-w-[96px] align-bottom">
                                                <span className={clsx('inline-block w-1.5 h-1.5 rounded-full mb-1', r.dot)} />
                                                <div className="leading-tight">{roleName(r.id)}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {permissionGroups.map(group => (
                                        <Fragment key={group.id}>
                                            <tr>
                                                <td colSpan={roles.length + 1} className="px-5 sm:px-6 py-2 text-xs font-semibold text-zinc-700 bg-zinc-50/80 border-b border-line">
                                                    <span className="sticky left-5">{s.groups[group.id]}</span>
                                                </td>
                                            </tr>
                                            {group.perms.map(perm => (
                                                <tr key={perm.id} className="hover:bg-zinc-50/50 transition-colors">
                                                    <td className="sticky left-0 z-10 bg-white px-5 sm:px-6 py-3 border-b border-r border-line">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-[13px] font-medium text-zinc-900">{s.perms[perm.id]}</div>
                                                                <div className="font-mono text-[11px] text-zinc-400">{perm.id}</div>
                                                            </div>
                                                            <Badge tone={RISK_TONE[perm.risk]}>{s.riskShort[perm.risk]}</Badge>
                                                        </div>
                                                    </td>
                                                    {roles.map(role => {
                                                        const hasPerm = role.permissions.includes(perm.id)
                                                        const isLocked = role.id === 'platform_admin'
                                                        return (
                                                            <td key={role.id} className="px-3 py-3 text-center border-b border-line">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => !isLocked && togglePermission(role.id, perm.id)}
                                                                    disabled={isLocked}
                                                                    aria-pressed={hasPerm}
                                                                    aria-label={fmt(s.toggleLabel, { role: roleName(role.id), perm: s.perms[perm.id] })}
                                                                    title={hasPerm ? s.granted : s.notGranted}
                                                                    className={clsx(
                                                                        'w-7 h-7 rounded-md flex items-center justify-center mx-auto transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                                                                        hasPerm
                                                                            ? isLocked ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-700'
                                                                            : isLocked ? 'border border-line cursor-not-allowed opacity-50' : 'border border-line text-zinc-300 hover:border-zinc-400 hover:text-zinc-500',
                                                                    )}
                                                                >
                                                                    {hasPerm ? (isLocked ? <Lock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />) : <X className="w-3 h-3" />}
                                                                </button>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* ── Audit ── */}
                {tab === 'audit' && (
                    <Card padded={false}>
                        <ul className="divide-y divide-line">
                            {auditLog.map((entry, i) => {
                                const iconTone = entry.type === 'revoke' ? 'bg-rose-50 text-rose-600' : entry.type === 'grant' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-600'
                                const Icon = entry.type === 'issue' ? Link2 : entry.type === 'revoke' ? XCircle : entry.type === 'grant' ? CheckCircle2 : entry.type === 'invite' ? Plus : Activity
                                return (
                                    <li key={i} className="flex items-start gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-zinc-50/60 transition-colors">
                                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconTone)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                                                <p className="text-sm font-medium text-zinc-900 break-words">{s.auditActions[i]}</p>
                                                <span className="text-xs text-zinc-500 whitespace-nowrap inline-flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{ago(entry.ago)}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs text-zinc-500">
                                                <span>{s.actor}: <span className="text-zinc-700">{entry.actor ?? s.systemActor}</span></span>
                                                <span className="font-mono text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">{entry.did === 'system' ? s.systemActor : entry.did}</span>
                                                {entry.txHash !== '—' && <span className="font-mono text-[11px] text-zinc-700 border border-line px-1.5 py-0.5 rounded">{entry.txHash}</span>}
                                                {entry.severity !== 'info' && <Badge tone={entry.severity === 'danger' ? 'danger' : 'warning'} icon={AlertTriangle}>{s.riskShort[entry.severity === 'danger' ? 'high' : 'medium']}</Badge>}
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </Card>
                )}
            </div>

            {/* ── Invite modal ── */}
            {showInviteModal && (
                <Modal
                    title={s.invite.title}
                    onClose={() => setShowInviteModal(false)}
                    closeLabel={s.close}
                    footer={
                        <>
                            <Button onClick={() => setShowInviteModal(false)}>{s.invite.cancel}</Button>
                            <Button variant="primary" onClick={sendInvite} disabled={!inviteForm.name || !inviteForm.email}>{s.invite.send}</Button>
                        </>
                    }
                >
                    <Field label={s.invite.fullName} htmlFor="inv-name">
                        <input id="inv-name" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} type="text" className={inputClass} placeholder={s.invite.namePlaceholder} />
                    </Field>
                    <Field label={s.invite.email} htmlFor="inv-email">
                        <input id="inv-email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} type="email" className={inputClass} placeholder="jane@company.com" />
                    </Field>
                    <Field label={s.invite.role} htmlFor="inv-role" hint={s.roles[inviteForm.role].description}>
                        <select id="inv-role" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value as RoleId }))} className={inputClass + ' cursor-pointer'}>
                            {roles.filter(r => r.id !== 'platform_admin').map(r => <option key={r.id} value={r.id}>{roleName(r.id)}</option>)}
                        </select>
                    </Field>
                    <div className="space-y-1.5">
                        <div className="text-[13px] font-medium text-zinc-700">{s.invite.modules}</div>
                        <div className="flex gap-2 flex-wrap">
                            {MODULES.map(m => {
                                const on = inviteForm.modules.includes(m)
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => setInviteForm(p => ({ ...p, modules: on ? p.modules.filter(x => x !== m) : [...p.modules, m] }))}
                                        className={clsx('h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors inline-flex items-center gap-1.5', on ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-line text-zinc-700 hover:border-zinc-300')}
                                    >
                                        {on && <Check className="w-3.5 h-3.5" />}{m}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <Callout tone="success" icon={Link2}>{s.invite.note}</Callout>
                </Modal>
            )}

            {/* ── Role change modal ── */}
            {showGrantModal && (
                <Modal
                    title={s.grant.title}
                    subtitle={showGrantModal.name}
                    onClose={() => setShowGrantModal(null)}
                    closeLabel={s.close}
                    footer={
                        <>
                            <Button onClick={() => setShowGrantModal(null)}>{s.grant.cancel}</Button>
                            <Button variant="primary" onClick={() => { issueVC(showGrantModal.id); setShowGrantModal(null) }}>{s.grant.save}</Button>
                        </>
                    }
                >
                    <div className="space-y-1.5">
                        <div className="text-[13px] font-medium text-zinc-700">{s.grant.current}</div>
                        <RoleTag role={getRoleById(showGrantModal.role)} label={roleName(showGrantModal.role)} />
                    </div>
                    <Field label={s.grant.reassign} htmlFor="grant-role">
                        <select
                            id="grant-role"
                            className={inputClass + ' cursor-pointer'}
                            defaultValue={showGrantModal.role}
                            onChange={e => setUsers(prev => prev.map(u => u.id === showGrantModal.id ? { ...u, role: e.target.value as RoleId } : u))}
                        >
                            {roles.map(r => <option key={r.id} value={r.id}>{roleName(r.id)}</option>)}
                        </select>
                    </Field>
                    <Callout tone="warning" icon={AlertTriangle}>{s.grant.warning}</Callout>
                </Modal>
            )}
        </div>
    )
}
