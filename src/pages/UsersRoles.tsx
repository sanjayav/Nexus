import { useState, useEffect, useCallback, useMemo, useRef, useId, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Shield, UserPlus, CheckCircle2, X, Search, Pencil, UserX, UserCheck, Trash2,
  Plus, Mail, Info, LogIn, Loader2, Zap, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
import PageHeader from '../components/PageHeader'
import {
  StatLedger, StatusPill, StateBoundary, SkeletonTable, SkeletonCard, notify, useConfirm,
} from '../components/ui'
import { dur, ease, popVariants } from '../motion/tokens'
import BulkActionsBar, { BulkAction } from '../components/settings/admin-tables/BulkActionsBar'
import { rowMotion, revealOnRowHover, stickyTh, inputClass, labelClass, useDialogA11y } from '../components/settings/admin-tables/shared'
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

/* ─── Role colour map (tokens; tinted with color-mix for soft fills) ── */
const ROLE_ACCENTS: Record<string, string> = {
  'admin':     'var(--accent-teal)',
  'team-lead': 'var(--accent-blue)',
  'analyst':   'var(--accent-purple)',
  'viewer':    'var(--text-tertiary)',
  'auditor':   'var(--accent-amber)',
}
const accentFor = (slug: string | undefined) => (slug && ROLE_ACCENTS[slug]) || 'var(--text-tertiary)'
const softFill = (accent: string, pct = 14) => `color-mix(in srgb, ${accent} ${pct}%, transparent)`

/* ─── Quick-login role catalog (canonical 7 roles from rbac.ts) ─ */
const ROLE_LOGIN: Record<PlatformRole, { email: string; short: string; accent: string }> = {
  platform_admin:               { email: 'admin@aeiforo.com',    short: 'ADM', accent: 'var(--accent-teal)' },
  group_sustainability_officer: { email: 'so@aeiforo.com',       short: 'GSO', accent: 'var(--accent-green)' },
  subsidiary_lead:              { email: 'tl@aeiforo.com',       short: 'SL',  accent: 'var(--accent-blue)' },
  plant_manager:                { email: 'fm@aeiforo.com',       short: 'PM',  accent: 'var(--accent-purple)' },
  data_contributor:             { email: 'maya@aeiforo.com',     short: 'DC',  accent: 'var(--accent-red)' },
  narrative_owner:              { email: 'narrator@aeiforo.com', short: 'NO',  accent: 'var(--status-warning)' },
  auditor:                      { email: 'aud@aeiforo.com',      short: 'AUD', accent: 'var(--accent-amber)' },
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

const errMessage = (e: unknown, t: TFunction) => (e instanceof Error ? e.message : t('usersRoles.toast.unknownError'))

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */
export default function UsersRoles() {
  const { dbConnected, login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { roleName } = useRoleText()
  const confirm = useConfirm()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [permissions, setPermissions] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [addOpen, setAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false)
  const [viewingRole, setViewingRole] = useState<ApiRole | null>(null)
  const [editingRole, setEditingRole] = useState<ApiRole | 'new' | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<PlatformRole | null>(null)

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    if (kind === 'ok') notify.success(msg)
    else notify.error(msg)
  }

  const applyDemoData = () => {
    setUsers(DEMO_USERS)
    setRoles(DEMO_ROLES.map(r => ({
      ...r,
      permissions: DEMO_PERMISSIONS.filter(p => DEMO_ROLE_PERMS[r.slug]?.includes(p.id)),
    })))
    setPermissions(DEMO_PERMISSIONS)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (dbConnected) {
      try {
        const [u, r, p] = await Promise.all([usersApi.list(), rolesApi.list(), permissionsApi.list()])
        setUsers(u); setRoles(r); setPermissions(p)
      } catch (e) {
        // Truthful: a failed load is an error with retry, never stand-in demo data.
        setError(e instanceof Error ? e : new Error(String(e)))
      }
    } else {
      applyDemoData()
    }
    setLoading(false)
  }, [dbConnected])

  useEffect(() => { void loadData() }, [loadData])

  // Drop selections for users that no longer exist.
  useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev
      const ids = new Set(users.map(u => u.id))
      const next = new Set([...prev].filter(id => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [users])

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

  const selectedUsers = useMemo(() => users.filter(u => selected.has(u.id)), [users, selected])
  const toggleSelected = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id))
  const someFilteredSelected = filtered.some(u => selected.has(u.id))
  const toggleAllFiltered = () =>
    setSelected(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) filtered.forEach(u => next.delete(u.id))
      else filtered.forEach(u => next.add(u.id))
      return next
    })

  /* ── Mutations ── */
  async function handleSetupDb() {
    setSettingUp(true)
    try {
      await setupApi.run()
      showToast('ok', t('usersRoles.toast.dbConnected'))
      setSetupOpen(false)
      loadData()
    } catch (e) {
      showToast('err', t('usersRoles.toast.setupFailed', { message: errMessage(e, t) }))
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
        showToast('err', t('usersRoles.toast.failed', { message: errMessage(e, t) }))
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
        showToast('err', t('usersRoles.toast.failed', { message: errMessage(e, t) }))
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

  /** Bulk role change — one usersApi.update per user (no bulk endpoint). */
  async function bulkChangeRole(roleId: string) {
    const targets = selectedUsers
    setBulkRoleOpen(false)
    if (!targets.length) return
    if (dbConnected) {
      const results = await Promise.allSettled(targets.map(u => usersApi.update(u.id, { roleIds: roleId ? [roleId] : [] })))
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed === 0) showToast('ok', t('usersRoles.bulk.roleChanged', { count: targets.length }))
      else showToast('err', t('usersRoles.bulk.partialFailure', { failed, count: targets.length }))
      loadData()
    } else {
      const role = roles.find(r => r.id === roleId)
      const ids = new Set(targets.map(u => u.id))
      setUsers(prev => prev.map(u => ids.has(u.id)
        ? { ...u, roles: role ? [{ id: role.id, name: role.name, slug: role.slug }] : [] }
        : u))
      showToast('ok', t('usersRoles.bulk.roleChangedDemo', { count: targets.length }))
    }
    setSelected(new Set())
  }

  /** Bulk activate / deactivate — one usersApi.update per user. */
  async function bulkSetActive(next: boolean) {
    const targets = selectedUsers.filter(u => u.is_active !== next)
    if (!targets.length) return
    if (!next) {
      const ok = await confirm({
        title: t('usersRoles.bulk.deactivateTitle', { count: targets.length }),
        description: t('usersRoles.bulk.deactivateBody'),
        confirmLabel: t('usersRoles.bulk.deactivateConfirm', { count: targets.length }),
        tone: 'destructive',
      })
      if (!ok) return
    }
    if (dbConnected) {
      const results = await Promise.allSettled(targets.map(u => usersApi.update(u.id, { isActive: next })))
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed === 0) {
        showToast('ok', next
          ? t('usersRoles.bulk.reactivated', { count: targets.length })
          : t('usersRoles.bulk.deactivated', { count: targets.length }))
      } else {
        showToast('err', t('usersRoles.bulk.partialFailure', { failed, count: targets.length }))
      }
      loadData()
    } else {
      const ids = new Set(targets.map(u => u.id))
      setUsers(prev => prev.map(u => ids.has(u.id) ? { ...u, is_active: next } : u))
      showToast('ok', next
        ? t('usersRoles.bulk.reactivatedDemo', { count: targets.length })
        : t('usersRoles.bulk.deactivatedDemo', { count: targets.length }))
    }
    setSelected(new Set())
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
      showToast('err', t('usersRoles.toast.failed', { message: errMessage(e, t) }))
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
      showToast('err', t('usersRoles.toast.failed', { message: errMessage(e, t) }))
    }
  }

  async function deleteRole(r: ApiRole) {
    if (r.is_system) {
      showToast('err', t('usersRoles.toast.systemRoleDelete'))
      return
    }
    const ok = await confirm({
      title: t('usersRoles.confirm.deleteRoleTitle', { name: roleName(r) }),
      description: t('usersRoles.confirm.deleteRoleBody', { count: r.userCount }),
      confirmLabel: t('usersRoles.roles.deleteRole'),
      tone: 'destructive',
    })
    if (!ok) return
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
      showToast('err', t('usersRoles.toast.failed', { message: errMessage(e, t) }))
    }
  }

  async function toggleActive(u: ApiUser) {
    const next = !u.is_active
    if (!next) {
      const ok = await confirm({
        title: t('usersRoles.confirm.deactivateTitle', { name: u.name }),
        description: t('usersRoles.confirm.deactivateBody'),
        confirmLabel: t('usersRoles.users.deactivate'),
        tone: 'destructive',
      })
      if (!ok) return
    }
    if (dbConnected) {
      try {
        await usersApi.update(u.id, { isActive: next })
        showToast('ok', next ? t('usersRoles.toast.userReactivated', { name: u.name }) : t('usersRoles.toast.userDeactivated', { name: u.name }))
        loadData()
      } catch (e) {
        showToast('err', t('usersRoles.toast.failed', { message: errMessage(e, t) }))
      }
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: next } : x))
      showToast('ok', next ? t('usersRoles.toast.userReactivatedDemo', { name: u.name }) : t('usersRoles.toast.userDeactivatedDemo', { name: u.name }))
    }
  }

  const hasData = users.length > 0 || roles.length > 0
  const anyActiveSelected = selectedUsers.some(u => u.is_active)
  const anyInactiveSelected = selectedUsers.some(u => !u.is_active)

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title={t('usersRoles.title')}
        description={t('usersRoles.description')}
        actions={
          <button type="button" onClick={() => setAddOpen(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" aria-hidden /> {t('usersRoles.addUser')}
          </button>
        }
      />

      {!dbConnected && (
        <div className="-mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-[var(--radius-lg)] border border-[var(--status-warning-line)] bg-[var(--status-warning-soft)] px-4 py-3">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <Info className="w-4 h-4 mt-0.5 text-[var(--status-warning)] flex-shrink-0" aria-hidden />
            <p className="text-small text-[var(--text-secondary)]">
              <strong className="font-semibold text-[var(--text-primary)]">{t('usersRoles.demoBanner.strong')}</strong>{t('usersRoles.demoBanner.text')}
            </p>
          </div>
          <button type="button" onClick={() => setSetupOpen(true)} className="self-start sm:self-auto inline-flex items-center gap-1 h-10 sm:h-8 px-2 -mx-2 sm:mx-0 rounded-[var(--radius-md)] text-small font-semibold text-[var(--color-brand)] hover:bg-[var(--bg-primary)]/60 whitespace-nowrap">
            {t('usersRoles.demoBanner.connect')} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      )}

      {!error && (
        <StatLedger
          aria-label={t('usersRoles.kpi.label')}
          loading={loading && !hasData}
          items={[
            { id: 'members', label: t('usersRoles.kpi.teamMembers'), value: stats.total, tone: 'neutral' },
            { id: 'active', label: t('usersRoles.kpi.active'), value: stats.active, tone: 'success', hint: t('usersRoles.kpi.ofTotal', { total: stats.total }) },
            { id: 'inactive', label: t('usersRoles.kpi.inactive'), value: stats.total - stats.active, tone: stats.total - stats.active > 0 ? 'warning' : 'neutral' },
            { id: 'roles', label: t('usersRoles.kpi.rolesDefined'), value: roles.length, tone: 'brand' },
          ]}
        />
      )}

      {/* Users table */}
      <section aria-labelledby="users-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
          <div>
            <h2 id="users-heading" className="type-h3 text-[var(--text-primary)]">{t('usersRoles.users.heading')}</h2>
            <p className="text-small text-[var(--text-secondary)] mt-0.5">{t('usersRoles.users.intro')}</p>
          </div>
          <label className="relative block w-full sm:w-[280px]">
            <span className="sr-only">{t('usersRoles.users.searchLabel')}</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" aria-hidden />
            <input
              type="search"
              placeholder={t('usersRoles.users.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </label>
        </div>

        <StateBoundary
          loading={loading}
          error={error}
          onRetry={() => void loadData()}
          hasData={hasData}
          empty={filtered.length === 0}
          skeleton={<SkeletonTable rows={5} cols={5} framed />}
          errorState={{ title: t('usersRoles.error.title'), body: t('usersRoles.error.body') }}
          emptyState={search
            ? { variant: 'filtered', title: t('usersRoles.empty.noMatchTitle'), body: t('usersRoles.empty.noMatchBody'), onClearFilters: () => setSearch(''), framed: true }
            : {
                art: 'inbox',
                title: t('usersRoles.empty.noUsersTitle'),
                body: t('usersRoles.empty.noUsersBody'),
                cta: { label: t('usersRoles.empty.addFirst'), onClick: () => setAddOpen(true), icon: <UserPlus className="w-4 h-4" aria-hidden /> },
                framed: true,
              }}
        >
          <div className="surface-paper overflow-hidden">
            <div className="overflow-auto max-h-[min(640px,70vh)]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className={`${stickyTh} w-12 !pr-0`}>
                      <SelectBox
                        checked={allFilteredSelected}
                        indeterminate={!allFilteredSelected && someFilteredSelected}
                        onChange={toggleAllFiltered}
                        label={t('usersRoles.bulk.selectAll')}
                      />
                    </th>
                    <th className={stickyTh}>{t('usersRoles.users.colUser')}</th>
                    <th className={`${stickyTh} hidden sm:table-cell`}>{t('usersRoles.users.colRole')}</th>
                    <th className={`${stickyTh} hidden md:table-cell`}>{t('usersRoles.users.colStatus')}</th>
                    <th className={`${stickyTh} hidden sm:table-cell`}>{t('usersRoles.users.colLastSeen')}</th>
                    <th className={`${stickyTh} !text-right`}><span className="sr-only">{t('usersRoles.users.colActions')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filtered.map(u => (
                      <UserRow
                        key={u.id}
                        user={u}
                        selected={selected.has(u.id)}
                        onSelect={() => toggleSelected(u.id)}
                        onEdit={() => setEditingUser(u)}
                        onToggle={() => void toggleActive(u)}
                        onRoleClick={(role) => {
                          const full = roles.find(r => r.id === role.id) ?? null
                          setViewingRole(full)
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </StateBoundary>
      </section>

      {/* Quick role switcher — 7 canonical platform roles for live demos */}
      {ROLE_DEMO_PASSWORD && (
        <section aria-labelledby="switcher-heading">
          <div className="mb-3">
            <h2 id="switcher-heading" className="type-h3 text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-brand)]" aria-hidden /> {t('usersRoles.switcher.heading')}
            </h2>
            <p className="text-small text-[var(--text-secondary)] mt-0.5">{t('usersRoles.switcher.intro')}</p>
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
                  type="button"
                  onClick={() => switchToRole(roleKey)}
                  disabled={anyBusy}
                  title={`${defName} — ${meta.email}`}
                  className="group relative flex flex-col items-start text-left p-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-raised)] active:scale-[0.99] transition-[border-color,box-shadow,transform] duration-150 disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40"
                >
                  <span className="flex items-center justify-between w-full mb-2">
                    <span
                      className="inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-[var(--radius-sm)] text-caption font-semibold tabular-nums"
                      style={{ background: softFill(meta.accent, 16), color: meta.accent }}
                    >
                      {meta.short}
                    </span>
                    {busy
                      ? <Loader2 className="w-3.5 h-3.5 text-[var(--color-brand)] animate-spin" aria-hidden />
                      : <LogIn className={`w-3.5 h-3.5 text-[var(--text-tertiary)] ${revealOnRowHover}`} aria-hidden />}
                  </span>
                  <span className="text-small font-semibold text-[var(--text-primary)] leading-tight line-clamp-2 min-h-[2.5em]">
                    {defName}
                  </span>
                  <span className="text-caption text-[var(--text-tertiary)] mt-1 truncate w-full">{meta.email}</span>
                </button>
              )
            })}
          </div>
          <p className="text-caption text-[var(--text-tertiary)] mt-2 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden />
            {t('usersRoles.switcher.footnote')}
          </p>
        </section>
      )}

      {/* Roles section */}
      <section aria-labelledby="roles-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
          <div>
            <h2 id="roles-heading" className="type-h3 text-[var(--text-primary)]">{t('usersRoles.roles.heading')}</h2>
            <p className="text-small text-[var(--text-secondary)] mt-0.5">{t('usersRoles.roles.intro')}</p>
          </div>
          <button type="button" onClick={() => setEditingRole('new')} className="btn-secondary self-start sm:self-auto">
            <Plus className="w-4 h-4" aria-hidden /> {t('usersRoles.roles.newRole')}
          </button>
        </div>

        <StateBoundary
          loading={loading}
          error={error}
          onRetry={() => void loadData()}
          hasData={roles.length > 0}
          empty={roles.length === 0}
          compact
          skeleton={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          }
          errorState={{ title: t('usersRoles.error.rolesTitle'), body: t('usersRoles.error.body') }}
          emptyState={{
            art: 'setup',
            title: t('usersRoles.empty.noRolesTitle'),
            body: t('usersRoles.empty.noRolesBody'),
            cta: { label: t('usersRoles.roles.newRole'), onClick: () => setEditingRole('new') },
            framed: true,
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map(r => (
              <RoleTile
                key={r.id}
                role={r}
                onClick={() => setViewingRole(r)}
                onEdit={() => setEditingRole(r)}
                onDelete={() => void deleteRole(r)}
              />
            ))}
          </div>
        </StateBoundary>
      </section>

      {/* Bulk actions — slides up while users are selected */}
      <BulkActionsBar
        count={selected.size}
        countLabel={t('usersRoles.bulk.selected', { count: selected.size })}
        clearLabel={t('usersRoles.bulk.clear')}
        label={t('usersRoles.bulk.toolbar')}
        onClear={() => setSelected(new Set())}
      >
        <BulkAction onClick={() => setBulkRoleOpen(true)} icon={<Pencil className="w-4 h-4" aria-hidden />}>
          {t('usersRoles.users.changeRole')}
        </BulkAction>
        {anyInactiveSelected && (
          <BulkAction onClick={() => void bulkSetActive(true)} icon={<UserCheck className="w-4 h-4" aria-hidden />}>
            {t('usersRoles.users.reactivate')}
          </BulkAction>
        )}
        {anyActiveSelected && (
          <BulkAction tone="destructive" onClick={() => void bulkSetActive(false)} icon={<UserX className="w-4 h-4" aria-hidden />}>
            {t('usersRoles.users.deactivate')}
          </BulkAction>
        )}
      </BulkActionsBar>

      {/* Modals */}
      <AnimatePresence>
        {addOpen && <AddUserModal key="add" roles={roles} onClose={() => setAddOpen(false)} onCreate={createUser} />}
        {editingUser && (
          <EditRoleModal
            key="edit-role"
            subtitle={`${editingUser.name} · ${editingUser.email}`}
            initialRoleId={editingUser.roles[0]?.id ?? ''}
            roles={roles}
            onClose={() => setEditingUser(null)}
            onSave={(roleId) => changeUserRole(editingUser.id, roleId)}
          />
        )}
        {bulkRoleOpen && (
          <EditRoleModal
            key="bulk-role"
            subtitle={t('usersRoles.bulk.roleSubtitle', { count: selectedUsers.length })}
            initialRoleId={selectedUsers.every(u => u.roles[0]?.id === selectedUsers[0]?.roles[0]?.id) ? selectedUsers[0]?.roles[0]?.id ?? '' : ''}
            roles={roles}
            onClose={() => setBulkRoleOpen(false)}
            onSave={(roleId) => void bulkChangeRole(roleId)}
          />
        )}
        {viewingRole && <RoleDetailModal key="role-detail" role={viewingRole} permissions={permissions} onClose={() => setViewingRole(null)} />}
        {editingRole && (
          <RoleEditorModal
            key="role-editor"
            initial={editingRole === 'new' ? null : editingRole}
            permissions={permissions}
            onClose={() => setEditingRole(null)}
            onSave={(form) => saveRole(form, editingRole === 'new' ? undefined : editingRole.id)}
          />
        )}
        {setupOpen && <DbSetupModal key="db" onClose={() => setSetupOpen(false)} onSetup={handleSetupDb} loading={settingUp} />}
      </AnimatePresence>
    </div>
  )
}

/* ─── Sub-components ──────────────────────────────────────────── */

function SelectBox({ checked, indeterminate = false, onChange, label }: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className="inline-flex items-center justify-center w-10 h-10 -my-2 -ml-2 cursor-pointer rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)]">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="w-4 h-4 cursor-pointer accent-[var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
      />
    </label>
  )
}

function Avatar({ name, slug }: { name: string; slug?: string }) {
  const accent = accentFor(slug)
  const initials = name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-caption font-semibold flex-shrink-0"
      style={{ background: softFill(accent, 16), color: accent }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

function RoleChip({ name, slug, onClick, title }: { name: string; slug?: string; onClick?: () => void; title?: string }) {
  const dot = <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accentFor(slug) }} aria-hidden />
  if (!onClick) return <span className="chip">{dot}{name}</span>
  return (
    <button type="button" onClick={onClick} title={title} className="chip cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40">
      {dot}{name}
    </button>
  )
}

function UserRow({ user, selected, onSelect, onEdit, onToggle, onRoleClick }: {
  user: ApiUser
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onToggle: () => void
  onRoleClick: (role: ApiUser['roles'][number]) => void
}) {
  const { t, i18n } = useTranslation()
  const { roleName } = useRoleText()
  const role = user.roles[0]
  const actionBtn = 'inline-flex items-center justify-center gap-1.5 h-10 w-10 lg:w-auto lg:h-8 lg:px-2.5 rounded-[var(--radius-md)] text-caption font-medium transition-colors whitespace-nowrap'
  return (
    <motion.tr
      {...rowMotion}
      className="group"
      data-selected={selected || undefined}
      style={selected ? { background: 'var(--color-brand-soft)' } : undefined}
    >
      <td className="!pr-0 w-12">
        <SelectBox checked={selected} onChange={onSelect} label={t('usersRoles.bulk.selectUser', { name: user.name })} />
      </td>
      <td className="sm:min-w-[180px] max-w-0 sm:max-w-none w-full sm:w-auto">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={user.name} slug={role?.slug} />
          <div className="min-w-0">
            <div className={`text-small font-semibold truncate ${user.is_active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
              {user.name}
            </div>
            <div className="text-caption text-[var(--text-tertiary)] truncate max-w-[240px]" title={user.email}>{user.email}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 empty:hidden md:hidden">
              {role && (
                <span className="sm:hidden">
                  <RoleChip name={roleName(role)} slug={role.slug} onClick={() => onRoleClick(role)} title={t('usersRoles.users.viewRolePermissions')} />
                </span>
              )}
              {!user.is_active && <StatusPill size="sm" tone="neutral">{t('usersRoles.users.inactive')}</StatusPill>}
            </div>
          </div>
        </div>
      </td>
      <td className="hidden sm:table-cell">
        {role ? (
          <RoleChip name={roleName(role)} slug={role.slug} onClick={() => onRoleClick(role)} title={t('usersRoles.users.viewRolePermissions')} />
        ) : (
          <span className="text-caption text-[var(--text-tertiary)]">{t('usersRoles.users.noRole')}</span>
        )}
      </td>
      <td className="hidden md:table-cell">
        {user.is_active
          ? <StatusPill tone="success" dot>{t('usersRoles.users.active')}</StatusPill>
          : <StatusPill tone="neutral">{t('usersRoles.users.inactive')}</StatusPill>}
      </td>
      <td className="hidden sm:table-cell whitespace-nowrap tabular-nums">
        {user.last_login
          ? <time dateTime={user.last_login} title={new Date(user.last_login).toLocaleString(dateLocaleFor(i18n.language))}>{formatRelative(user.last_login, t, dateLocaleFor(i18n.language))}</time>
          : <span className="text-[var(--text-tertiary)]">{t('usersRoles.users.never')}</span>}
      </td>
      <td className="!text-right">
        <div className={`flex items-center gap-0.5 justify-end ${revealOnRowHover}`}>
          <button
            type="button"
            onClick={onEdit}
            className={`${actionBtn} text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`}
            title={t('usersRoles.users.changeRole')}
            aria-label={`${t('usersRoles.users.changeRole')} — ${user.name}`}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden lg:inline">{t('usersRoles.users.changeRole')}</span>
          </button>
          {user.is_active ? (
            <button
              type="button"
              onClick={onToggle}
              className={`${actionBtn} text-[var(--text-secondary)] hover:bg-[var(--status-danger-soft)] hover:text-[var(--status-danger)]`}
              title={t('usersRoles.users.deactivateUser')}
              aria-label={`${t('usersRoles.users.deactivateUser')} — ${user.name}`}
            >
              <UserX className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden lg:inline">{t('usersRoles.users.deactivate')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className={`${actionBtn} text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`}
              title={t('usersRoles.users.reactivateUser')}
              aria-label={`${t('usersRoles.users.reactivateUser')} — ${user.name}`}
            >
              <UserCheck className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden lg:inline">{t('usersRoles.users.reactivate')}</span>
            </button>
          )}
        </div>
      </td>
    </motion.tr>
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
  const accent = accentFor(role.slug)
  return (
    <div className="surface-paper relative group h-full flex flex-col transition-[border-color,box-shadow] duration-150 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-raised)]">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex flex-col items-stretch justify-start text-left p-4 rounded-[var(--radius-xl)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40"
      >
        <span className="flex items-center gap-2.5 pr-20">
          <span className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0" style={{ background: softFill(accent), color: accent }} aria-hidden>
            <Shield className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-body font-semibold text-[var(--text-primary)] truncate">{roleName(role)}</span>
            <span className="block text-caption text-[var(--text-tertiary)]">
              {t('usersRoles.roles.userCount', { count: role.userCount })}
              {role.is_system && <> · {t('usersRoles.roles.system')}</>}
            </span>
          </span>
        </span>
        <span className="block text-small text-[var(--text-secondary)] mt-3 line-clamp-2 min-h-[2.9em]">{roleDescription(role)}</span>
        <span className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-[var(--color-brand)]">
          {t('usersRoles.roles.viewDetails', { perms: t('usersRoles.roles.permissionCount', { count: role.permissions.length }) })}
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </button>
      <div className={`absolute top-3 right-3 flex items-center gap-0.5 ${revealOnRowHover}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="w-10 h-10 sm:w-8 sm:h-8 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          title={role.is_system ? t('usersRoles.roles.editDescriptionSystem') : t('usersRoles.roles.editRole')}
          aria-label={`${role.is_system ? t('usersRoles.roles.editDescriptionSystem') : t('usersRoles.roles.editRole')} — ${roleName(role)}`}
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden />
        </button>
        {!role.is_system && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)]"
            title={t('usersRoles.roles.deleteRole')}
            aria-label={`${t('usersRoles.roles.deleteRole')} — ${roleName(role)}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Modal shell — overlay, Escape, focus, one entrance ─── */
function Modal({ title, subtitle, icon, onClose, size = 'md', children, footer }: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const ref = useDialogA11y(true, onClose, 'input:not([disabled]), textarea, [data-autofocus]')
  const width = size === 'xl' ? 'sm:max-w-2xl' : size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md'
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'var(--bg-overlay)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.fast, ease: ease.out }}
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        variants={popVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`w-full ${width} max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-[var(--shadow-overlay)] rounded-t-[var(--radius-2xl)] sm:rounded-[var(--radius-2xl)]`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-start gap-3 min-w-0">
            {icon}
            <div className="min-w-0">
              <h2 id={titleId} className="type-h3 text-[var(--text-primary)]">{title}</h2>
              {subtitle && <div className="text-small text-[var(--text-secondary)] mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('usersRoles.modal.close')}
            className="w-10 h-10 sm:w-8 sm:h-8 -mt-1 -mr-1 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="flex items-center gap-2 px-5 py-4 border-t border-[var(--border-subtle)] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </footer>
        )}
      </motion.div>
    </motion.div>
  )
}

function ModalIcon({ children, accent = 'var(--color-brand)' }: { children: ReactNode; accent?: string }) {
  return (
    <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0" style={{ background: softFill(accent), color: accent }} aria-hidden>
      {children}
    </span>
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
  const descId = useId()

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
    <Modal
      size="xl"
      onClose={onClose}
      icon={<ModalIcon><Shield className="w-4 h-4" /></ModalIcon>}
      title={isEdit ? t('usersRoles.roleEditor.editTitle') : t('usersRoles.roleEditor.createTitle')}
      subtitle={isSystem ? <span className="text-[var(--status-warning)]">{t('usersRoles.roleEditor.systemNote')}</span> : undefined}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('usersRoles.roleEditor.cancel')}</button>
          <button
            type="button"
            onClick={() => valid && onSave({ name: name.trim(), slug: slug.trim(), description: description.trim(), permissionIds })}
            disabled={!valid}
            className="btn-primary flex-1"
          >
            {isEdit ? t('usersRoles.roleEditor.saveChanges') : t('usersRoles.roleEditor.createRole')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('usersRoles.roleEditor.displayName')} value={name} onChange={setName} placeholder={t('usersRoles.roleEditor.displayNamePlaceholder')} disabled={isSystem} />
        {!isEdit && (
          <Field label={t('usersRoles.roleEditor.slug')} value={slug} onChange={v => setSlug(v.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))} placeholder={t('usersRoles.roleEditor.slugPlaceholder')} />
        )}
        <label className="block" htmlFor={descId}>
          <span className={labelClass}>{t('usersRoles.roleEditor.description')}</span>
          <textarea
            id={descId}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder={t('usersRoles.roleEditor.descriptionPlaceholder')}
            className={`${inputClass} h-auto py-2.5 resize-none`}
          />
        </label>
        {!isSystem && (
          <fieldset>
            <legend className={labelClass}>{t('usersRoles.roleEditor.permissions')}</legend>
            <div className="space-y-2">
              {grouped.map(([resource, perms]) => (
                <div key={resource} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-3">
                  <div className="text-caption font-semibold text-[var(--text-secondary)] mb-2">{permResource(resource)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map(p => {
                      const checked = permissionIds.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          onClick={() => setPermissionIds(checked ? permissionIds.filter(x => x !== p.id) : [...permissionIds, p.id])}
                          className={`chip cursor-pointer ${checked ? 'chip-active' : ''}`}
                          title={permDescription(p)}
                        >
                          {checked && <CheckCircle2 className="w-3 h-3" aria-hidden />}
                          {permAction(p.action)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  )
}

/* ─── Add User Modal ─── */
function AddUserModal({ roles, onClose, onCreate }: {
  roles: ApiRole[]
  onClose: () => void
  onCreate: (form: { email: string; name: string; password: string; roleId: string }) => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', name: '', password: '', roleId: roles[0]?.id ?? '' })
  const valid = !!form.email.trim() && !!form.name.trim() && form.password.length >= 6 && !!form.roleId

  return (
    <Modal
      onClose={onClose}
      icon={<ModalIcon><UserPlus className="w-4 h-4" /></ModalIcon>}
      title={t('usersRoles.addUserModal.title')}
      subtitle={t('usersRoles.addUserModal.subtitle')}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('usersRoles.addUserModal.cancel')}</button>
          <button type="button" onClick={() => valid && onCreate(form)} disabled={!valid} className="btn-primary flex-1">
            <UserPlus className="w-4 h-4" aria-hidden /> {t('usersRoles.addUserModal.addUser')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
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
        <RolePicker legend={t('usersRoles.addUserModal.role')} roles={roles} value={form.roleId} onChange={roleId => setForm({ ...form, roleId })} />
      </div>
    </Modal>
  )
}

/** Single-choice role list (radio semantics). */
function RolePicker({ legend, roles, value, onChange }: { legend: string; roles: ApiRole[]; value: string; onChange: (id: string) => void }) {
  const { roleName, roleDescription } = useRoleText()
  const name = useId()
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="grid grid-cols-1 gap-2">
        {roles.map(r => {
          const checked = value === r.id
          const accent = accentFor(r.slug)
          return (
            <label
              key={r.id}
              className={`flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-brand)]/40 ${
                checked
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <input type="radio" name={name} value={r.id} checked={checked} onChange={() => onChange(r.id)} className="sr-only" data-autofocus={checked || undefined} />
              <span className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0" style={{ background: softFill(accent), color: accent }} aria-hidden>
                <Shield className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-small font-semibold text-[var(--text-primary)]">{roleName(r)}</span>
                <span className="block text-caption text-[var(--text-tertiary)] truncate">{roleDescription(r)}</span>
              </span>
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-[var(--color-brand)] border-[var(--color-brand)]' : 'border-[var(--border-strong)]'}`}
                aria-hidden
              >
                {checked && <span className="w-1.5 h-1.5 rounded-full bg-[var(--btn-primary-fg)]" />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
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
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" aria-hidden />}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClass} ${Icon ? 'pl-9' : ''}`}
        />
      </span>
      {hint && (
        <span className={`block text-caption mt-1 ${hintTone === 'err' ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>{hint}</span>
      )}
    </label>
  )
}

/* ─── Change Role Modal (single role per user; also used for bulk) ─── */
function EditRoleModal({ subtitle, initialRoleId, roles, onClose, onSave }: {
  subtitle: ReactNode
  initialRoleId: string
  roles: ApiRole[]
  onClose: () => void
  onSave: (roleId: string) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string>(initialRoleId)
  return (
    <Modal
      onClose={onClose}
      title={t('usersRoles.editRoleModal.title')}
      subtitle={subtitle}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('usersRoles.editRoleModal.cancel')}</button>
          <button type="button" onClick={() => onSave(selected)} disabled={!selected} className="btn-primary flex-1">
            {t('usersRoles.editRoleModal.saveChange')}
          </button>
        </>
      }
    >
      <RolePicker legend={t('usersRoles.addUserModal.role')} roles={roles} value={selected} onChange={setSelected} />
    </Modal>
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
  const accent = accentFor(role.slug)
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
    <Modal
      size="lg"
      onClose={onClose}
      icon={<ModalIcon accent={accent}><Shield className="w-4 h-4" /></ModalIcon>}
      title={roleName(role)}
      subtitle={roleDescription(role)}
      footer={<button type="button" onClick={onClose} className="btn-secondary w-full" data-autofocus>{t('usersRoles.roleDetail.close')}</button>}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="chip">{t('usersRoles.roles.userCount', { count: role.userCount })}</span>
        <span className="chip">{t('usersRoles.roles.permissionCount', { count: role.permissions.length })}</span>
        {role.is_system && <StatusPill tone="warning">{t('usersRoles.roles.systemNotEditable')}</StatusPill>}
      </div>
      <div className="space-y-4">
        {grouped.map(([resource, perms]) => {
          const grantedPerms = perms.filter(p => p.granted)
          const deniedPerms = perms.filter(p => !p.granted)
          if (grantedPerms.length === 0 && deniedPerms.length === 0) return null
          return (
            <div key={resource}>
              <div className="text-caption font-semibold text-[var(--text-secondary)] mb-1.5">{permResource(resource)}</div>
              <ul className="flex flex-wrap gap-1.5">
                {grantedPerms.map(({ perm }) => (
                  <li key={perm.id}>
                    <StatusPill tone="success" icon={<CheckCircle2 />}>{permAction(perm.action)}</StatusPill>
                  </li>
                ))}
                {deniedPerms.map(({ perm }) => (
                  <li key={perm.id}>
                    <span className="nx-pill line-through opacity-60" data-tone="neutral" data-size="md">
                      <span className="sr-only">{t('usersRoles.roleDetail.notGranted')}: </span>{permAction(perm.action)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Modal>
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
    <Modal
      size="lg"
      onClose={onClose}
      title={t('usersRoles.dbSetup.title')}
      subtitle={t('usersRoles.dbSetup.subtitle')}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('usersRoles.dbSetup.cancel')}</button>
          <button type="button" onClick={onSetup} disabled={loading} className="btn-primary flex-1" data-autofocus>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> {t('usersRoles.dbSetup.settingUp')}</>
              : <><Plus className="w-4 h-4" aria-hidden /> {t('usersRoles.dbSetup.runSetup')}</>}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-small text-[var(--text-secondary)]">
        <p>{t('usersRoles.dbSetup.bodySet')}<code className="font-mono text-caption px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)]">DATABASE_URL</code>{t('usersRoles.dbSetup.bodyAnd')}<code className="font-mono text-caption px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--bg-secondary)]">JWT_SECRET</code>{t('usersRoles.dbSetup.bodyRest')}</p>
        <p className="text-caption text-[var(--text-tertiary)]">{t('usersRoles.dbSetup.note')}</p>
      </div>
    </Modal>
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
