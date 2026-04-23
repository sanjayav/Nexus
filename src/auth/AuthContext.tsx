import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { auth as authApi, setToken, clearToken, type AuthUser } from '../lib/api'
import { resolvePermissions } from '../lib/rbac'

export type Role = 'PA' | 'TL' | 'FM' | 'SO' | 'AUD' | 'AUTO'

export interface User {
  id?: string
  email: string
  name: string
  role: Role
  tenantId: string
  groups?: string[]
  subdivisions?: string[]
  sources?: string[]
  roles?: string[]
  roleNames?: string[]
  permissions?: string[]
  preferredFrameworkId?: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  permissions: string[]
  login: (email: string, password: string) => Promise<boolean>
  register: (data: { email: string; name: string; password: string; inviteToken?: string }) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  dbConnected: boolean
}

const LEGACY_EMAILS: Record<string, string> = {
  'demo@gcgroup.com': 'admin@aeiforo.com',
  'user1@marklytics.co.uk': 'admin@aeiforo.com',
}

// Map DB role slugs to legacy short codes (for Role field backwards compat).
const SLUG_TO_ROLE: Record<string, Role> = {
  'admin': 'PA',
  'platform_admin': 'PA',
  'team-lead': 'TL',
  'subsidiary_lead': 'TL',
  'group_sustainability_officer': 'SO',
  'plant_manager': 'FM',
  'analyst': 'FM',
  'data_contributor': 'FM',
  'viewer': 'SO',
  'auditor': 'AUD',
}

function dbUserToUser(u: AuthUser): User {
  const primarySlug = u.roles?.[0] || 'viewer'
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: SLUG_TO_ROLE[primarySlug] || 'SO',
    tenantId: u.orgId,
    roles: u.roles,
    roleNames: u.roleNames,
    permissions: u.permissions,
    preferredFrameworkId: u.preferredFrameworkId,
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('aeiforo_auth_user')
    const token = localStorage.getItem('aeiforo_token')
    if (!stored) return null
    if (!token) {
      localStorage.removeItem('aeiforo_auth_user')
      return null
    }
    try { return JSON.parse(stored) } catch { return null }
  })
  const [dbConnected, setDbConnected] = useState(false)

  useEffect(() => {
    if (user) {
      localStorage.setItem('aeiforo_auth_user', JSON.stringify(user))
    }
  }, [user])

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('aeiforo_token')
    if (!token) return
    try {
      const me = await authApi.me()
      const u = dbUserToUser(me)
      setUser(u)
      setDbConnected(true)
    } catch {
      // Token expired — let the next API call trigger the global 401 → /login redirect
    }
  }, [])

  /**
   * Live auth only. Hits /api/auth/login against Neon. Any failure (including
   * network) returns false — we never fall back to demo credentials.
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase()
    const resolvedEmail = LEGACY_EMAILS[normalizedEmail] || normalizedEmail
    try {
      const res = await authApi.login(resolvedEmail, password)
      setToken(res.token)
      const u = dbUserToUser(res.user)
      setUser(u)
      setDbConnected(true)
      return true
    } catch {
      return false
    }
  }

  const register = async (data: { email: string; name: string; password: string; inviteToken?: string }): Promise<boolean> => {
    try {
      const res = await authApi.register(data)
      setToken(res.token)
      const u = dbUserToUser(res.user)
      setUser(u)
      setDbConnected(true)
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    setUser(null)
    clearToken()
    localStorage.removeItem('aeiforo_auth_user')
    setDbConnected(false)
  }

  const permissions = user
    ? ((user.permissions && user.permissions.length > 0) ? user.permissions : resolvePermissions(user))
    : []

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), permissions, login, register, logout, refreshUser, dbConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
