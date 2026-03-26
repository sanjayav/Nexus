import { createContext, useContext, useState, ReactNode } from 'react'

/** Demo sign-in shown on the login screen and validated by `login`. */
export const DEMO_EMAIL = 'user1@marklytics.co.uk'
export const DEMO_PASSWORD = 'marklytics'

type DemoUser = {
  email: string
  name: string
  role: 'Admin'
}

type AuthContextValue = {
  user: DemoUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => {
    const stored = localStorage.getItem('aeiforo_auth_user')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  })

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase()
    const valid =
      normalizedEmail === DEMO_EMAIL.toLowerCase() && password === DEMO_PASSWORD

    if (!valid) {
      return false
    }

    const demoUser: DemoUser = {
      email: DEMO_EMAIL,
      name: 'Marklytics User',
      role: 'Admin',
    }

    setUser(demoUser)
    localStorage.setItem('aeiforo_auth_user', JSON.stringify(demoUser))

    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('aeiforo_auth_user')
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
