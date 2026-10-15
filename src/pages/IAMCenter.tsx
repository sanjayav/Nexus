import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'
import {
    Users, Shield, Key, Activity, Plus, Search,
    CheckCircle2, XCircle, UserPlus, BadgeCheck,
    Lock, AlertTriangle, Eye, Edit2,
    Link2, Clock, Check, X, Info, Sparkles, Loader2,
    Unlock, LogIn, Smartphone, Mail, KeyRound, ArrowRight, FileLock2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fmt, useFormat, useStrings, LOCALES } from '../i18n'
import { iamCenterStrings } from '../i18n/pages/iamCenter'
import { integrationStrings, SSO_MARK } from '../i18n/pages/integrations'
import { useLanguage } from '../contexts/LanguageContext'
import { PageHeader, Card, CardHeader, Button, Badge, StatCard, Tabs, EmptyState, Field, inputClass, tableClass, Tone } from '../components/ui'
import { useWorkspace, useL10n } from '../workspace/WorkspaceContext'
import type { L10n } from '../workspace/regions'
import { useToast } from '../components/useToast'

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
    /** Masked mobile number (mainland tenants sign in by phone as well as email). */
    phone?: string
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
type AuditEntry = { actor: string | null; ago: Ago; type: 'issue' | 'grant' | 'revoke' | 'invite' | 'audit'; did: string; txHash: string; severity: 'info' | 'warning' | 'danger'; text?: L10n }
const auditLog: AuditEntry[] = [
    { actor: 'Layla Al-Rashid', ago: { n: 2, unit: 'minute' }, type: 'issue', did: 'did:nexus:0xA1B2', txHash: '0x1a2b3c...', severity: 'info' },
    { actor: 'Layla Al-Rashid', ago: { n: 1, unit: 'hour' }, type: 'grant', did: 'did:nexus:0xA1B2', txHash: '0x4d5e6f...', severity: 'info' },
    { actor: null, ago: { n: 3, unit: 'hour' }, type: 'revoke', did: 'system', txHash: '0x7g8h9i...', severity: 'warning' },
    { actor: 'Ahmed Al-Balushi', ago: { n: 1, unit: 'day' }, type: 'invite', did: 'did:nexus:0xC3D4', txHash: '—', severity: 'info' },
    { actor: 'Layla Al-Rashid', ago: { n: 3, unit: 'day' }, type: 'revoke', did: 'did:nexus:0xA1B2', txHash: '0xrev001...', severity: 'danger' },
    { actor: null, ago: { n: 5, unit: 'day' }, type: 'audit', did: 'system', txHash: '0xaudit...', severity: 'info' },
]

const MODULES = ['GRI', 'MSX', 'IFRS S1', 'IFRS S2']

// ─── Mainland China tenant (绿源控股集团) ───────────────────────────────────────

const cnUsers: User[] = [
    { id: 'c1', name: '王立新', email: 'wang.lixin@lvyuan-demo.example', phone: '+86 138****2041', role: 'platform_admin', did: 'did:nexus:0x7C1E', vcHash: '0xvc3b...e01a', vcIssued: '2026-01-08', lastActive: { n: 4, unit: 'minute' }, status: 'active', modules: ['CN-SSE', 'HKEX-ESG', 'CN-CSDS', 'IFRS S2'] },
    { id: 'c2', name: '陈思远', email: 'chen.siyuan@lvyuan-demo.example', phone: '+86 139****7756', role: 'org_admin', did: 'did:nexus:0x91AF', vcHash: '0xvc5e...a7c2', vcIssued: '2026-01-08', lastActive: { n: 1, unit: 'hour' }, status: 'active', modules: ['CN-SSE', 'HKEX-ESG'] },
    { id: 'c3', name: '李婉清', email: 'li.wanqing@lvyuan-demo.example', phone: '+86 186****3310', role: 'approver', did: 'did:nexus:0x2D4B', vcHash: '0xvc8a...41d9', vcIssued: '2026-02-03', lastActive: { n: 2, unit: 'hour' }, status: 'active', modules: ['CN-SSE', 'HKEX-ESG', 'CN-CSDS'] },
    { id: 'c4', name: '赵海峰', email: 'zhao.haifeng@lvyuan-demo.example', phone: '+86 137****0928', role: 'framework_owner', did: 'did:nexus:0x6E02', vcHash: '0xvc0f...93be', vcIssued: '2026-02-11', lastActive: { n: 1, unit: 'day' }, status: 'active', modules: ['HKEX-ESG', 'IFRS S2'] },
    { id: 'c5', name: '刘佳怡', email: 'liu.jiayi@lvyuan-demo.example', phone: '+86 150****6612', role: 'data_contributor', did: 'did:nexus:0xB7C3', vcHash: '0xvc2c...6f40', vcIssued: '2026-03-02', lastActive: { n: 3, unit: 'hour' }, status: 'active', modules: ['CN-SSE'] },
    { id: 'c6', name: '郑明轩', email: 'zheng.mingxuan@assurance-partner.cn', phone: '+86 135****4487', role: 'external_auditor', did: 'did:nexus:0x4F9D', vcHash: '0xvc9d...27e5', vcIssued: '2026-03-18', lastActive: { n: 2, unit: 'day' }, status: 'active', modules: ['CN-SSE', 'HKEX-ESG', 'CN-CSDS', 'IFRS S2'] },
    { id: 'c7', name: '孙晓彤', email: 'sun.xiaotong@lvyuan-demo.example', phone: '+86 152****8803', role: 'reviewer', did: 'did:nexus:0xA0E8', vcHash: '0xvc6a...d215', vcIssued: '2026-04-07', lastActive: { n: 5, unit: 'hour' }, status: 'active', modules: ['HKEX-ESG', 'CN-CSDS'] },
    { id: 'c8', name: '周子豪', email: 'zhou.zihao@lvyuan-demo.example', phone: '+86 187****1159', role: 'reviewer', did: '—', vcHash: '—', vcIssued: '—', lastActive: null, status: 'pending', modules: [] },
]

const cnAuditLog: AuditEntry[] = [
    { actor: '王立新', ago: { n: 4, unit: 'minute' }, type: 'issue', did: 'did:nexus:0x7C1E', txHash: '0x3f9a1c...', severity: 'info', text: { en: 'Issued VC to 郑明轩 (External Auditor)', zh: '已向 郑明轩（外部审计师）签发 VC' } },
    { actor: '王立新', ago: { n: 1, unit: 'hour' }, type: 'grant', did: 'did:nexus:0x7C1E', txHash: '0x8b20e4...', severity: 'info', text: { en: 'Role changed: 刘佳怡 → Data Contributor', zh: '角色变更：刘佳怡 → 数据填报人' } },
    { actor: null, ago: { n: 3, unit: 'hour' }, type: 'revoke', did: 'system', txHash: '0x51c7d0...', severity: 'warning', text: { en: 'Permission matrix updated: Reviewer role — removed evidence.upload', zh: '权限矩阵已更新：复核人角色移除 evidence.upload' } },
    { actor: '陈思远', ago: { n: 1, unit: 'day' }, type: 'invite', did: 'did:nexus:0x91AF', txHash: '—', severity: 'info', text: { en: 'Invited 周子豪 as Reviewer', zh: '已邀请 周子豪 担任复核人' } },
    { actor: '王立新', ago: { n: 3, unit: 'day' }, type: 'revoke', did: 'did:nexus:0x7C1E', txHash: '0xrev7e2...', severity: 'danger', text: { en: 'VC revoked: departed employee did:nexus:0x0LD9', zh: 'VC 已撤销：离职员工 did:nexus:0x0LD9' } },
    { actor: null, ago: { n: 5, unit: 'day' }, type: 'audit', did: 'system', txHash: '0xaud3c1...', severity: 'info', text: { en: 'Periodic VC validity audit — all 7 VCs valid', zh: '定期 VC 有效性审计：全部 7 个 VC 均有效' } },
    { actor: null, ago: { n: 6, unit: 'day' }, type: 'audit', did: 'system', txHash: '—', severity: 'info', text: { en: 'Personal-information access log archived (PIPL processing record)', zh: '个人信息访问日志已归档（个人信息处理活动记录）' } },
]

const CN_MODULES = ['CN-SSE', 'HKEX-ESG', 'CN-CSDS', 'IFRS S2']

const initials = (name: string) => (/[\u4e00-\u9fff]/.test(name) ? name.slice(-2) : name.split(' ').map(n => n[0]).join('').slice(0, 2))

type Tab = 'users' | 'roles' | 'matrix' | 'identity' | 'audit'

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
        success: 'bg-emerald-50/60 border-emerald-200/70 text-emerald-900 [&_svg]:text-emerald-700',
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
    const { workspace } = useWorkspace()
    // Remount per workspace so users, roles and edits never leak across tenants.
    return <IAMCenterView key={workspace.id} />
}

function IAMCenterView() {
    const s = useStrings(iamCenterStrings)
    const names = useStrings(integrationStrings)
    const f = useFormat()
    const l10n = useL10n()
    const navigate = useNavigate()
    const { region } = useWorkspace()
    const isCn = region.id === 'cn'
    const { toast, show } = useToast()
    const { locale } = useLanguage()
    const rtf = useMemo(() => new Intl.RelativeTimeFormat(LOCALES.find(l => l.code === locale)!.intl, { numeric: 'auto' }), [locale])
    const ago = (a: Ago) => (a ? rtf.format(-a.n, a.unit) : s.never)

    const modules = isCn ? CN_MODULES : MODULES
    const tenantAudit = isCn ? cnAuditLog : auditLog
    const auditText = (entry: AuditEntry, i: number) => (entry.text ? l10n(entry.text) : s.auditActions[i])

    const [tab, setTab] = useState<Tab>('users')
    const [roles, setRoles] = useState<Role[]>(initialRoles)
    const [users, setUsers] = useState<User[]>(isCn ? cnUsers : initialUsers)
    const [search, setSearch] = useState('')
    const [selectedRole, setSelectedRole] = useState<RoleId | null>(null)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showGrantModal, setShowGrantModal] = useState<User | null>(null)
    const [grantRole, setGrantRole] = useState<RoleId>('data_contributor')
    const [vcIssueing, setVcIssuing] = useState<string | null>(null)
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', role: 'data_contributor' as RoleId, modules: [] as string[] })
    const [activityUser, setActivityUser] = useState<string | null>(null)
    const [consentOn, setConsentOn] = useState(true)

    const visibleAudit = tenantAudit
        .map((entry, i) => ({ entry, text: auditText(entry, i) }))
        .filter(({ entry, text }) => !activityUser || entry.actor === activityUser || text.includes(activityUser))

    const openActivity = (user: User) => {
        setActivityUser(user.name)
        setTab('audit')
    }

    const toggleSuspend = (user: User) => {
        const next = user.status === 'suspended' ? 'active' : 'suspended'
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, status: next } : u)))
        show(fmt(next === 'suspended' ? s.suspendedToast : s.reactivatedToast, { name: user.name }), next === 'suspended' ? 'warning' : 'success')
    }

    const openGrant = (user: User) => {
        setGrantRole(user.role)
        setShowGrantModal(user)
    }

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
        const digits = inviteForm.phone.replace(/\D/g, '')
        const phone = digits.length >= 7 ? `+86 ${digits.slice(0, 3)}****${digits.slice(-4)}` : undefined
        setUsers(prev => [...prev, { id: `u${Date.now()}`, name: inviteForm.name, email: inviteForm.email, phone, role: inviteForm.role, did: '—', vcHash: '—', vcIssued: '—', lastActive: null, status: 'pending', modules: inviteForm.modules }])
        show(fmt(s.invitedToast, { email: inviteForm.email }))
        setInviteForm({ name: '', email: '', phone: '', role: 'data_contributor', modules: [] })
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
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-zinc-900">{s.calloutTitle}</h3>
                        <p className="text-[13px] text-zinc-600 leading-relaxed mt-1 max-w-4xl">{fmt(s.calloutBody, { chain: l10n(region.chain.network) })}</p>
                    </div>
                </Card>

                <Tabs
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: 'users', label: <><Users className="w-3.5 h-3.5" />{s.tabs.users}</>, count: users.length },
                        { value: 'roles', label: <><Shield className="w-3.5 h-3.5" />{s.tabs.roles}</>, count: roles.length },
                        { value: 'matrix', label: <><Key className="w-3.5 h-3.5" />{s.tabs.matrix}</> },
                        { value: 'identity', label: <><LogIn className="w-3.5 h-3.5" />{s.tabs.identity}</> },
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
                                                                {initials(user.name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium text-zinc-900">{user.name}</div>
                                                                <div className="text-xs text-zinc-500 whitespace-nowrap">{user.email}</div>
                                                                {user.phone && <div className="text-xs text-zinc-400 tabular">{user.phone}</div>}
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
                                                            <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={s.editRole} title={s.editRole} onClick={() => openGrant(user)}><Edit2 className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={s.viewActivity} title={s.viewActivity} onClick={() => openActivity(user)}><Eye className="w-4 h-4" /></Button>
                                                            {user.status === 'suspended' ? (
                                                                <Button variant="ghost" size="sm" className="w-8 px-0 hover:text-emerald-700" aria-label={s.reactivate} title={s.reactivate} onClick={() => toggleSuspend(user)}><Unlock className="w-4 h-4" /></Button>
                                                            ) : (
                                                                <Button variant="ghost" size="sm" className="w-8 px-0 hover:text-rose-600" aria-label={s.suspend} title={s.suspend} disabled={user.role === 'platform_admin'} onClick={() => toggleSuspend(user)}><Lock className="w-4 h-4" /></Button>
                                                            )}
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

                {/* ── Sign-in & SSO ── */}
                {tab === 'identity' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 items-start">
                        <Card>
                            <CardHeader icon={LogIn} title={s.identity.providersTitle} description={fmt(s.identity.providersDesc, { region: l10n(region.label) })} />
                            <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                                {region.sso.map(p => (
                                    <li key={p} className="flex items-center gap-3 px-4 py-3.5">
                                        <span className={clsx('w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0', SSO_MARK[p].className)} aria-hidden>{SSO_MARK[p].mark}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-zinc-900">{names.sso[p]}</div>
                                            <div className="text-xs text-zinc-500 mt-0.5">{s.identity.protocols[p]}</div>
                                        </div>
                                        <Badge tone="neutral" dot className="hidden sm:inline-flex">{s.identity.notConfigured}</Badge>
                                        <Button size="sm" onClick={() => show(fmt(s.identity.configureNote, { provider: names.sso[p] }), 'info')}>{s.identity.configure}</Button>
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        <Card>
                            <CardHeader icon={KeyRound} title={s.identity.methodsTitle} description={s.identity.methodsDesc} />
                            <ul className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                                {[
                                    { icon: Mail, title: s.identity.emailPassword, sub: s.identity.emailPasswordSub, badge: <Badge tone="success" dot>{s.identity.enabled}</Badge> },
                                    { icon: Shield, title: s.identity.mfa, sub: s.identity.mfaSub, badge: <Badge tone="info">{s.identity.optional}</Badge> },
                                    ...(isCn ? [{ icon: Smartphone, title: s.identity.sms, sub: s.identity.smsSub, badge: <Badge tone="neutral" dot>{s.identity.notConfigured}</Badge> }] : []),
                                ].map(m => (
                                    <li key={m.title} className="flex items-center gap-3 px-4 py-3.5">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0"><m.icon className="w-4 h-4" /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-zinc-900">{m.title}</div>
                                            <div className="text-xs text-zinc-500 mt-0.5">{m.sub}</div>
                                        </div>
                                        {m.badge}
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        {isCn && (
                            <Card className="xl:col-span-2">
                                <CardHeader icon={FileLock2} title={s.identity.piplTitle} description={s.identity.piplDesc} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="flex items-start gap-3 rounded-xl border border-line p-4 cursor-pointer hover:bg-zinc-50/70 transition-colors">
                                        <input type="checkbox" checked={consentOn} onChange={e => setConsentOn(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-brand-500/40" />
                                        <div>
                                            <div className="text-sm font-medium text-zinc-900">{s.identity.consent}</div>
                                            <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.identity.consentSub}</div>
                                        </div>
                                    </label>
                                    <div className="rounded-xl border border-line p-4">
                                        <div className="text-sm font-medium text-zinc-900">{s.identity.minimal}</div>
                                        <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.identity.minimalSub}</div>
                                    </div>
                                    <div className="rounded-xl border border-line p-4">
                                        <Field label={s.identity.logRetention} htmlFor="pipl-retention">
                                            <select id="pipl-retention" defaultValue={s.identity.logOptions[1]} className={inputClass + ' cursor-pointer'}>
                                                {s.identity.logOptions.map(o => <option key={o}>{o}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="rounded-xl border border-line p-4 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-zinc-900">{s.identity.crossBorder}</div>
                                            <div className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.identity.crossBorderSub}</div>
                                        </div>
                                        <Button size="sm" iconRight={ArrowRight} onClick={() => navigate('/admin')}>{s.identity.open}</Button>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ── Audit ── */}
                {tab === 'audit' && (
                    <div className="space-y-4">
                        {isCn && <Callout tone="info" icon={FileLock2}>{s.identity.auditPipl}</Callout>}
                        {activityUser && (
                            <div className="flex flex-wrap items-center gap-2 text-[13px] text-zinc-600">
                                <span>{fmt(s.activityFor, { name: activityUser })}</span>
                                <Button size="sm" variant="ghost" icon={X} onClick={() => setActivityUser(null)}>{s.showAll}</Button>
                            </div>
                        )}
                    <Card padded={false}>
                        {visibleAudit.length === 0 ? (
                            <EmptyState icon={Activity} title={s.noActivity} action={<Button size="sm" onClick={() => setActivityUser(null)}>{s.showAll}</Button>} />
                        ) : (
                        <ul className="divide-y divide-line">
                            {visibleAudit.map(({ entry, text }, i) => {
                                const iconTone = entry.type === 'revoke' ? 'bg-rose-50 text-rose-600' : entry.type === 'grant' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                                const Icon = entry.type === 'issue' ? Link2 : entry.type === 'revoke' ? XCircle : entry.type === 'grant' ? CheckCircle2 : entry.type === 'invite' ? Plus : Activity
                                return (
                                    <li key={i} className="flex items-start gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-zinc-50/60 transition-colors">
                                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconTone)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                                                <p className="text-sm font-medium text-zinc-900 break-words">{text}</p>
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
                        )}
                    </Card>
                    </div>
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
                        <input id="inv-email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} type="email" className={inputClass} placeholder={s.invite.emailPlaceholder} />
                    </Field>
                    {isCn && (
                        <Field label={s.invite.phone} htmlFor="inv-phone">
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-[10px] border border-r-0 border-line bg-zinc-50 text-sm text-zinc-600 tabular">+86</span>
                                <input id="inv-phone" value={inviteForm.phone} onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value.replace(/[^\d ]/g, '') }))} type="tel" inputMode="numeric" maxLength={13} className={inputClass + ' rounded-l-none tabular'} placeholder={s.invite.phonePlaceholder} />
                            </div>
                        </Field>
                    )}
                    <Field label={s.invite.role} htmlFor="inv-role" hint={s.roles[inviteForm.role].description}>
                        <select id="inv-role" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value as RoleId }))} className={inputClass + ' cursor-pointer'}>
                            {roles.filter(r => r.id !== 'platform_admin').map(r => <option key={r.id} value={r.id}>{roleName(r.id)}</option>)}
                        </select>
                    </Field>
                    <div className="space-y-1.5">
                        <div className="text-[13px] font-medium text-zinc-700">{s.invite.modules}</div>
                        <div className="flex gap-2 flex-wrap">
                            {modules.map(m => {
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
                    {isCn && <Callout tone="info" icon={FileLock2}>{fmt(s.invite.piplNote, { privacy: l10n(region.privacy) })}</Callout>}
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
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setUsers(prev => prev.map(u => (u.id === showGrantModal.id ? { ...u, role: grantRole } : u)))
                                    issueVC(showGrantModal.id)
                                    show(fmt(s.savedToast, { name: showGrantModal.name }))
                                    setShowGrantModal(null)
                                }}
                            >
                                {s.grant.save}
                            </Button>
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
                            value={grantRole}
                            onChange={e => setGrantRole(e.target.value as RoleId)}
                        >
                            {roles.map(r => <option key={r.id} value={r.id}>{roleName(r.id)}</option>)}
                        </select>
                    </Field>
                    <Callout tone="warning" icon={AlertTriangle}>{s.grant.warning}</Callout>
                </Modal>
            )}
            {toast}
        </div>
    )
}
