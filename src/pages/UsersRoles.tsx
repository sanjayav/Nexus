import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Users, Shield, UserPlus, CheckCircle2, X, Search, Pencil, UserX,
  Plus, AlertTriangle, Mail, Info, LogIn, Loader2, Zap,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import { useAuth } from '../auth/AuthContext'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import {
  users as usersApi,
  roles as rolesApi,
  permissions as permissionsApi,
  setup as setupApi,
  type ApiUser,
  type ApiRole,
  type ApiPermission,
} from '../lib/api'

/* ─── Demo data (when DB not connected) ────────────────────────── */
const DEMO_USERS: ApiUser[] = [
  { id: '1', email: 'admin@aeiforo.com',    name: 'Jane Mitchell', avatar_url: null, is_active: true,  created_at: '2026-01-15T09:00:00Z', last_login: '2026-04-09T08:30:00Z', roles: [{ id: 'r1', name: 'Platform Admin', slug: 'admin' }] },
  { id: '2', email: 'tl@aeiforo.com',       name: 'Tom Harris',    avatar_url: null, is_active: true,  created_at: '2026-02-01T09:00:00Z', last_login: '2026-04-08T14:20:00Z', roles: [{ id: 'r2', name: 'Team Lead',     slug: 'team-lead' }] },
  { id: '3', email: 'fm@aeiforo.com',       name: 'Sarah Chen',    avatar_url: null, is_active: true,  created_at: '2026-02-10T09:00:00Z', last_login: '2026-04-07T11:45:00Z', roles: [{ id: 'r3', name: 'Analyst',       slug: 'analyst' }] },
  { id: '4', email: 'so@aeiforo.com',       name: 'Alex Rivera',   avatar_url: null, is_active: true,  created_at: '2026-03-05T09:00:00Z', last_login: '2026-04-06T16:10:00Z', roles: [{ id: 'r5', name: 'Viewer',        slug: 'viewer' }] },
]

const DEMO_ROLES: ApiRole[] = [
  { id: 'r1', name: 'Platform Admin', slug: 'admin',     description: 'Full access — manages users, org, and all modules.',                                          is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
  { id: 'r2', name: 'Team Lead',      slug: 'team-lead', description: 'Reviews and approves data submissions, manages a subsidiary or plant.',                       is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
  { id: 'r3', name: 'Analyst',        slug: 'analyst',   description: 'Enters data, runs calculators, drafts reports — does not approve.',                            is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
  { id: 'r4', name: 'Auditor',        slug: 'auditor',   description: 'Read-only access to published data and the audit trail. Cannot edit anything.',                is_system: true, created_at: '2026-01-01', permissions: [], userCount: 0 },
  { id: 'r5', name: 'Viewer',         slug: 'viewer',    description: 'Read-only access to dashboards and reports. The lightest-touch role.',                          is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
]

const DEMO_PERMISSIONS: ApiPermission[] = [
  { id: 'p1', resource: 'dashboard',  action: 'view',    description: 'View dashboard' },
  { id: 'p2', resource: 'data',       action: 'view',    description: 'View data' },
  { id: 'p3', resource: 'data',       action: 'upload',  description: 'Upload data' },
  { id: 'p4', resource: 'data',       action: 'approve', description: 'Approve data' },
  { id: 'p5', resource: 'reports',    action: 'view',    description: 'View reports' },
  { id: 'p6', resource: 'reports',    action: 'create',  description: 'Create reports' },
  { id: 'p7', resource: 'reports',    action: 'publish', description: 'Publish reports' },
  { id: 'p8', resource: 'workflow',   action: 'view',    description: 'View workflow' },
  { id: 'p9', resource: 'workflow',   action: 'approve', description: 'Approve workflow' },
  { id: 'p10',resource: 'admin',      action: 'users',   description: 'Manage users' },
  { id: 'p11',resource: 'admin',      action: 'roles',   description: 'Manage roles' },
  { id: 'p12',resource: 'audit',      action: 'view',    description: 'View audit trail' },
]
const DEMO_ROLE_PERMS: Record<string, string[]> = {
  'admin':     DEMO_PERMISSIONS.map(p => p.id),
  'team-lead': ['p1','p2','p3','p4','p5','p6','p8','p9','p10','p12'],
  'analyst':   ['p1','p2','p3','p5','p6','p8'],
  'viewer':    ['p1','p2','p5','p8'],
  'auditor':   ['p1','p2','p5','p8','p12'],
}

/* ─── Role colour map ─────────────────────────────────────────── */
const ROLE_COLORS: Record<string, { badge: 'teal' | 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'gray'; accent: string }> = {
  'admin':     { badge: 'teal',   accent: 'var(--accent-teal)' },
  'team-lead': { badge: 'blue',   accent: 'var(--accent-blue)' },
  'analyst':   { badge: 'purple', accent: 'var(--accent-purple)' },
  'viewer':    { badge: 'gray',   accent: 'var(--text-tertiary)' },
  'auditor':   { badge: 'amber',  accent: 'var(--accent-amber)' },
}
const colorFor = (slug: string) => ROLE_COLORS[slug] ?? ROLE_COLORS['viewer']

/* ─── Quick-login role catalog (canonical 7 roles from rbac.ts) ─ */
const ROLE_LOGIN: Record<PlatformRole, { email: string; short: string; accent: string }> = {
  platform_admin:               { email: 'admin@aeiforo.com',    short: 'ADM', accent: '#047857' },
  group_sustainability_officer: { email: 'so@aeiforo.com',       short: 'GSO', accent: '#059669' },
  subsidiary_lead:              { email: 'tl@aeiforo.com',       short: 'SL',  accent: '#5B7FB8' },
  plant_manager:                { email: 'fm@aeiforo.com',       short: 'PM',  accent: '#7C5FB8' },
  data_contributor:             { email: 'maya@aeiforo.com',     short: 'DC',  accent: '#B85F9C' },
  narrative_owner:              { email: 'narrator@aeiforo.com', short: 'NO',  accent: '#C2410C' },
  auditor:                      { email: 'aud@aeiforo.com',      short: 'AUD', accent: '#E6A817' },
}
// Dev defaults to 'demo2026' so the role tiles work without local env setup.
// Production must set VITE_DEMO_PASSWORD explicitly or the switcher hides.
const ROLE_DEMO_PASSWORD: string = import.meta.env.VITE_DEMO_PASSWORD
  ?? (import.meta.env.DEV ? 'demo2026' : '')

/* ─── i18n helpers — display labels only; slugs/enums stay unchanged ─ */
const isZhLang = (lng: string | undefined) => !!lng && lng.startsWith('zh')
const dateLocaleFor = (lng: string | undefined) =>
  isZhLang(lng) ? 'zh-CN' : lng?.startsWith('th') ? 'th-TH' : 'en-GB'
// Seeded system roles whose display name/description have translations.
const SYSTEM_ROLE_SLUGS = new Set(['admin', 'team-lead', 'analyst', 'auditor', 'viewer'])

function useRoleText() {
  const { t, i18n } = useTranslation()
  const zh = isZhLang(i18n.language)
  const roleName = (r: { slug: string; name: string }) =>
    zh && SYSTEM_ROLE_SLUGS.has(r.slug) ? t(`usersRoles.systemRoles.${r.slug}.name`, { defaultValue: r.name }) : r.name
  const roleDescription = (r: { slug: string; description: string }) =>
    zh && SYSTEM_ROLE_SLUGS.has(r.slug) ? t(`usersRoles.systemRoles.${r.slug}.description`, { defaultValue: r.description }) : r.description
  const permResource = (resource: string) => t(`usersRoles.permResources.${resource}`, { defaultValue: resource })
  const permAction = (action: string) => t(`usersRoles.permActions.${action}`, { defaultValue: action })
  const permDescription = (p: ApiPermission) =>
    zh ? t(`usersRoles.permDescriptions.${p.resource}.${p.action}`, { defaultValue: p.description }) : p.description
  return { roleName, roleDescription, permResource, permAction, permDescription }
}

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */
export default function UsersRoles() {
  const { dbConnected, login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { roleName } = useRoleText()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [permissions, setPermissions] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [search, setSearch] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [viewingRole, setViewingRole] = useState<ApiRole | null>(null)
  const [editingRole, setEditingRole] = useState<ApiRole | 'new' | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<PlatformRole | null>(null)

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    if (dbConnected) {
      try {
        const [u, r, p] = await Promise.all([usersApi.list(), rolesApi.list(), permissionsApi.list()])
        setUsers(u); setRoles(r); setPermissions(p)
      } catch {
        applyDemoData()
      }
    } else {
      applyDemoData()
    }
    setLoading(false)
  }, [dbConnected])

  const applyDemoData = () => {
    setUsers(DEMO_USERS)
    setRoles(DEMO_ROLES.map(r => ({
      ...r,
      permissions: DEMO_PERMISSIONS.filter(p => DEMO_ROLE_PERMS[r.slug]?.includes(p.id)),
    })))
    setPermissions(DEMO_PERMISSIONS)
  }

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roles.some(r => r.name.toLowerCase().includes(q) || roleName(r).toLowerCase().includes(q))
    )
  }, [users, search, roleName])

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
  }), [users])

  /* ── Mutations ── */
  async function handleSetupDb() {
    setSettingUp(true)
    try {
      await setupApi.run()
      showToast('ok', t('usersRoles.toast.dbConnected'))
      setSetupOpen(false)
      loadData()
    } catch (e) {
      showToast('err', t('usersRoles.toast.setupFailed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
    } finally {
      setSettingUp(false)
    }
  }

  async function createUser(form: { email: string; name: string; password: string; roleId: string }) {
    if (dbConnected) {
      try {
        await usersApi.create({ email: form.email, name: form.name, password: form.password, roleId: form.roleId || undefined })
        showToast('ok', t('usersRoles.toast.userAdded', { name: form.name }))
        loadData()
      } catch (e) {
        showToast('err', t('usersRoles.toast.failed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
      }
    } else {
      const role = roles.find(r => r.id === form.roleId)
      setUsers(prev => [...prev, {
        id: crypto.randomUUID(),
        email: form.email,
        name: form.name,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null,
        roles: role ? [{ id: role.id, name: role.name, slug: role.slug }] : [],
      }])
      showToast('ok', t('usersRoles.toast.userAddedDemo', { name: form.name }))
    }
    setAddOpen(false)
  }

  async function changeUserRole(userId: string, roleId: string) {
    if (dbConnected) {
      try {
        await usersApi.update(userId, { roleIds: roleId ? [roleId] : [] })
        showToast('ok', t('usersRoles.toast.roleUpdated'))
        loadData()
      } catch (e) {
        showToast('err', t('usersRoles.toast.failed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
      }
    } else {
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        const role = roles.find(r => r.id === roleId)
        return { ...u, roles: role ? [{ id: role.id, name: role.name, slug: role.slug }] : [] }
      }))
      showToast('ok', t('usersRoles.toast.roleUpdatedDemo'))
    }
    setEditingUser(null)
  }

  async function switchToRole(role: PlatformRole) {
    if (!ROLE_DEMO_PASSWORD) {
      showToast('err', t('usersRoles.toast.quickLoginDisabled'))
      return
    }
    const acc = ROLE_LOGIN[role]
    setSwitchingTo(role)
    try {
      const ok = await login(acc.email, ROLE_DEMO_PASSWORD)
      if (!ok) {
        showToast('err', t('usersRoles.toast.signInFailed', { email: acc.email }))
        return
      }
      const home = ROLE_CATALOG[role].homeRoute
      navigate(home, { replace: true })
    } catch (e) {
      showToast('err', t('usersRoles.toast.failed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
    } finally {
      setSwitchingTo(null)
    }
  }

  async function saveRole(form: { name: string; slug: string; description: string; permissionIds: string[] }, existingId?: string) {
    if (!dbConnected) {
      // Demo: keep it local-only — the platform admin tour still works.
      if (existingId) {
        setRoles(prev => prev.map(r => r.id === existingId
          ? { ...r, name: form.name, description: form.description, permissions: permissions.filter(p => form.permissionIds.includes(p.id)) }
          : r))
        showToast('ok', t('usersRoles.toast.roleUpdatedDemo'))
      } else {
        setRoles(prev => [...prev, {
          id: crypto.randomUUID(),
          name: form.name, slug: form.slug, description: form.description,
          is_system: false,
          created_at: new Date().toISOString(),
          permissions: permissions.filter(p => form.permissionIds.includes(p.id)),
          userCount: 0,
        }])
        showToast('ok', t('usersRoles.toast.roleCreatedDemo', { name: form.name }))
      }
      setEditingRole(null)
      return
    }
    try {
      if (existingId) {
        await rolesApi.update(existingId, { name: form.name, description: form.description, permissionIds: form.permissionIds })
        showToast('ok', t('usersRoles.toast.roleUpdated'))
      } else {
        await rolesApi.create({ name: form.name, slug: form.slug, description: form.description, permissionIds: form.permissionIds })
        showToast('ok', t('usersRoles.toast.roleCreated', { name: form.name }))
      }
      setEditingRole(null)
      loadData()
    } catch (e) {
      showToast('err', t('usersRoles.toast.failed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
    }
  }

  async function deleteRole(r: ApiRole) {
    if (r.is_system) {
      showToast('err', t('usersRoles.toast.systemRoleDelete'))
      return
    }
    if (!window.confirm(t('usersRoles.toast.confirmDeleteRole', { name: roleName(r) }))) return
    if (!dbConnected) {
      setRoles(prev => prev.filter(x => x.id !== r.id))
      showToast('ok', t('usersRoles.toast.roleRemovedDemo', { name: roleName(r) }))
      return
    }
    try {
      await rolesApi.delete(r.id)
      showToast('ok', t('usersRoles.toast.roleRemoved', { name: roleName(r) }))
      loadData()
    } catch (e) {
      showToast('err', t('usersRoles.toast.failed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
    }
  }

  async function toggleActive(u: ApiUser) {
    const next = !u.is_active
    if (dbConnected) {
      try {
        await usersApi.update(u.id, { isActive: next })
        showToast('ok', next ? t('usersRoles.toast.userReactivated', { name: u.name }) : t('usersRoles.toast.userDeactivated', { name: u.name }))
        loadData()
      } catch (e) {
        showToast('err', t('usersRoles.toast.failed', { message: e instanceof Error ? e.message : t('usersRoles.toast.unknownError') }))
      }
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: next } : x))
      showToast('ok', next ? t('usersRoles.toast.userReactivatedDemo', { name: u.name }) : t('usersRoles.toast.userDeactivatedDemo', { name: u.name }))
    }
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      {toast && <Toast kind={toast.kind} msg={toast.msg} onClose={() => setToast(null)} />}

      <PageHeader
        breadcrumbs={[
          { label: t('usersRoles.breadcrumbAdmin') },
          { label: t('usersRoles.title') },
        ]}
        eyebrow={t('usersRoles.eyebrow')}
        title={t('usersRoles.title')}
        description={t('usersRoles.description')}
        actions={
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" /> {t('usersRoles.addUser')}
          </button>
        }
      />

      {!dbConnected && (
        <div className="surface-paper p-3 flex items-center gap-3" style={{ borderColor: 'rgba(230,168,23,0.3)', background: 'rgba(230,168,23,0.04)' }}>
          <Info className="w-4 h-4 text-[var(--status-draft)] flex-shrink-0" />
          <div className="flex-1 text-[12px] text-[var(--text-secondary)]">
            <strong>{t('usersRoles.demoBanner.strong')}</strong>{t('usersRoles.demoBanner.text')}
          </div>
          <button onClick={() => setSetupOpen(true)} className="text-[12px] font-semibold text-[var(--color-brand)] hover:underline cursor-pointer">
            {t('usersRoles.demoBanner.connect')}
          </button>
        </div>
      )}

      {/* Compact KPI strip — only what matters */}
      <div className="grid grid-cols-3 gap-3">
        <KpiTile icon={Users}        label={t('usersRoles.kpi.teamMembers')}   value={stats.total}  accent="var(--accent-teal)" />
        <KpiTile icon={CheckCircle2} label={t('usersRoles.kpi.active')}        value={stats.active} accent="var(--status-ok)" subtle={t('usersRoles.kpi.ofTotal', { total: stats.total })} />
        <KpiTile icon={Shield}       label={t('usersRoles.kpi.rolesDefined')}  value={roles.length} accent="var(--accent-purple)" />
      </div>

      {/* Users table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{t('usersRoles.users.heading')}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={t('usersRoles.users.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 h-9 w-[260px] rounded-[8px] bg-[var(--bg-primary)] border border-[var(--border-default)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)]"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyUsers hasSearch={!!search} onAdd={() => setAddOpen(true)} onClearSearch={() => setSearch('')} />
        ) : (
          <div className="surface-paper overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left px-5 py-2.5 text-micro font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">{t('usersRoles.users.colUser')}</th>
                  <th className="text-left px-5 py-2.5 text-micro font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">{t('usersRoles.users.colRole')}</th>
                  <th className="text-left px-5 py-2.5 text-micro font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">{t('usersRoles.users.colLastSeen')}</th>
                  <th className="text-right px-5 py-2.5 text-micro font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">{t('usersRoles.users.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onEdit={() => setEditingUser(u)}
                    onToggle={() => toggleActive(u)}
                    onRoleClick={(role) => {
                      const full = roles.find(r => r.id === role.id) ?? null
                      setViewingRole(full)
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick role switcher — 7 canonical platform roles for live demos */}
      {ROLE_DEMO_PASSWORD && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--color-brand)]" /> {t('usersRoles.switcher.heading')}
              </h2>
              <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
                {t('usersRoles.switcher.intro')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {(Object.keys(ROLE_LOGIN) as PlatformRole[]).map(roleKey => {
              const meta = ROLE_LOGIN[roleKey]
              const def = ROLE_CATALOG[roleKey]
              const defName = t(`usersRoles.platformRoles.${roleKey}`, { defaultValue: def.name })
              const busy = switchingTo === roleKey
              const anyBusy = switchingTo !== null
              return (
                <button
                  key={roleKey}
                  onClick={() => switchToRole(roleKey)}
                  disabled={anyBusy}
                  title={`${defName} — ${meta.email}`}
                  className="relative flex flex-col items-start text-left p-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--color-brand)] hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] text-caption font-bold text-white tracking-[0.04em]"
                      style={{ background: meta.accent }}
                    >
                      {meta.short}
                    </span>
                    {busy
                      ? <Loader2 className="w-3.5 h-3.5 text-[var(--color-brand)] animate-spin" />
                      : <LogIn className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <div className="text-[12px] font-semibold text-[var(--text-primary)] leading-tight tracking-[-0.005em] line-clamp-2 min-h-[28px]">
                    {defName}
                  </div>
                  <div className="text-caption text-[var(--text-tertiary)] mt-1 truncate w-full">
                    {meta.email}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-caption text-[var(--text-tertiary)] mt-2 leading-relaxed">
            <Info className="inline w-3 h-3 mr-1 align-[-2px]" />
            {t('usersRoles.switcher.footnote')}
          </p>
        </section>
      )}

      {/* Roles section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{t('usersRoles.roles.heading')}</h2>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('usersRoles.roles.intro')}</p>
          </div>
          <button onClick={() => setEditingRole('new')} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[12.5px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> {t('usersRoles.roles.newRole')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map(r => (
            <RoleTile
              key={r.id}
              role={r}
              onClick={() => setViewingRole(r)}
              onEdit={() => setEditingRole(r)}
              onDelete={() => deleteRole(r)}
            />
          ))}
        </div>
      </section>

      {/* Modals */}
      {addOpen && <AddUserModal roles={roles} onClose={() => setAddOpen(false)} onCreate={createUser} />}
      {editingUser && (
        <EditRoleModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSave={(roleId) => changeUserRole(editingUser.id, roleId)}
        />
      )}
      {viewingRole && <RoleDetailModal role={viewingRole} permissions={permissions} onClose={() => setViewingRole(null)} />}
      {editingRole && (
        <RoleEditorModal
          initial={editingRole === 'new' ? null : editingRole}
          permissions={permissions}
          onClose={() => setEditingRole(null)}
          onSave={(form) => saveRole(form, editingRole === 'new' ? undefined : editingRole.id)}
        />
      )}
      {setupOpen && <DbSetupModal onClose={() => setSetupOpen(false)} onSetup={handleSetupDb} loading={settingUp} />}
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────────── */

function Toast({ kind, msg, onClose }: { kind: 'ok' | 'err'; msg: string; onClose: () => void }) {
  const ok = kind === 'ok'
  return (
    <div
      role="status"
      className="fixed top-6 right-6 z-50 inline-flex items-start gap-2 px-4 py-2.5 rounded-[10px] border text-[13px] font-medium shadow-lg animate-fade-in"
      style={{
        background: ok ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
        color: ok ? 'var(--status-ok)' : 'var(--status-reject)',
        borderColor: ok ? 'rgba(46,125,50,0.3)' : 'rgba(220,38,38,0.3)',
      }}
    >
      {ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function KpiTile({ icon: Icon, label, value, accent, subtle }: { icon: typeof Users; label: string; value: number; accent: string; subtle?: string }) {
  return (
    <div className="surface-paper p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${accent}15`, color: accent }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)]">{label}</div>
        <div className="font-display text-[20px] font-bold tabular-nums text-[var(--text-primary)] tracking-[-0.01em] leading-tight">
          {value}
          {subtle && <span className="text-[12px] font-medium text-[var(--text-tertiary)] ml-1">{subtle}</span>}
        </div>
      </div>
    </div>
  )
}

function UserRow({ user, onEdit, onToggle, onRoleClick }: {
  user: ApiUser
  onEdit: () => void
  onToggle: () => void
  onRoleClick: (role: ApiUser['roles'][number]) => void
}) {
  const { t, i18n } = useTranslation()
  const { roleName } = useRoleText()
  const role = user.roles[0]
  const colors = role ? colorFor(role.slug) : ROLE_COLORS['viewer']
  return (
    <tr className={`hover:bg-[var(--bg-secondary)] transition-colors ${!user.is_active ? 'opacity-60' : ''}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
            style={{ background: colors.accent }}
          >
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
              {user.name}
              {!user.is_active && <span className="chip" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', fontSize: 10 }}>{t('usersRoles.users.inactive')}</span>}
            </div>
            <div className="text-caption text-[var(--text-tertiary)] truncate">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        {role ? (
          <button
            onClick={() => onRoleClick(role)}
            className="inline-flex items-center"
            title={t('usersRoles.users.viewRolePermissions')}
          >
            <Badge variant={colors.badge}>{roleName(role)}</Badge>
          </button>
        ) : (
          <Badge variant="gray">{t('usersRoles.users.noRole')}</Badge>
        )}
      </td>
      <td className="px-5 py-3 text-[12px] text-[var(--text-secondary)] tabular-nums">
        {user.last_login
          ? formatRelative(user.last_login, t, dateLocaleFor(i18n.language))
          : <span className="text-[var(--text-tertiary)]">{t('usersRoles.users.never')}</span>}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-caption font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={t('usersRoles.users.changeRole')}
          >
            <Pencil className="w-3 h-3" /> {t('usersRoles.users.changeRole')}
          </button>
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-caption font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={user.is_active ? t('usersRoles.users.deactivateUser') : t('usersRoles.users.reactivateUser')}
          >
            <UserX className="w-3 h-3" /> {user.is_active ? t('usersRoles.users.deactivate') : t('usersRoles.users.reactivate')}
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyUsers({ hasSearch, onAdd, onClearSearch }: { hasSearch: boolean; onAdd: () => void; onClearSearch: () => void }) {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-12 gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
            {hasSearch ? t('usersRoles.empty.noMatchTitle') : t('usersRoles.empty.noUsersTitle')}
          </h3>
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 max-w-sm">
            {hasSearch
              ? t('usersRoles.empty.noMatchBody')
              : t('usersRoles.empty.noUsersBody')}
          </p>
        </div>
        {hasSearch ? (
          <button onClick={onClearSearch} className="h-9 px-4 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
            {t('usersRoles.empty.clearSearch')}
          </button>
        ) : (
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[12.5px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] cursor-pointer">
            <UserPlus className="w-3.5 h-3.5" /> {t('usersRoles.empty.addFirst')}
          </button>
        )}
      </div>
    </Card>
  )
}

function RoleTile({ role, onClick, onEdit, onDelete }: {
  role: ApiRole
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const { roleName, roleDescription } = useRoleText()
  const colors = colorFor(role.slug)
  return (
    <div className="surface-paper p-4 h-full hover:shadow-sm transition-shadow relative group">
      <button onClick={onClick} className="text-left w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30 rounded-[8px]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${colors.accent}15`, color: colors.accent }}>
            <Shield className="w-4 h-4" />
          </div>
          <Badge variant={colors.badge}>{t('usersRoles.roles.userCount', { count: role.userCount })}</Badge>
        </div>
        <div className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{roleName(role)}</div>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2 min-h-[32px]">{roleDescription(role)}</p>
        <div className="text-caption text-[var(--color-brand)] font-semibold mt-3 inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {t('usersRoles.roles.viewDetails', { perms: t('usersRoles.roles.permissionCount', { count: role.permissions.length }) })}
        </div>
      </button>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
          title={role.is_system ? t('usersRoles.roles.editDescriptionSystem') : t('usersRoles.roles.editRole')}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {!role.is_system && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)] cursor-pointer"
            title={t('usersRoles.roles.deleteRole')}
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Role Editor Modal — create + edit (incl. system role description) ── */
function RoleEditorModal({ initial, permissions, onClose, onSave }: {
  initial: ApiRole | null
  permissions: ApiPermission[]
  onClose: () => void
  onSave: (form: { name: string; slug: string; description: string; permissionIds: string[] }) => void
}) {
  const { t } = useTranslation()
  const { permResource, permAction, permDescription } = useRoleText()
  const isEdit = !!initial
  const isSystem = initial?.is_system === true
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [permissionIds, setPermissionIds] = useState<string[]>(initial?.permissions.map(p => p.id) ?? [])

  const grouped = useMemo(() => {
    const map = new Map<string, ApiPermission[]>()
    for (const p of permissions) {
      const list = map.get(p.resource) ?? []
      list.push(p)
      map.set(p.resource, list)
    }
    return Array.from(map.entries())
  }, [permissions])

  const valid = name.trim().length > 0 && (isEdit || slug.trim().length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{isEdit ? t('usersRoles.roleEditor.editTitle') : t('usersRoles.roleEditor.createTitle')}</h3>
              {isSystem && (
                <p className="text-caption text-[var(--status-draft)]">{t('usersRoles.roleEditor.systemNote')}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label={t('usersRoles.roleEditor.displayName')} value={name} onChange={setName} placeholder={t('usersRoles.roleEditor.displayNamePlaceholder')} disabled={isSystem} />
          {!isEdit && (
            <Field label={t('usersRoles.roleEditor.slug')} value={slug} onChange={v => setSlug(v.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))} placeholder={t('usersRoles.roleEditor.slugPlaceholder')} />
          )}
          <div>
            <label className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">{t('usersRoles.roleEditor.description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder={t('usersRoles.roleEditor.descriptionPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] resize-none"
            />
          </div>
          {!isSystem && (
            <div>
              <label className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">{t('usersRoles.roleEditor.permissions')}</label>
              <div className="space-y-3">
                {grouped.map(([resource, perms]) => (
                  <div key={resource} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
                    <div className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">{permResource(resource)}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map(p => {
                        const checked = permissionIds.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPermissionIds(checked ? permissionIds.filter(x => x !== p.id) : [...permissionIds, p.id])}
                            className={`text-[11px] font-medium px-2 py-1 rounded-[6px] transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[var(--accent-green-light)] text-[var(--status-ok)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                            }`}
                            title={permDescription(p)}
                          >
                            {checked && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                            {permAction(p.action)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">{t('usersRoles.roleEditor.cancel')}</button>
          <button
            onClick={() => valid && onSave({ name: name.trim(), slug: slug.trim(), description: description.trim(), permissionIds })}
            disabled={!valid}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isEdit ? t('usersRoles.roleEditor.saveChanges') : t('usersRoles.roleEditor.createRole')}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ─── Add User Modal ─── */
function AddUserModal({ roles, onClose, onCreate }: {
  roles: ApiRole[]
  onClose: () => void
  onCreate: (form: { email: string; name: string; password: string; roleId: string }) => void
}) {
  const { t } = useTranslation()
  const { roleName, roleDescription } = useRoleText()
  const [form, setForm] = useState({ email: '', name: '', password: '', roleId: roles[0]?.id ?? '' })
  const valid = !!form.email.trim() && !!form.name.trim() && form.password.length >= 6 && !!form.roleId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{t('usersRoles.addUserModal.title')}</h3>
              <p className="text-caption text-[var(--text-tertiary)]">{t('usersRoles.addUserModal.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-5 space-y-4">
          <Field label={t('usersRoles.addUserModal.fullName')} placeholder={t('usersRoles.addUserModal.fullNamePlaceholder')} value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label={t('usersRoles.addUserModal.workEmail')} type="email" placeholder="user@company.com" value={form.email} onChange={v => setForm({ ...form, email: v })} icon={Mail} />
          <Field
            label={t('usersRoles.addUserModal.initialPassword')}
            type="password"
            placeholder={t('usersRoles.addUserModal.passwordPlaceholder')}
            value={form.password}
            onChange={v => setForm({ ...form, password: v })}
            hint={form.password && form.password.length < 6 ? t('usersRoles.addUserModal.moreCharsNeeded', { count: 6 - form.password.length }) : t('usersRoles.addUserModal.passwordHint')}
            hintTone={form.password && form.password.length < 6 ? 'err' : 'muted'}
          />
          <div>
            <label className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">{t('usersRoles.addUserModal.role')}</label>
            <div className="grid grid-cols-1 gap-2">
              {roles.map(r => {
                const checked = form.roleId === r.id
                const colors = colorFor(r.slug)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm({ ...form, roleId: r.id })}
                    className={`flex items-center gap-3 p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                      checked
                        ? 'border-[var(--color-brand)] bg-[var(--accent-teal-subtle)]/40 shadow-[0_0_0_3px_var(--accent-teal-subtle)]'
                        : 'border-[var(--border-default)] hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: `${colors.accent}15`, color: colors.accent }}>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{roleName(r)}</div>
                      <div className="text-caption text-[var(--text-tertiary)] truncate">{roleDescription(r)}</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-[var(--color-brand)] border-[var(--color-brand)]' : 'border-[var(--border-default)]'}`}>
                      {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">
            {t('usersRoles.addUserModal.cancel')}
          </button>
          <button onClick={() => valid && onCreate(form)} disabled={!valid} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <UserPlus className="w-3.5 h-3.5" /> {t('usersRoles.addUserModal.addUser')}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', icon: Icon, hint, hintTone = 'muted', disabled = false }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  icon?: typeof Mail
  hint?: string
  hintTone?: 'muted' | 'err'
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">{label}</span>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full h-10 ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      </div>
      {hint && (
        <span className={`block text-caption mt-1 ${hintTone === 'err' ? 'text-[var(--status-reject)]' : 'text-[var(--text-tertiary)]'}`}>{hint}</span>
      )}
    </label>
  )
}

/* ─── Edit Role Modal (single role per user) ─── */
function EditRoleModal({ user, roles, onClose, onSave }: {
  user: ApiUser
  roles: ApiRole[]
  onClose: () => void
  onSave: (roleId: string) => void
}) {
  const { t } = useTranslation()
  const { roleName, roleDescription } = useRoleText()
  const [selected, setSelected] = useState<string>(user.roles[0]?.id ?? '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{t('usersRoles.editRoleModal.title')}</h3>
            <p className="text-caption text-[var(--text-tertiary)]">{user.name} · {user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-5 space-y-2">
          {roles.map(r => {
            const checked = selected === r.id
            const colors = colorFor(r.slug)
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-[10px] border text-left transition-all cursor-pointer ${
                  checked
                    ? 'border-[var(--color-brand)] bg-[var(--accent-teal-subtle)]/40 shadow-[0_0_0_3px_var(--accent-teal-subtle)]'
                    : 'border-[var(--border-default)] hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: `${colors.accent}15`, color: colors.accent }}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">{roleName(r)}</div>
                  <div className="text-caption text-[var(--text-tertiary)] truncate">{roleDescription(r)}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-[var(--color-brand)] border-[var(--color-brand)]' : 'border-[var(--border-default)]'}`}>
                  {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            )
          })}
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">{t('usersRoles.editRoleModal.cancel')}</button>
          <button onClick={() => onSave(selected)} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] cursor-pointer">
            {t('usersRoles.editRoleModal.saveChange')}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ─── Role Detail Modal — plain-English permissions ─── */
function RoleDetailModal({ role, permissions, onClose }: {
  role: ApiRole
  permissions: ApiPermission[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { roleName, roleDescription, permResource, permAction } = useRoleText()
  const colors = colorFor(role.slug)
  const grouped = useMemo(() => {
    const map = new Map<string, { perm: ApiPermission; granted: boolean }[]>()
    for (const p of permissions) {
      const granted = role.permissions.some(rp => rp.resource === p.resource && rp.action === p.action)
      const list = map.get(p.resource) ?? []
      list.push({ perm: p, granted })
      map.set(p.resource, list)
    }
    return Array.from(map.entries())
  }, [permissions, role.permissions])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${colors.accent}15`, color: colors.accent }}>
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{roleName(role)}</h3>
              <p className="text-caption text-[var(--text-tertiary)] line-clamp-2">{roleDescription(role)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer flex-shrink-0"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <Badge variant={colors.badge}>{t('usersRoles.roles.userCount', { count: role.userCount })}</Badge>
          <Badge variant="gray">{t('usersRoles.roles.permissionCount', { count: role.permissions.length })}</Badge>
          {role.is_system && <Badge variant="amber">{t('usersRoles.roles.systemNotEditable')}</Badge>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {grouped.map(([resource, perms]) => {
            const grantedPerms = perms.filter(p => p.granted)
            const deniedPerms = perms.filter(p => !p.granted)
            if (grantedPerms.length === 0 && deniedPerms.length === 0) return null
            return (
              <div key={resource}>
                <div className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">{permResource(resource)}</div>
                <div className="flex flex-wrap gap-1.5">
                  {grantedPerms.map(({ perm }) => (
                    <span key={perm.id} className="inline-flex items-center gap-1 text-caption font-medium rounded-[6px] px-2 py-1" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>
                      <CheckCircle2 className="w-3 h-3" /> {permAction(perm.action)}
                    </span>
                  ))}
                  {deniedPerms.map(({ perm }) => (
                    <span key={perm.id} className="inline-flex items-center gap-1 text-caption font-medium rounded-[6px] px-2 py-1 line-through opacity-50" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                      {permAction(perm.action)}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <footer className="p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="w-full h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">
            {t('usersRoles.roleDetail.close')}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ─── DB Setup Modal ─── */
function DbSetupModal({ onClose, onSetup, loading }: {
  onClose: () => void
  onSetup: () => void
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{t('usersRoles.dbSetup.title')}</h3>
            <p className="text-caption text-[var(--text-tertiary)]">{t('usersRoles.dbSetup.subtitle')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-5 space-y-3 text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
          <p>{t('usersRoles.dbSetup.bodySet')}<code className="font-mono text-caption px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">DATABASE_URL</code>{t('usersRoles.dbSetup.bodyAnd')}<code className="font-mono text-caption px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">JWT_SECRET</code>{t('usersRoles.dbSetup.bodyRest')}</p>
          <p className="text-caption text-[var(--text-tertiary)]">{t('usersRoles.dbSetup.note')}</p>
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">{t('usersRoles.dbSetup.cancel')}</button>
          <button onClick={onSetup} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[13px] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-60 cursor-pointer">
            {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('usersRoles.dbSetup.settingUp')}</> : <><Plus className="w-3.5 h-3.5" /> {t('usersRoles.dbSetup.runSetup')}</>}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ─── Helpers ─── */
function formatRelative(iso: string, t: TFunction, locale: string): string {
  const ts = new Date(iso).getTime()
  const diff = Date.now() - ts
  const min = Math.round(diff / 60_000)
  if (min < 1) return t('usersRoles.relative.justNow')
  if (min < 60) return t('usersRoles.relative.minAgo', { count: min })
  const hr = Math.round(min / 60)
  if (hr < 24) return t('usersRoles.relative.hrAgo', { count: hr })
  const day = Math.round(hr / 24)
  if (day < 7) return t('usersRoles.relative.dayAgo', { count: day })
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}
