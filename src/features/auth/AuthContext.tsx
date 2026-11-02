import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react'
import { DEMO_PASSWORD } from '@/data/people'
import { useWorkspace } from '@/features/workspace/WorkspaceContext'
import { hashPassword, membershipsOf, useAccessStore } from '@/features/access/store'
import { usePreferences } from '@/store/preferences'

export { DEMO_EMAIL, DEMO_PASSWORD } from '@/data/people'

const SESSION_KEY = 'aeiforo_auth_user'

/** The session only names who signed in; their name, role and status come from the workspace directory. */
type Session = { email: string }

export type SignInError = 'invalid' | 'suspended' | 'pending'

type AuthContextValue = {
  user: Session | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: SignInError }>
  /** Start a session for someone who has just accepted an invitation. */
  startSession: (ws: string, memberId: string, email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readSession(): Session | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
    return typeof stored?.email === 'string' ? { email: stored.email.toLowerCase() } : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { workspace, setWorkspace } = useWorkspace()
  const [user, setUser] = useState<Session | null>(() => {
    const session = readSession()
    if (session) usePreferences.getState().claim(session.email)
    return session
  })

  const begin = useCallback((email: string) => {
    const session = { email }
    setUser(session)
    usePreferences.getState().claim(email)
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      /* storage unavailable: the session lasts for this tab */
    }
  }, [])

  const login = useCallback<AuthContextValue['login']>(
    async (rawEmail, password) => {
      const email = rawEmail.trim().toLowerCase()
      const store = useAccessStore.getState()
      const memberships = membershipsOf(store, email)
      const active = memberships.filter(m => m.member.status === 'active')
      if (!active.length) {
        store.recordFailedSignIn(workspace.id, email)
        if (memberships.some(m => m.member.status === 'suspended')) return { ok: false, error: 'suspended' }
        if (memberships.some(m => m.member.status === 'invited')) return { ok: false, error: 'pending' }
        return { ok: false, error: 'invalid' }
      }
      // Prefer the workspace already open on this device.
      const target = active.find(m => m.ws === workspace.id) ?? active[0]
      const hash = target.member.passwordHash
      const valid = hash ? (await hashPassword(password)) === hash : password === DEMO_PASSWORD
      if (!valid) {
        store.recordFailedSignIn(target.ws, email)
        return { ok: false, error: 'invalid' }
      }
      if (target.ws !== workspace.id) setWorkspace(target.ws)
      store.recordSignIn(target.ws, target.member.id)
      begin(email)
      return { ok: true }
    },
    [workspace.id, setWorkspace, begin],
  )

  const startSession = useCallback<AuthContextValue['startSession']>(
    (ws, memberId, email) => {
      if (ws !== workspace.id) setWorkspace(ws)
      useAccessStore.getState().recordSignIn(ws, memberId)
      begin(email.toLowerCase())
    },
    [workspace.id, setWorkspace, begin],
  )

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* nothing to clear */
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, startSession, logout }),
    [user, login, startSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
