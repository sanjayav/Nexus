import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Shield,
  UserPlus,
  Mail,
  CheckCircle2,
  X,
  ChevronRight,
  Search,
  MoreVertical,
  Pencil,
  UserX,
  Copy,
  Lock,
  Plus,
} from 'lucide-react'
import { Card, Badge, Tabs } from '../design-system'
import { useAuth } from '../auth/AuthContext'
import {
  users as usersApi,
  roles as rolesApi,
  permissions as permissionsApi,
  setup as setupApi,
  type ApiUser,
  type ApiRole,
  type ApiPermission,
} from '../lib/api'

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface NewUserForm {
  email: string
  name: string
  password: string
  roleId: string
}

/* ═══════════════════════════════════════════
   Demo data (when DB not connected)
   ═══════════════════════════════════════════ */
const DEMO_USERS: ApiUser[] = [
  { id: '1', email: 'admin@aeiforo.com', name: 'Jane Mitchell', avatar_url: null, is_active: true, created_at: '2026-01-15T09:00:00Z', last_login: '2026-04-09T08:30:00Z', roles: [{ id: 'r1', name: 'Platform Admin', slug: 'admin' }] },
  { id: '2', email: 'tl@aeiforo.com', name: 'Tom Harris', avatar_url: null, is_active: true, created_at: '2026-02-01T09:00:00Z', last_login: '2026-04-08T14:20:00Z', roles: [{ id: 'r2', name: 'Team Lead', slug: 'team-lead' }] },
  { id: '3', email: 'fm@aeiforo.com', name: 'Sarah Chen', avatar_url: null, is_active: true, created_at: '2026-02-10T09:00:00Z', last_login: '2026-04-07T11:45:00Z', roles: [{ id: 'r3', name: 'Analyst', slug: 'analyst' }] },
  { id: '4', email: 'so@aeiforo.com', name: 'Alex Rivera', avatar_url: null, is_active: true, created_at: '2026-03-05T09:00:00Z', last_login: '2026-04-06T16:10:00Z', roles: [{ id: 'r5', name: 'Viewer', slug: 'viewer' }] },
]

const DEMO_ROLES: ApiRole[] = [
  { id: 'r1', name: 'Platform Admin', slug: 'admin', description: 'Full system access — manage users, roles, org settings, and all modules', is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
  { id: 'r2', name: 'Team Lead', slug: 'team-lead', description: 'Manage team data, approve submissions, view all reports', is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
  { id: 'r3', name: 'Analyst', slug: 'analyst', description: 'Run calculators, upload data, create reports', is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
  { id: 'r4', name: 'Auditor', slug: 'auditor', description: 'Read-only access to all data plus audit trail', is_system: true, created_at: '2026-01-01', permissions: [], userCount: 0 },
  { id: 'r5', name: 'Viewer', slug: 'viewer', description: 'Read-only access to dashboards and reports', is_system: true, created_at: '2026-01-01', permissions: [], userCount: 1 },
]

const DEMO_PERMISSIONS: ApiPermission[] = [
  { id: 'p1', resource: 'dashboard', action: 'view', description: 'View executive dashboard' },
  { id: 'p2', resource: 'calculators', action: 'view', description: 'View GHG calculators' },
  { id: 'p3', resource: 'calculators', action: 'edit', description: 'Run calculations' },
  { id: 'p4', resource: 'data', action: 'view', description: 'View data ingestion' },
  { id: 'p5', resource: 'data', action: 'upload', description: 'Upload emission data' },
  { id: 'p6', resource: 'data', action: 'approve', description: 'Approve submitted data' },
  { id: 'p7', resource: 'reports', action: 'view', description: 'View published reports' },
  { id: 'p8', resource: 'reports', action: 'create', description: 'Create and edit reports' },
  { id: 'p9', resource: 'reports', action: 'publish', description: 'Publish reports' },
  { id: 'p10', resource: 'analytics', action: 'view', description: 'View analytics' },
  { id: 'p11', resource: 'workflow', action: 'view', description: 'View workflow tasks' },
  { id: 'p12', resource: 'workflow', action: 'approve', description: 'Approve workflow steps' },
  { id: 'p13', resource: 'audit', action: 'view', description: 'View audit trail' },
  { id: 'p14', resource: 'admin', action: 'users', description: 'Manage users' },
  { id: 'p15', resource: 'admin', action: 'roles', description: 'Manage roles' },
  { id: 'p16', resource: 'admin', action: 'org', description: 'Manage organisation' },
  { id: 'p17', resource: 'admin', action: 'settings', description: 'Manage settings' },
]

/* Role → demo permissions mapping */
const DEMO_ROLE_PERMS: Record<string, string[]> = {
  'admin': DEMO_PERMISSIONS.map(p => p.id),
  'team-lead': ['p1','p2','p3','p4','p5','p6','p7','p8','p10','p11','p12','p13','p14'],
  'analyst': ['p1','p2','p3','p4','p5','p7','p8','p10','p11'],
  'viewer': ['p1','p2','p4','p7','p10','p11'],
  'auditor': ['p1','p2','p4','p7','p10','p11','p13'],
}

/* ═══════════════════════════════════════════
   Role accent colours
   ═══════════════════════════════════════════ */
const ROLE_COLORS: Record<string, { badge: 'teal' | 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'gray'; accent: string }> = {
  'admin': { badge: 'teal', accent: 'var(--accent-teal)' },
  'team-lead': { badge: 'blue', accent: 'var(--accent-blue)' },
  'analyst': { badge: 'purple', accent: 'var(--accent-purple)' },
  'viewer': { badge: 'gray', accent: 'var(--text-tertiary)' },
  'auditor': { badge: 'amber', accent: 'var(--accent-amber)' },
}

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */
export default function UsersRoles() {
  const { dbConnected } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [usersList, setUsersList] = useState<ApiUser[]>([])
  const [rolesList, setRolesList] = useState<ApiRole[]>([])
  const [allPermissions, setAllPermissions] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Modals
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState<ApiUser | null>(null)
  const [showRoleDetail, setShowRoleDetail] = useState<ApiRole | null>(null)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)
  const [settingUp, setSettingUp] = useState(false)

  const [search, setSearch] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const loadData = useCallback(async () => {
    setLoading(true)
    if (dbConnected) {
      try {
        const [u, r, p] = await Promise.all([usersApi.list(), rolesApi.list(), permissionsApi.list()])
        setUsersList(u)
        setRolesList(r)
        setAllPermissions(p)
      } catch {
        // Fallback to demo
        setUsersList(DEMO_USERS)
        setRolesList(DEMO_ROLES.map(r => ({ ...r, permissions: DEMO_PERMISSIONS.filter(p => DEMO_ROLE_PERMS[r.slug]?.includes(p.id)) })))
        setAllPermissions(DEMO_PERMISSIONS)
      }
    } else {
      setUsersList(DEMO_USERS)
      setRolesList(DEMO_ROLES.map(r => ({ ...r, permissions: DEMO_PERMISSIONS.filter(p => DEMO_ROLE_PERMS[r.slug]?.includes(p.id)) })))
      setAllPermissions(DEMO_PERMISSIONS)
    }
    setLoading(false)
  }, [dbConnected])

  useEffect(() => { loadData() }, [loadData])

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSetupDb() {
    setSettingUp(true)
    try {
      await setupApi.run()
      showToast('Database setup complete — tables created and seeded')
      setShowSetupPrompt(false)
      loadData()
    } catch (e) {
      showToast(`Setup failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSettingUp(false)
    }
  }

  async function handleCreateUser(form: NewUserForm) {
    if (dbConnected) {
      try {
        await usersApi.create({ email: form.email, name: form.name, password: form.password, roleId: form.roleId || undefined })
        showToast(`User ${form.name} created successfully`)
        loadData()
      } catch (e) {
        showToast(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    } else {
      // Demo mode — add to local state
      const role = rolesList.find(r => r.id === form.roleId)
      setUsersList(prev => [...prev, {
        id: crypto.randomUUID(),
        email: form.email,
        name: form.name,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null,
        roles: role ? [{ id: role.id, name: role.name, slug: role.slug }] : [],
      }])
      showToast(`User ${form.name} created (demo mode)`)
    }
    setShowAddUser(false)
  }

  async function handleUpdateUserRoles(userId: string, roleIds: string[]) {
    if (dbConnected) {
      try {
        await usersApi.update(userId, { roleIds })
        showToast('User roles updated')
        loadData()
      } catch (e) {
        showToast(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    } else {
      // Demo: update local
      setUsersList(prev => prev.map(u => {
        if (u.id !== userId) return u
        const newRoles = rolesList.filter(r => roleIds.includes(r.id)).map(r => ({ id: r.id, name: r.name, slug: r.slug }))
        return { ...u, roles: newRoles }
      }))
      showToast('User roles updated (demo mode)')
    }
    setShowEditUser(null)
  }

  async function handleToggleActive(userId: string, active: boolean) {
    if (dbConnected) {
      try {
        await usersApi.update(userId, { isActive: active })
        showToast(active ? 'User reactivated' : 'User deactivated')
        loadData()
      } catch (e) {
        showToast(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    } else {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_active: active } : u))
      showToast(active ? 'User reactivated (demo)' : 'User deactivated (demo)')
    }
  }

  const tabs = [
    { id: 'users', label: 'Users', count: usersList.length },
    { id: 'roles', label: 'Roles', count: rolesList.length },
    { id: 'matrix', label: 'Permission Matrix' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-teal-light)] text-[var(--accent-teal)] border border-teal-200 text-[var(--text-sm)] font-medium shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue-light)] border border-blue-200 flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--accent-blue)]" />
          </div>
          <div>
            <h1 className="font-display text-[var(--text-2xl)] font-bold text-[var(--text-primary)]">Users & Roles</h1>
            <p className="mt-0.5 text-[var(--text-sm)] text-[var(--text-tertiary)]">
              Manage team members, assign roles, and configure permissions.
              {!dbConnected && <span className="ml-2 text-[var(--accent-amber)]">(Demo mode — connect Neon DB for persistence)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!dbConnected && (
            <button
              onClick={() => setShowSetupPrompt(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Connect DB
            </button>
          )}
          <button
            onClick={() => setShowAddUser(true)}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-medium hover:opacity-90 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: usersList.length, icon: Users, accent: 'blue' },
          { label: 'Active Users', value: usersList.filter(u => u.is_active).length, icon: CheckCircle2, accent: 'teal' },
          { label: 'Roles Defined', value: rolesList.length, icon: Shield, accent: 'purple' },
          { label: 'Permissions', value: allPermissions.length, icon: Lock, accent: 'amber' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `var(--accent-${stat.accent}-light)`, border: `1px solid var(--accent-${stat.accent})30` }}>
                  <Icon className="w-4 h-4" style={{ color: `var(--accent-${stat.accent})` }} />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{stat.label}</span>
              </div>
              <span className="text-[var(--text-2xl)] font-display font-bold text-[var(--text-primary)]">{stat.value}</span>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--accent-teal)]/30 border-t-[var(--accent-teal)] rounded-full animate-spin" />
            <span className="ml-3 text-[var(--text-sm)] text-[var(--text-tertiary)]">Loading...</span>
          </div>
        </Card>
      ) : activeTab === 'users' ? (
        <UsersTab
          users={filteredUsers}
          roles={rolesList}
          search={search}
          onSearchChange={setSearch}
          onEdit={setShowEditUser}
          onToggleActive={handleToggleActive}
        />
      ) : activeTab === 'roles' ? (
        <RolesTab roles={rolesList} onViewRole={setShowRoleDetail} />
      ) : (
        <PermissionMatrix roles={rolesList} permissions={allPermissions} />
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          roles={rolesList}
          onClose={() => setShowAddUser(false)}
          onCreate={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <EditUserModal
          user={showEditUser}
          roles={rolesList}
          onClose={() => setShowEditUser(null)}
          onSave={handleUpdateUserRoles}
        />
      )}

      {/* Role Detail Modal */}
      {showRoleDetail && (
        <RoleDetailModal
          role={showRoleDetail}
          permissions={allPermissions}
          onClose={() => setShowRoleDetail(null)}
        />
      )}

      {/* DB Setup Prompt */}
      {showSetupPrompt && (
        <DbSetupModal
          onClose={() => setShowSetupPrompt(false)}
          onSetup={handleSetupDb}
          loading={settingUp}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Users Tab
   ═══════════════════════════════════════════ */
function UsersTab({ users, roles: _roles, search, onSearchChange, onEdit, onToggleActive }: {
  users: ApiUser[]
  roles: ApiRole[]
  search: string
  onSearchChange: (s: string) => void
  onEdit: (u: ApiUser) => void
  onToggleActive: (id: string, active: boolean) => void
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Team Members</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 h-9 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-[var(--text-sm)]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['User', 'Email', 'Role', 'Status', 'Last Login', ''].map((h, i) => (
                <th key={i} className="text-left font-semibold text-[var(--text-tertiary)] text-[var(--text-xs)] uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const roleSlug = u.roles[0]?.slug || 'viewer'
              const colors = ROLE_COLORS[roleSlug] || ROLE_COLORS['viewer']
              return (
                <tr key={u.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[var(--text-xs)] font-bold"
                        style={{ backgroundColor: colors.accent }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)] whitespace-nowrap">{u.email}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {u.roles.map(r => {
                        const c = ROLE_COLORS[r.slug] || ROLE_COLORS['viewer']
                        return <Badge key={r.id} variant={c.badge}>{r.name}</Badge>
                      })}
                      {u.roles.length === 0 && <Badge variant="gray">No role</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Badge variant={u.is_active ? 'green' : 'red'} dot>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-tertiary)] whitespace-nowrap">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-right relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === u.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-5 top-full mt-1 z-50 w-44 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] shadow-lg py-1">
                          <button onClick={() => { setMenuOpen(null); onEdit(u) }} className="w-full flex items-center gap-2 px-3 py-2 text-[var(--text-sm)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" /> Edit Roles
                          </button>
                          <button onClick={() => { setMenuOpen(null); onToggleActive(u.id, !u.is_active) }} className="w-full flex items-center gap-2 px-3 py-2 text-[var(--text-sm)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer">
                            <UserX className="w-3.5 h-3.5" /> {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[var(--text-tertiary)] text-[var(--text-sm)]">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ═══════════════════════════════════════════
   Roles Tab
   ═══════════════════════════════════════════ */
function RolesTab({ roles, onViewRole }: { roles: ApiRole[]; onViewRole: (r: ApiRole) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roles.map(role => {
        const colors = ROLE_COLORS[role.slug] || ROLE_COLORS['viewer']
        return (
          <button key={role.id} onClick={() => onViewRole(role)} className="text-left cursor-pointer group">
            <Card hover className="h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, ${colors.accent}, transparent)` }} />

              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${colors.accent}10`, border: `1.5px solid ${colors.accent}30` }}>
                  <Shield className="w-5 h-5" style={{ color: colors.accent }} />
                </div>
                <div className="flex items-center gap-2">
                  {role.is_system && <Badge variant="gray">System</Badge>}
                  <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-teal)] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              <h3 className="font-display text-[var(--text-base)] font-bold text-[var(--text-primary)]">{role.name}</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1 leading-relaxed line-clamp-2">{role.description}</p>

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Users</p>
                  <p className="text-[var(--text-base)] font-bold tabular-nums" style={{ color: colors.accent }}>{role.userCount}</p>
                </div>
                <div className="w-px h-8 bg-[var(--border-subtle)]" />
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Permissions</p>
                  <p className="text-[var(--text-base)] font-bold tabular-nums" style={{ color: colors.accent }}>{role.permissions.length}</p>
                </div>
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Permission Matrix Tab
   ═══════════════════════════════════════════ */
function PermissionMatrix({ roles, permissions }: { roles: ApiRole[]; permissions: ApiPermission[] }) {
  const resources = [...new Set(permissions.map(p => p.resource))]

  return (
    <Card>
      <h2 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-4">Permission Matrix</h2>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-[var(--text-xs)]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="text-left font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-5 py-3 sticky left-0 bg-[var(--bg-primary)]">
                Permission
              </th>
              {roles.map(r => {
                const colors = ROLE_COLORS[r.slug] || ROLE_COLORS['viewer']
                return (
                  <th key={r.id} className="text-center font-semibold uppercase tracking-wider px-3 py-3 min-w-[90px]"
                    style={{ color: colors.accent }}>
                    {r.name}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {resources.map(resource => {
              const resourcePerms = permissions.filter(p => p.resource === resource)
              return resourcePerms.map((perm, idx) => (
                <tr key={perm.id} className={`border-b border-[var(--border-subtle)] ${idx === 0 ? '' : ''}`}>
                  <td className="px-5 py-2.5 whitespace-nowrap sticky left-0 bg-[var(--bg-primary)]">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase w-20">{resource}</span>}
                      {idx > 0 && <span className="w-20" />}
                      <span className="text-[var(--text-secondary)]">{perm.action}</span>
                    </div>
                  </td>
                  {roles.map(r => {
                    const has = r.permissions.some(rp => rp.resource === perm.resource && rp.action === perm.action)
                    return (
                      <td key={r.id} className="text-center px-3 py-2.5">
                        {has ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent-teal)] mx-auto" />
                        ) : (
                          <span className="block w-4 h-4 mx-auto rounded-full border border-[var(--border-subtle)]" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ═══════════════════════════════════════════
   Add User Modal
   ═══════════════════════════════════════════ */
function AddUserModal({ roles, onClose, onCreate }: {
  roles: ApiRole[]
  onClose: () => void
  onCreate: (form: NewUserForm) => void
}) {
  const [form, setForm] = useState<NewUserForm>({ email: '', name: '', password: '', roleId: '' })
  const [mode, setMode] = useState<'create' | 'invite'>('create')
  const valid = form.email && (mode === 'invite' || (form.name && form.password))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-md mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-teal-light)] border border-teal-200 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Add User</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Create account or send invitation</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['create', 'invite'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 h-9 rounded-xl text-[var(--text-sm)] font-medium transition-colors cursor-pointer ${
                  mode === m
                    ? 'bg-[var(--accent-teal)] text-white'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {m === 'create' ? 'Create Account' : 'Send Invite'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div>
            <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)]"
              placeholder="user@company.com" />
          </div>

          {mode === 'create' && (
            <>
              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)]"
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)]"
                  placeholder="Minimum 6 characters" />
              </div>
            </>
          )}

          <div>
            <label className="block text-[var(--text-xs)] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">Assign Role</label>
            <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-sm)] px-4 focus:outline-none focus:border-[var(--accent-teal)]">
              <option value="">Select role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-[var(--border-default)]">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => valid && onCreate(form)}
            disabled={!valid}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {mode === 'create' ? <><UserPlus className="w-4 h-4" /> Create User</> : <><Mail className="w-4 h-4" /> Send Invite</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Edit User Roles Modal
   ═══════════════════════════════════════════ */
function EditUserModal({ user, roles, onClose, onSave }: {
  user: ApiUser
  roles: ApiRole[]
  onClose: () => void
  onSave: (userId: string, roleIds: string[]) => void
}) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(user.roles.map(r => r.id)))

  function toggle(roleId: string) {
    setSelectedRoles(prev => {
      const next = new Set(prev)
      if (next.has(roleId)) next.delete(roleId)
      else next.add(roleId)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-md mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div>
            <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Edit Roles</h3>
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{user.name} ({user.email})</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-2">
          {roles.map(r => {
            const checked = selectedRoles.has(r.id)
            const colors = ROLE_COLORS[r.slug] || ROLE_COLORS['viewer']
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  checked
                    ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-light)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.accent}10`, border: `1px solid ${colors.accent}30` }}>
                  <Shield className="w-4 h-4" style={{ color: colors.accent }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">{r.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{r.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${
                  checked ? 'bg-[var(--accent-teal)] border-[var(--accent-teal)]' : 'border-[var(--border-default)]'
                }`}>
                  {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-[var(--border-default)]">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={() => onSave(user.id, Array.from(selectedRoles))}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-medium hover:opacity-90 transition-colors cursor-pointer"
          >
            Save Roles
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Role Detail Modal
   ═══════════════════════════════════════════ */
function RoleDetailModal({ role, permissions, onClose }: {
  role: ApiRole
  permissions: ApiPermission[]
  onClose: () => void
}) {
  const colors = ROLE_COLORS[role.slug] || ROLE_COLORS['viewer']
  const resources = [...new Set(permissions.map(p => p.resource))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${colors.accent}10`, border: `1.5px solid ${colors.accent}30` }}>
              <Shield className="w-5 h-5" style={{ color: colors.accent }} />
            </div>
            <div>
              <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">{role.name}</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">{role.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={colors.badge}>{role.userCount} user{role.userCount !== 1 ? 's' : ''}</Badge>
            <Badge variant="gray">{role.permissions.length} permissions</Badge>
            {role.is_system && <Badge variant="amber">System role</Badge>}
          </div>

          <h4 className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] mt-4">Permissions</h4>
          {resources.map(resource => {
            const resourcePerms = permissions.filter(p => p.resource === resource)
            return (
              <div key={resource} className="bg-[var(--bg-secondary)] rounded-xl p-3">
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{resource}</p>
                <div className="flex flex-wrap gap-1.5">
                  {resourcePerms.map(p => {
                    const has = role.permissions.some(rp => rp.resource === p.resource && rp.action === p.action)
                    return (
                      <span key={p.id} className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-2 py-0.5 ${
                        has ? 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-quaternary)]'
                      }`}>
                        {has && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {p.action}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-6 border-t border-[var(--border-default)]">
          <button onClick={onClose}
            className="w-full h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   DB Setup Modal
   ═══════════════════════════════════════════ */
function DbSetupModal({ onClose, onSetup, loading }: {
  onClose: () => void
  onSetup: () => void
  loading: boolean
}) {
  const [copied, setCopied] = useState(false)

  function copyEnv() {
    navigator.clipboard.writeText('DATABASE_URL=postgresql://...\nJWT_SECRET=your-secret-here')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-default)] shadow-xl w-full max-w-lg mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-purple-light)] border border-purple-200 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[var(--accent-purple)]" />
            </div>
            <div>
              <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">Connect Neon Database</h3>
              <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Set up PostgreSQL for persistent RBAC</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-teal-light)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[var(--accent-teal)]">1</span>
              </div>
              <div>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Create a Neon project</p>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Go to neon.tech, create a new project, and copy the connection string.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-teal-light)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[var(--accent-teal)]">2</span>
              </div>
              <div>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Set environment variables</p>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] mb-2">Add to your Vercel project environment variables:</p>
                <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-default)] p-3 font-mono text-[var(--text-xs)] text-[var(--text-secondary)] relative">
                  <p>DATABASE_URL=postgresql://...</p>
                  <p>JWT_SECRET=your-secret-here</p>
                  <button onClick={copyEnv} className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] cursor-pointer">
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-teal)]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-teal-light)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[var(--accent-teal)]">3</span>
              </div>
              <div>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)]">Run setup</p>
                <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">Click below to create tables and seed demo data.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-[var(--border-default)]">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[var(--text-sm)] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={onSetup} disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[var(--accent-teal)] text-white text-[var(--text-sm)] font-medium hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up...</>
            ) : (
              <><Plus className="w-4 h-4" /> Run Database Setup</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
