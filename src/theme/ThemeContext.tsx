import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'demo-flat' | 'glass'

const STORAGE_KEY = 'nexus-theme'
const DEFAULT_THEME: Theme = 'demo-flat'

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const current = document.documentElement.getAttribute('data-theme')
  if (current === 'glass' || current === 'demo-flat') return current
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'glass' || stored === 'demo-flat') return stored
  return DEFAULT_THEME
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage unavailable (private mode, etc.) — in-memory only
    }
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)
  const toggleTheme = () => setThemeState(t => (t === 'demo-flat' ? 'glass' : 'demo-flat'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
