import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Shield, UserPlus, CheckCircle2, X, Search, Pencil, UserX,
  Plus, AlertTriangle, Mail, Info, LogIn, Loader2, Zap,
} from 'lucide-react'
import { Card, Badge } from '../design-system'
import { useAuth } from '../auth/AuthContext'
import { ROLE_CATALOG, type PlatformRole } from '../lib/rbac'
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
  platform_admin:               { email: 'admin@aeiforo.com',    short: 'ADM', accent: '#1B6B7B' },
  group_sustainability_officer: { email: 'so@aeiforo.com',       short: 'GSO', accent: '#3B8A9B' },
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

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */
export default function UsersRoles() {
  const { dbConnected, login } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [permissions, setPermissions] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [search, setSearch] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [viewingRole, setViewingRole] = useState<ApiRole | null>(null)
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
      u.roles.some(r => r.name.toLowerCase().includes(q))
    )
  }, [users, search])

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
  }), [users])

  /* ── Mutations ── */
  async function handleSetupDb() {
    setSettingUp(true)
    try {
      await setupApi.run()
      showToast('ok', 'Database connected — tables created and seeded')
      setSetupOpen(false)
      loadData()
    } catch (e) {
      showToast('err', `Setup failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSettingUp(false)
    }
  }

  async function createUser(form: { email: string; name: string; password: string; roleId: string }) {
    if (dbConnected) {
      try {
        await usersApi.create({ email: form.email, name: form.name, password: form.password, roleId: form.roleId || undefined })
        showToast('ok', `${form.name} added`)
        loadData()
      } catch (e) {
        showToast('err', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
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
      showToast('ok', `${form.name} added (demo)`)
    }
    setAddOpen(false)
  }

  async function changeUserRole(userId: string, roleId: string) {
    if (dbConnected) {
      try {
        await usersApi.update(userId, { roleIds: roleId ? [roleId] : [] })
        showToast('ok', 'Role updated')
        loadData()
      } catch (e) {
        showToast('err', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    } else {
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u
        const role = roles.find(r => r.id === roleId)
        return { ...u, roles: role ? [{ id: role.id, name: role.name, slug: role.slug }] : [] }
      }))
      showToast('ok', 'Role updated (demo)')
    }
    setEditingUser(null)
  }

  async function switchToRole(role: PlatformRole) {
    if (!ROLE_DEMO_PASSWORD) {
      showToast('err', 'Quick-login is disabled — VITE_DEMO_PASSWORD not set in this build')
      return
    }
    const acc = ROLE_LOGIN[role]
    setSwitchingTo(role)
    try {
      const ok = await login(acc.email, ROLE_DEMO_PASSWORD)
      if (!ok) {
        showToast('err', `Could not sign in as ${acc.email}. Has the user been seeded?`)
        return
      }
      const home = ROLE_CATALOG[role].homeRoute
      navigate(home, { replace: true })
    } catch (e) {
      showToast('err', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSwitchingTo(null)
    }
  }

  async function toggleActive(u: ApiUser) {
    const next = !u.is_active
    if (dbConnected) {
      try {
        await usersApi.update(u.id, { isActive: next })
        showToast('ok', next ? `${u.name} reactivated` : `${u.name} deactivated`)
        loadData()
      } catch (e) {
        showToast('err', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: next } : x))
      showToast('ok', next ? `${u.name} reactivated (demo)` : `${u.name} deactivated (demo)`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && <Toast kind={toast.kind} msg={toast.msg} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="kicker mb-1.5">Admin</div>
          <h1 className="font-display text-[26px] font-bold text-[var(--text-primary)] tracking-[-0.01em] leading-tight">Users &amp; Roles</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 max-w-xl leading-relaxed">
            Each user has one role. Roles bundle a set of permissions across the app. Click any role to see exactly what it can do.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[10px] bg-[var(--color-brand)] text-white text-[13.5px] font-semibold hover:bg-[var(--color-brand-strong)] active:scale-[0.98] transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add user
        </button>
      </div>

      {!dbConnected && (
        <div className="surface-paper p-3 flex items-center gap-3" style={{ borderColor: 'rgba(230,168,23,0.3)', background: 'rgba(230,168,23,0.04)' }}>
          <Info className="w-4 h-4 text-[var(--status-draft)] flex-shrink-0" />
          <div className="flex-1 text-[12px] text-[var(--text-secondary)]">
            <strong>Demo mode</strong> — changes won't persist. Connect a Neon Postgres to make this real.
          </div>
          <button onClick={() => setSetupOpen(true)} className="text-[12px] font-semibold text-[var(--color-brand)] hover:underline cursor-pointer">
            Connect database
          </button>
        </div>
      )}

      {/* Compact KPI strip — only what matters */}
      <div className="grid grid-cols-3 gap-3">
        <KpiTile icon={Users}        label="Team members"   value={stats.total}  accent="var(--accent-teal)" />
        <KpiTile icon={CheckCircle2} label="Active"         value={stats.active} accent="var(--status-ok)" subtle={`of ${stats.total}`} />
        <KpiTile icon={Shield}       label="Roles defined"  value={roles.length} accent="var(--accent-purple)" />
      </div>

      {/* Users table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Team members</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search name, email, role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 h-9 w-[260px] rounded-[8px] bg-[var(--bg-primary)] border border-[var(--border-default)] text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)]"
            />
          </div>
        </div>

        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-10 gap-2 text-[12.5px] text-[var(--text-tertiary)]">
              <div className="w-4 h-4 border-2 border-[var(--color-brand)]/30 border-t-[var(--color-brand)] rounded-full animate-spin" />
              Loading users…
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <EmptyUsers hasSearch={!!search} onAdd={() => setAddOpen(true)} onClearSearch={() => setSearch('')} />
        ) : (
          <div className="surface-paper overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">User</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">Role</th>
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">Last seen</th>
                  <th className="text-right px-5 py-2.5 text-[10.5px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">Actions</th>
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
                <Zap className="w-4 h-4 text-[var(--color-brand)]" /> Switch role · demo
              </h2>
              <p className="text-[11.5px] text-[var(--text-tertiary)] mt-0.5">
                One-click sign-in as any role to preview their experience. Lands you on that role's home page.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {(Object.keys(ROLE_LOGIN) as PlatformRole[]).map(roleKey => {
              const meta = ROLE_LOGIN[roleKey]
              const def = ROLE_CATALOG[roleKey]
              const busy = switchingTo === roleKey
              const anyBusy = switchingTo !== null
              return (
                <button
                  key={roleKey}
                  onClick={() => switchToRole(roleKey)}
                  disabled={anyBusy}
                  title={`${def.name} — ${meta.email}`}
                  className="relative flex flex-col items-start text-left p-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--color-brand)] hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] text-[10px] font-bold text-white tracking-[0.04em]"
                      style={{ background: meta.accent }}
                    >
                      {meta.short}
                    </span>
                    {busy
                      ? <Loader2 className="w-3.5 h-3.5 text-[var(--color-brand)] animate-spin" />
                      : <LogIn className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <div className="text-[12px] font-semibold text-[var(--text-primary)] leading-tight tracking-[-0.005em] line-clamp-2 min-h-[28px]">
                    {def.name}
                  </div>
                  <div className="text-[10.5px] text-[var(--text-tertiary)] mt-1 truncate w-full">
                    {meta.email}
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-[10.5px] text-[var(--text-tertiary)] mt-2 leading-relaxed">
            <Info className="inline w-3 h-3 mr-1 align-[-2px]" />
            Each click signs you out and back in as that user. Useful for showing a customer the same workflow from different perspectives.
          </p>
        </section>
      )}

      {/* Roles section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Roles</h2>
            <p className="text-[11.5px] text-[var(--text-tertiary)] mt-0.5">Click any role to see its permissions in plain English.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map(r => (
            <RoleTile key={r.id} role={r} onClick={() => setViewingRole(r)} />
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
        <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)]">{label}</div>
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
              {!user.is_active && <span className="chip" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', fontSize: 10 }}>Inactive</span>}
            </div>
            <div className="text-[11.5px] text-[var(--text-tertiary)] truncate">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        {role ? (
          <button
            onClick={() => onRoleClick(role)}
            className="inline-flex items-center"
            title="View role permissions"
          >
            <Badge variant={colors.badge}>{role.name}</Badge>
          </button>
        ) : (
          <Badge variant="gray">No role</Badge>
        )}
      </td>
      <td className="px-5 py-3 text-[12px] text-[var(--text-secondary)] tabular-nums">
        {user.last_login
          ? formatRelative(user.last_login)
          : <span className="text-[var(--text-tertiary)]">Never</span>}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Change role"
          >
            <Pencil className="w-3 h-3" /> Change role
          </button>
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[6px] text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={user.is_active ? 'Deactivate user' : 'Reactivate user'}
          >
            <UserX className="w-3 h-3" /> {user.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyUsers({ hasSearch, onAdd, onClearSearch }: { hasSearch: boolean; onAdd: () => void; onClearSearch: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-12 gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display text-[16px] font-semibold text-[var(--text-primary)]">
            {hasSearch ? 'No users match that search' : 'No team members yet'}
          </h3>
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 max-w-sm">
            {hasSearch
              ? 'Try a different keyword, or clear the search to see everyone.'
              : 'Add your first team member and assign them a role. They\'ll get an email to log in.'}
          </p>
        </div>
        {hasSearch ? (
          <button onClick={onClearSearch} className="h-9 px-4 rounded-[8px] bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[12.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer">
            Clear search
          </button>
        ) : (
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-[var(--color-brand)] text-white text-[12.5px] font-semibold hover:bg-[var(--color-brand-strong)] cursor-pointer">
            <UserPlus className="w-3.5 h-3.5" /> Add the first user
          </button>
        )}
      </div>
    </Card>
  )
}

function RoleTile({ role, onClick }: { role: ApiRole; onClick: () => void }) {
  const colors = colorFor(role.slug)
  return (
    <button onClick={onClick} className="text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30 rounded-[12px]">
      <div className="surface-paper p-4 h-full hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${colors.accent}15`, color: colors.accent }}>
            <Shield className="w-4 h-4" />
          </div>
          <Badge variant={colors.badge}>{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</Badge>
        </div>
        <div className="text-[14px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{role.name}</div>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2 min-h-[32px]">{role.description}</p>
        <div className="text-[11px] text-[var(--color-brand)] font-semibold mt-3 inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'} · view details →
        </div>
      </div>
    </button>
  )
}

/* ─── Add User Modal ─── */
function AddUserModal({ roles, onClose, onCreate }: {
  roles: ApiRole[]
  onClose: () => void
  onCreate: (form: { email: string; name: string; password: string; roleId: string }) => void
}) {
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
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Add team member</h3>
              <p className="text-[11.5px] text-[var(--text-tertiary)]">They'll receive a temporary password to log in with.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>

        <div className="p-5 space-y-4">
          <Field label="Full name" placeholder="e.g. Sarah Chen" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Work email" type="email" placeholder="user@company.com" value={form.email} onChange={v => setForm({ ...form, email: v })} icon={Mail} />
          <Field
            label="Initial password"
            type="password"
            placeholder="Minimum 6 characters"
            value={form.password}
            onChange={v => setForm({ ...form, password: v })}
            hint={form.password && form.password.length < 6 ? `${6 - form.password.length} more character${6 - form.password.length === 1 ? '' : 's'} needed` : 'They can change it after first login.'}
            hintTone={form.password && form.password.length < 6 ? 'err' : 'muted'}
          />
          <div>
            <label className="block text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1.5">Role</label>
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
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{r.name}</div>
                      <div className="text-[11px] text-[var(--text-tertiary)] truncate">{r.description}</div>
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
            Cancel
          </button>
          <button onClick={() => valid && onCreate(form)} disabled={!valid} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <UserPlus className="w-3.5 h-3.5" /> Add user
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', icon: Icon, hint, hintTone = 'muted' }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  icon?: typeof Mail
  hint?: string
  hintTone?: 'muted' | 'err'
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1.5">{label}</span>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-10 ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/15 focus:border-[var(--color-brand)] transition-all`}
        />
      </div>
      {hint && (
        <span className={`block text-[11px] mt-1 ${hintTone === 'err' ? 'text-[var(--status-reject)]' : 'text-[var(--text-tertiary)]'}`}>{hint}</span>
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
  const [selected, setSelected] = useState<string>(user.roles[0]?.id ?? '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Change role</h3>
            <p className="text-[11.5px] text-[var(--text-tertiary)]">{user.name} · {user.email}</p>
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
                  <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">{r.name}</div>
                  <div className="text-[11.5px] text-[var(--text-tertiary)] truncate">{r.description}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'bg-[var(--color-brand)] border-[var(--color-brand)]' : 'border-[var(--border-default)]'}`}>
                  {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            )
          })}
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">Cancel</button>
          <button onClick={() => onSave(selected)} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] cursor-pointer">
            Save change
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
              <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">{role.name}</h3>
              <p className="text-[11.5px] text-[var(--text-tertiary)] line-clamp-2">{role.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer flex-shrink-0"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
          <Badge variant={colors.badge}>{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</Badge>
          <Badge variant="gray">{role.permissions.length} permission{role.permissions.length === 1 ? '' : 's'}</Badge>
          {role.is_system && <Badge variant="amber">System role · not editable</Badge>}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {grouped.map(([resource, perms]) => {
            const grantedPerms = perms.filter(p => p.granted)
            const deniedPerms = perms.filter(p => !p.granted)
            if (grantedPerms.length === 0 && deniedPerms.length === 0) return null
            return (
              <div key={resource}>
                <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-tertiary)] mb-1.5">{resource}</div>
                <div className="flex flex-wrap gap-1.5">
                  {grantedPerms.map(({ perm }) => (
                    <span key={perm.id} className="inline-flex items-center gap-1 text-[11px] font-medium rounded-[6px] px-2 py-1" style={{ background: 'var(--accent-green-light)', color: 'var(--status-ok)' }}>
                      <CheckCircle2 className="w-3 h-3" /> {perm.action}
                    </span>
                  ))}
                  {deniedPerms.map(({ perm }) => (
                    <span key={perm.id} className="inline-flex items-center gap-1 text-[11px] font-medium rounded-[6px] px-2 py-1 line-through opacity-50" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                      {perm.action}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <footer className="p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="w-full h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">
            Close
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.5)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="surface-paper w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-display text-[17px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">Connect Postgres</h3>
            <p className="text-[11.5px] text-[var(--text-tertiary)]">Persist users, roles, and audit trail</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-5 space-y-3 text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
          <p>Set <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">DATABASE_URL</code> and <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)]">JWT_SECRET</code> in your Vercel project, then click below to create tables and seed demo data.</p>
          <p className="text-[11.5px] text-[var(--text-tertiary)]">Once connected, every change you make on this page persists. Until then, it's a sandbox.</p>
        </div>
        <footer className="flex items-center gap-2 p-5 border-t border-[var(--border-subtle)]">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[13px] font-semibold hover:bg-[var(--bg-secondary)] cursor-pointer">Cancel</button>
          <button onClick={onSetup} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[var(--color-brand)] text-white text-[13px] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-60 cursor-pointer">
            {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up…</> : <><Plus className="w-3.5 h-3.5" /> Run setup</>}
          </button>
        </footer>
      </div>
    </div>
  )
}

/* ─── Helpers ─── */
function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
