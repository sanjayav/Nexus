import { createContext, useContext, useState, ReactNode } from 'react'

const DEMO_EMAIL = 'admin@aeiforo.co.uk'
const DEMO_PASSWORD = 'admin'

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
    // Initialize from localStorage if available
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
      normalizedEmail === DEMO_EMAIL.toLowerCase() &&
      password === DEMO_PASSWORD

    if (!valid) {
      return false
    }

    const demoUser: DemoUser = {
      email: DEMO_EMAIL,
      name: 'Aeiforo Admin',
      role: 'Admin',
    }

    setUser(demoUser)
    // Persist to localStorage
    localStorage.setItem('aeiforo_auth_user', JSON.stringify(demoUser))

    return true
  }

  const logout = () => {
    setUser(null)
    // Clear from localStorage
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


