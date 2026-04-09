import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { auth as authApi, setToken, clearToken, type AuthUser } from '../lib/api'

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
  // RBAC fields (populated when using Neon DB)
  roles?: string[]
  roleNames?: string[]
  permissions?: string[]
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

// Demo users — fallback when no Neon DB connection
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@aeiforo.com': {
    password: 'demo2026',
    user: {
      email: 'admin@aeiforo.com', name: 'Jane Mitchell', role: 'PA', tenantId: 'demo-tenant',
      roles: ['admin'], roleNames: ['Platform Admin'],
      permissions: ['dashboard.view','calculators.view','calculators.edit','data.view','data.upload','data.approve','reports.view','reports.create','reports.publish','analytics.view','workflow.view','workflow.approve','audit.view','admin.users','admin.roles','admin.org','admin.settings'],
    },
  },
  'tl@aeiforo.com': {
    password: 'demo2026',
    user: {
      email: 'tl@aeiforo.com', name: 'Tom Harris', role: 'TL', tenantId: 'demo-tenant',
      groups: ['uk-region', 'eu-region'],
      roles: ['team-lead'], roleNames: ['Team Lead'],
      permissions: ['dashboard.view','calculators.view','calculators.edit','data.view','data.upload','data.approve','reports.view','reports.create','analytics.view','workflow.view','workflow.approve','audit.view','admin.users'],
    },
  },
  'fm@aeiforo.com': {
    password: 'demo2026',
    user: {
      email: 'fm@aeiforo.com', name: 'Sarah Chen', role: 'FM', tenantId: 'demo-tenant',
      subdivisions: ['uk-factory', 'de-office'],
      roles: ['analyst'], roleNames: ['Analyst'],
      permissions: ['dashboard.view','calculators.view','calculators.edit','data.view','data.upload','reports.view','reports.create','analytics.view','workflow.view'],
    },
  },
  'so@aeiforo.com': {
    password: 'demo2026',
    user: {
      email: 'so@aeiforo.com', name: 'Alex Rivera', role: 'SO', tenantId: 'demo-tenant',
      sources: ['boiler-1', 'boiler-2', 'grid-elec'],
      roles: ['viewer'], roleNames: ['Viewer'],
      permissions: ['dashboard.view','calculators.view','data.view','reports.view','analytics.view','workflow.view'],
    },
  },
}

const LEGACY_EMAILS: Record<string, string> = {
  'demo@gcgroup.com': 'admin@aeiforo.com',
  'user1@marklytics.co.uk': 'admin@aeiforo.com',
}

// Map DB role slugs to legacy Role codes
const SLUG_TO_ROLE: Record<string, Role> = {
  'admin': 'PA', 'team-lead': 'TL', 'analyst': 'FM', 'viewer': 'SO', 'auditor': 'AUD',
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
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('aeiforo_auth_user')
    if (stored) {
      try { return JSON.parse(stored) } catch { return null }
    }
    return null
  })
  const [dbConnected, setDbConnected] = useState(false)

  // Persist user changes
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
      // Token expired or API unavailable — keep current user
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase()
    const resolvedEmail = LEGACY_EMAILS[normalizedEmail] || normalizedEmail

    // Try real API first
    try {
      const res = await authApi.login(resolvedEmail, password)
      setToken(res.token)
      const u = dbUserToUser(res.user)
      setUser(u)
      setDbConnected(true)
      return true
    } catch {
      // API unavailable — fall through to demo mode
    }

    // Demo fallback
    const entry = DEMO_USERS[resolvedEmail]
    if (!entry || entry.password !== password) return false

    setUser(entry.user)
    localStorage.setItem('aeiforo_auth_user', JSON.stringify(entry.user))
    setDbConnected(false)
    return true
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

  const permissions = user?.permissions ?? []

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
